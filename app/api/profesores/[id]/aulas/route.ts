import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession()

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Solo los administradores pueden ver las asignaciones de otros profesores
        if (!session.user.roles.includes("ADMIN")) {
            return NextResponse.json({
                error: "Solo los administradores pueden ver asignaciones de profesores"
            }, { status: 403 })
        }

        const { id } = await params
        const profesorId = parseInt(id)

        if (isNaN(profesorId)) {
            return NextResponse.json({ error: "ID de profesor inválido" }, { status: 400 })
        }

        // Verificar que el profesor existe
        const profesorExists = await executeQuery<any[]>(
            `SELECT p.id_profesor, u.nombre_completo 
       FROM profesores p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE p.id_profesor = ?`,
            [profesorId]
        )

        if (!profesorExists.length) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const gestionId = searchParams.get("gestion")
        const includeInactive = searchParams.get("includeInactive") === "true"

        // Construir query dinámicamente
        let query = `
      SELECT 
        ap.id_aula_profesor as id,
        ap.nombre_aula,
        ap.max_estudiantes,
        ap.activa,
        ap.fecha_creacion,
        ap.fecha_eliminacion,
        ap.id_profesor,
        ap.id_materia,
        ap.id_colegio,
        ap.id_nivel,
        ap.id_curso,
        ap.id_paralelo,
        ap.id_gestion,
        c.nombre as colegio,
        n.nombre as nivel,
        cur.nombre as curso,
        p.letra as paralelo,
        m.nombre_corto as materia_corta,
        m.nombre_completo as materia,
        ga.nombre as gestion_nombre,
        ga.activa as gestion_activa,
        COUNT(DISTINCT ia.id_estudiante) as estudiantes_inscritos
      FROM aulas_profesor ap
      JOIN colegios c ON ap.id_colegio = c.id_colegio
      JOIN niveles n ON ap.id_nivel = n.id_nivel
      JOIN cursos cur ON ap.id_curso = cur.id_curso
      JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
      JOIN materias m ON ap.id_materia = m.id_materia
      LEFT JOIN gestiones_academicas ga ON ap.id_gestion = ga.id_gestion
      LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
      WHERE ap.id_profesor = ?
    `

        const queryParams: any[] = [profesorId]

        // Filtrar por gestión si se proporciona
        if (gestionId) {
            query += " AND ap.id_gestion = ?"
            queryParams.push(parseInt(gestionId))
        }

        // Filtrar solo activas si no se solicita incluir inactivas
        if (!includeInactive) {
            query += " AND ap.activa = TRUE"
        }

        query += " GROUP BY ap.id_aula_profesor ORDER BY ap.fecha_creacion DESC"

        const asignaciones = await executeQuery<any[]>(query, queryParams)

        return NextResponse.json({
            profesor: profesorExists[0].nombre_completo,
            total: asignaciones.length,
            asignaciones
        })

    } catch (error) {
        console.error("Error al obtener asignaciones del profesor:", error)
        return NextResponse.json({
            error: "Error al obtener asignaciones"
        }, { status: 500 })
    }
}
