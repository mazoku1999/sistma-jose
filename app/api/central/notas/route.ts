import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const colegio = searchParams.get("colegio")
    const nivel = searchParams.get("nivel")
    const curso = searchParams.get("curso")
    const paralelo = searchParams.get("paralelo")
    const trimestre = searchParams.get("trimestre") || "1"

    if (!colegio || !nivel || !curso || !paralelo) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 })
    }

    // Solo los administradores pueden centralizar notas
    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Sin permisos de centralización" }, { status: 403 })
    }

    // Obtener estudiantes del curso/paralelo específico
    const estudiantesQuery = await executeQuery<any[]>(
      `
      SELECT DISTINCT 
        e.id_estudiante,
        e.nombres,
        e.apellido_paterno,
        e.apellido_materno,
        CONCAT(e.nombres, ' ', e.apellido_paterno, ' ', e.apellido_materno) as nombre_completo
      FROM estudiantes e
      JOIN inscripciones_aula ia ON e.id_estudiante = ia.id_estudiante
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_colegio = ? 
        AND ap.id_nivel = ? 
        AND ap.id_curso = ? 
        AND ap.id_paralelo = ?
      ORDER BY 
        CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN 0 ELSE 1 END,
        CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.apellido_materno) ELSE TRIM(e.apellido_paterno) END,
        CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.nombres) ELSE TRIM(e.apellido_materno) END,
        TRIM(e.nombres)
      `,
      [colegio, nivel, curso, paralelo]
    )

    // Determinar materias por curso (1-3: 11 materias; 4+: 13 materias)
    const cursoInfo = await executeQuery<any[]>(
      `SELECT nombre FROM cursos WHERE id_curso = ?`,
      [curso]
    )
    const cursoNombre: string = (cursoInfo[0]?.nombre || "").toString()
    // parseInt("1ro") -> 1, parseInt fallback NaN -> 0
    const cursoNumero = Number.parseInt(cursoNombre)

    const baseMaterias = [
      "COM-LEN", // Comunicación y lenguajes
      "LEN-EXT", // Lengua extranjera
      "CSOC",    // Ciencias sociales
      "EFYD",    // Educación física y deportes
      "MUS",     // Educación musical
      "ART-PV",  // Artes plásticas y visuales
      "MAT",     // Matemática
      "TEC",     // Técnica tecnológica (nombre se ajusta abajo para 1-3)
      "CN-BIOGEO", // CN: Biología - Geografía
      "COS-FIL", // Cosmovisiones, Filosofía y Sicología
      "VAL-REL", // Valores, Espiritualidad y Religiones
    ] as const

    const extraMaterias = [
      "CN-FIS", // CN: Física
      "CN-QUI", // CN: Química
    ] as const

    const materiasPermitidas = cursoNumero >= 4 ? [...baseMaterias, ...extraMaterias] : [...baseMaterias]

    // Obtener SOLO las materias correspondientes
    const placeholders = materiasPermitidas.map(() => "?").join(",")
    const materiasRaw = await executeQuery<any[]>(
      `
      SELECT 
        m.id_materia,
        m.nombre_corto,
        m.nombre_completo
      FROM materias m
      WHERE m.nombre_corto IN (${placeholders})
      ORDER BY m.nombre_completo
      `,
      [...materiasPermitidas]
    )

    // Ajustar nombre de Técnica para cursos 1-3
    const materiasQuery = (materiasRaw || []).map((m) => {
      if (cursoNumero > 0 && cursoNumero <= 3 && m.nombre_corto === "TEC") {
        return {
          ...m,
          nombre_completo: "TÉCNICA TECNOLÓGICA GENERAL",
        }
      }
      return m
    })

    // Obtener notas centralizadas existentes
    const notasQuery = await executeQuery<any[]>(
      `
      SELECT 
        cn.id_estudiante,
        cn.id_materia,
        cn.nota_final_materia as nota_final,
        m.nombre_corto as materia_corto,
        m.nombre_completo as materia_nombre
      FROM centralizacion_notas cn
      JOIN materias m ON cn.id_materia = m.id_materia
      WHERE cn.id_colegio = ? 
        AND cn.id_nivel = ? 
        AND cn.id_curso = ? 
        AND cn.id_paralelo = ? 
        AND cn.trimestre = ?
      `,
      [colegio, nivel, curso, paralelo, trimestre]
    )

    return NextResponse.json({
      estudiantes: estudiantesQuery,
      materias: materiasQuery,
      notas: notasQuery
    })
  } catch (error) {
    console.error("Error al obtener datos de centralización:", error)
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { colegio, nivel, curso, paralelo, trimestre, notas } = await request.json()

    if (!colegio || !nivel || !curso || !paralelo || !trimestre || !Array.isArray(notas)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Solo los administradores pueden centralizar notas
    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Sin permisos de centralización" }, { status: 403 })
    }

    // Para administradores, usar el primer profesor disponible o crear uno temporal
    const profesorQuery = await executeQuery<any[]>(
      "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
      [session.user.id]
    )

    let profesorId: number
    if (profesorQuery.length > 0) {
      profesorId = profesorQuery[0].id_profesor
    } else {
      // Si el admin no tiene registro de profesor, usar el primer profesor disponible
      const primerProfesorQuery = await executeQuery<any[]>(
        "SELECT id_profesor FROM profesores LIMIT 1"
      )
      if (primerProfesorQuery.length > 0) {
        profesorId = primerProfesorQuery[0].id_profesor
      } else {
        return NextResponse.json({ error: "No hay profesores registrados en el sistema" }, { status: 400 })
      }
    }

    // NUEVA VERIFICACIÓN: Solo permitir centralización en gestión activa
    const gestionActivaQuery = await executeQuery<any[]>(
      "SELECT id_gestion FROM gestiones_academicas WHERE activa = TRUE LIMIT 1"
    )

    if (!gestionActivaQuery.length) {
      return NextResponse.json({
        error: "No hay una gestión académica activa. Solo se pueden centralizar notas del año académico actual."
      }, { status: 400 })
    }

    const gestionActiva = gestionActivaQuery[0].id_gestion

    // Verificar que las notas pertenecen a la gestión activa
    const aulaGestionQuery = await executeQuery<any[]>(
      `SELECT ap.id_gestion, ga.activa 
       FROM aulas_profesor ap 
       JOIN gestiones_academicas ga ON ap.id_gestion = ga.id_gestion
       WHERE ap.id_colegio = ? AND ap.id_nivel = ? AND ap.id_curso = ? AND ap.id_paralelo = ? 
       AND ap.id_profesor = ? LIMIT 1`,
      [colegio, nivel, curso, paralelo, profesorId]
    )

    if (aulaGestionQuery.length > 0 && !aulaGestionQuery[0].activa) {
      return NextResponse.json({
        error: "🔒 Solo se pueden centralizar notas de la gestión académica activa (año actual)"
      }, { status: 403 })
    }

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Eliminar solo las notas de las materias que se están actualizando
      const materiasEnviadas = [...new Set(notas.map((nota: any) => nota.id_materia))]

      if (materiasEnviadas.length > 0) {
        const placeholders = materiasEnviadas.map(() => '?').join(',')
        await executeQuery(
          `
          DELETE FROM centralizacion_notas 
          WHERE id_colegio = ? 
            AND id_nivel = ? 
            AND id_curso = ? 
            AND id_paralelo = ? 
            AND trimestre = ?
            AND id_materia IN (${placeholders})
          `,
          [colegio, nivel, curso, paralelo, trimestre, ...materiasEnviadas]
        )
      }

      // Insertar nuevas notas centralizadas
      for (const nota of notas) {
        if (nota.nota_final >= 0 && nota.nota_final <= 100) {
          await executeQuery(
            `
            INSERT INTO centralizacion_notas (
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
              profesorId,
              colegio,
              nivel,
              curso,
              paralelo,
              nota.id_estudiante,
              trimestre,
              nota.id_materia,
              nota.nota_final
            ]
          )
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Notas centralizadas correctamente",
        count: notas.length
      })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error al centralizar notas:", error)
    return NextResponse.json({ error: "Error al centralizar notas" }, { status: 500 })
  }
}