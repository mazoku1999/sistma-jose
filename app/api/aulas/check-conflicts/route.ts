import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id_colegio, id_nivel, id_curso, id_paralelo, id_materia, id_gestion } = await request.json()

    if (!id_colegio || !id_nivel || !id_curso || !id_paralelo || !id_materia) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 })
    }

    // Verificar si existen gestiones
    const gestionesExist = await executeQuery<any[]>("SHOW TABLES LIKE 'gestiones_academicas'")
    
    let conflictQuery: any[] = []
    
    if (gestionesExist.length > 0 && id_gestion) {
      // Buscar conflictos con gestión
      conflictQuery = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor,
          ap.nombre_aula,
          u.nombre_completo as profesor_nombre,
          u.email as profesor_email,
          c.nombre as colegio,
          n.nombre as nivel,
          cur.nombre as curso,
          p.letra as paralelo,
          m.nombre_completo as materia,
          COALESCE(ga.nombre, 'Sin gestión') as gestion_nombre
        FROM aulas_profesor ap
        LEFT JOIN gestiones_academicas ga ON ap.id_gestion = ga.id_gestion
        JOIN profesores prof ON ap.id_profesor = prof.id_profesor
        JOIN usuarios u ON prof.id_usuario = u.id_usuario
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
        WHERE ap.id_colegio = ? 
          AND ap.id_nivel = ? 
          AND ap.id_curso = ? 
          AND ap.id_paralelo = ? 
          AND ap.id_materia = ?
          AND ap.id_gestion = ?`,
        [id_colegio, id_nivel, id_curso, id_paralelo, id_materia, id_gestion]
      )
    } else {
      // Buscar conflictos sin gestión
      conflictQuery = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor,
          ap.nombre_aula,
          u.nombre_completo as profesor_nombre,
          u.email as profesor_email,
          c.nombre as colegio,
          n.nombre as nivel,
          cur.nombre as curso,
          p.letra as paralelo,
          m.nombre_completo as materia
        FROM aulas_profesor ap
        JOIN profesores prof ON ap.id_profesor = prof.id_profesor
        JOIN usuarios u ON prof.id_usuario = u.id_usuario
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cur ON ap.id_curso = cur.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
        WHERE ap.id_colegio = ? 
          AND ap.id_nivel = ? 
          AND ap.id_curso = ? 
          AND ap.id_paralelo = ? 
          AND ap.id_materia = ?`,
        [id_colegio, id_nivel, id_curso, id_paralelo, id_materia]
      )
    }

    // También buscar aulas similares (mismo colegio, nivel, curso, paralelo pero diferentes materias)
    let similarAulasQuery: any[] = []
    
    if (gestionesExist.length > 0 && id_gestion) {
      similarAulasQuery = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor,
          ap.nombre_aula,
          u.nombre_completo as profesor_nombre,
          m.nombre_completo as materia,
          COUNT(ia.id_estudiante) as estudiantes
        FROM aulas_profesor ap
        LEFT JOIN gestiones_academicas ga ON ap.id_gestion = ga.id_gestion
        JOIN profesores prof ON ap.id_profesor = prof.id_profesor
        JOIN usuarios u ON prof.id_usuario = u.id_usuario
        JOIN materias m ON ap.id_materia = m.id_materia
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        WHERE ap.id_colegio = ? 
          AND ap.id_nivel = ? 
          AND ap.id_curso = ? 
          AND ap.id_paralelo = ?
          AND ap.id_gestion = ?
        GROUP BY ap.id_aula_profesor
        ORDER BY m.nombre_completo`,
        [id_colegio, id_nivel, id_curso, id_paralelo, id_gestion]
      )
    } else {
      similarAulasQuery = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor,
          ap.nombre_aula,
          u.nombre_completo as profesor_nombre,
          m.nombre_completo as materia,
          COUNT(ia.id_estudiante) as estudiantes
        FROM aulas_profesor ap
        JOIN profesores prof ON ap.id_profesor = prof.id_profesor
        JOIN usuarios u ON prof.id_usuario = u.id_usuario
        JOIN materias m ON ap.id_materia = m.id_materia
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        WHERE ap.id_colegio = ? 
          AND ap.id_nivel = ? 
          AND ap.id_curso = ? 
          AND ap.id_paralelo = ?
        GROUP BY ap.id_aula_profesor
        ORDER BY m.nombre_completo`,
        [id_colegio, id_nivel, id_curso, id_paralelo]
      )
    }

    return NextResponse.json({
      hasConflict: conflictQuery.length > 0,
      conflictDetails: conflictQuery[0] || null,
      similarAulas: similarAulasQuery,
      canCreate: conflictQuery.length === 0
    })
  } catch (error) {
    console.error("Error checking conflicts:", error)
    return NextResponse.json({ error: "Error al verificar conflictos" }, { status: 500 })
  }
}