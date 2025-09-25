import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = (await params).id
    const { searchParams } = new URL(request.url)
    const trimestre = searchParams.get("trimestre") || "1"

    // Obtener el ID del profesor
    const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesorQuery.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesorQuery[0].id_profesor

    // Verificar que el aula pertenece al profesor
    const aulaQuery = await executeQuery<any[]>(
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [aulaId, profesorId]
    )

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    // Obtener notas para el trimestre específico
    const notasQuery = await executeQuery<any[]>(
      `
      SELECT 
        nap.id_inscripcion,
        nap.trimestre,
        nap.promedio_final_trimestre
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      WHERE ia.id_aula_profesor = ? AND nap.trimestre = ?
      `,
      [aulaId, trimestre]
    )

    return NextResponse.json(notasQuery)
  } catch (error) {
    console.error("Error al obtener notas:", error)
    return NextResponse.json({ error: "Error al obtener notas" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = (await params).id
    const { trimestre, notas } = await request.json()

    if (!trimestre || !notas || !Array.isArray(notas)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Validar que el trimestre esté entre 1 y 3
    if (trimestre < 1 || trimestre > 3) {
      return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 })
    }

    // Obtener el ID del profesor
    const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesorQuery.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesorQuery[0].id_profesor

    // Verificar que el aula pertenece al profesor
    const aulaQuery = await executeQuery<any[]>(
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [aulaId, profesorId]
    )

    if (!aulaQuery.length) {
      return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
    }

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Eliminar notas existentes para este trimestre
      await executeQuery(
        `
        DELETE nap FROM notas_aula_profesor nap
        JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
        WHERE ia.id_aula_profesor = ? AND nap.trimestre = ?
        `,
        [aulaId, trimestre]
      )

      // Insertar nuevas notas
      for (const nota of notas) {
        // Validar que la nota esté entre 0 y 100
        if (nota.promedio_final_trimestre >= 0 && nota.promedio_final_trimestre <= 100) {
          // Verificar que la inscripción existe y pertenece al aula
          const inscripcionQuery = await executeQuery<any[]>(
            "SELECT id_inscripcion FROM inscripciones_aula WHERE id_inscripcion = ? AND id_aula_profesor = ?",
            [nota.id_inscripcion, aulaId]
          )

          if (inscripcionQuery.length > 0) {
            await executeQuery(
              "INSERT INTO notas_aula_profesor (id_inscripcion, trimestre, promedio_final_trimestre) VALUES (?, ?, ?)",
              [nota.id_inscripcion, trimestre, nota.promedio_final_trimestre]
            )
          }
        }
      }

      await executeQuery("COMMIT")

      // Auto-centralización: solo si el profesor tiene permiso
      try {
        // Verificar permiso del profesor
        const permisoQuery = await executeQuery<any[]>(
          "SELECT puede_centralizar_notas FROM profesores WHERE id_profesor = ?",
          [profesorId]
        )
        const puedeCentralizar = permisoQuery.length > 0 && !!permisoQuery[0].puede_centralizar_notas

        if (puedeCentralizar) {
          // Obtener datos del aula (colegio/nivel/curso/paralelo/materia)
          const aulaInfoQuery = await executeQuery<any[]>(
            `SELECT id_colegio, id_nivel, id_curso, id_paralelo, id_materia FROM aulas_profesor WHERE id_aula_profesor = ?`,
            [aulaId]
          )

          if (aulaInfoQuery.length > 0) {
            const { id_colegio, id_nivel, id_curso, id_paralelo, id_materia } = aulaInfoQuery[0]

            // Mapear inscripciones -> estudiantes para las notas enviadas
            const inscripcionIds = notas
              .filter((n: any) => n && typeof n.id_inscripcion !== "undefined")
              .map((n: any) => n.id_inscripcion)

            if (inscripcionIds.length > 0) {
              const placeholders = inscripcionIds.map(() => '?').join(',')
              const inscToEst = await executeQuery<any[]>(
                `SELECT id_inscripcion, id_estudiante FROM inscripciones_aula WHERE id_aula_profesor = ? AND id_inscripcion IN (${placeholders})`,
                [aulaId, ...inscripcionIds]
              )

              // Crear mapa de nota por id_inscripcion
              const notaPorInscripcion: Record<number, number> = {}
              for (const n of notas) {
                notaPorInscripcion[n.id_inscripcion] = n.promedio_final_trimestre
              }

              // Solo considerar notas > 0 para centralizar
              const estudiantesANormalizar = inscToEst
                .map((r) => ({ id_estudiante: r.id_estudiante, nota_final: notaPorInscripcion[r.id_inscripcion] }))
                .filter((r) => typeof r.nota_final === 'number' && r.nota_final > 0 && r.nota_final <= 100)

              if (estudiantesANormalizar.length > 0) {
                const estudiantesIds = estudiantesANormalizar.map((r) => r.id_estudiante)
                const placeholdersEst = estudiantesIds.map(() => '?').join(',')

                // Borrar existentes para este conjunto (evita duplicados por UNIQUE)
                await executeQuery(
                  `DELETE FROM centralizacion_notas 
                   WHERE id_colegio = ? AND id_nivel = ? AND id_curso = ? AND id_paralelo = ? 
                     AND trimestre = ? AND id_materia = ? AND id_estudiante IN (${placeholdersEst})`,
                  [id_colegio, id_nivel, id_curso, id_paralelo, trimestre, id_materia, ...estudiantesIds]
                )

                // Insertar nuevas centralizaciones
                for (const item of estudiantesANormalizar) {
                  await executeQuery(
                    `INSERT INTO centralizacion_notas (
                      id_profesor_centralizador,
                      id_colegio,
                      id_nivel,
                      id_curso,
                      id_paralelo,
                      id_estudiante,
                      trimestre,
                      id_materia,
                      nota_final_materia,
                      fecha_centralizacion,
                      fecha_ultima_modificacion
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                      profesorId,
                      id_colegio,
                      id_nivel,
                      id_curso,
                      id_paralelo,
                      item.id_estudiante,
                      trimestre,
                      id_materia,
                      item.nota_final,
                    ]
                  )
                }
              }
            }
          }
        }
      } catch (autoCentralErr) {
        console.warn("Auto-centralización fallida (no bloqueante):", autoCentralErr)
      }

      return NextResponse.json({
        success: true,
        message: "Notas guardadas correctamente",
        count: notas.length
      })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error al guardar notas:", error)
    return NextResponse.json({ error: "Error al guardar notas" }, { status: 500 })
  }
}