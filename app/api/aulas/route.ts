import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es profesor
    if (!session.user.roles.includes("PROFESOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const gestionId = searchParams.get("gestion")
    const includeDeleted = searchParams.get("includeDeleted") === "true"

    // Obtener el ID del profesor
    const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesorQuery || profesorQuery.length === 0) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesorQuery[0].id_profesor

    // Primero verificar si existen gestiones
    const gestionesExist = await executeQuery<any[]>("SHOW TABLES LIKE 'gestiones_academicas'")

    let aulas: any[] = []

    if (gestionesExist.length > 0) {
      // Si existen gestiones, usar la lógica con gestiones
      let gestionFilter = ""
      let gestionParam: any[] = []

      if (gestionId) {
        gestionFilter = "AND ap.id_gestion = ?"
        gestionParam = [gestionId]
      } else {
        gestionFilter = "AND ga.activa = TRUE"
      }

      // Filtro para aulas activas/eliminadas
      const activaFilter = includeDeleted ? "" : "AND COALESCE(ap.activa, TRUE) = TRUE"

      aulas = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor as id,
          ap.nombre_aula,
          COALESCE(ap.activa, TRUE) as activa,
          ap.fecha_eliminacion,
          COALESCE(ap.id_gestion, 1) as id_gestion,
          COALESCE(ga.nombre, 'Sin gestión') as gestion_nombre,
          COALESCE(ga.activa, true) as gestion_activa,
          c.nombre as colegio,
          n.nombre as nivel,
          cu.nombre as curso,
          p.letra as paralelo,
          m.nombre_completo as materia,
          (SELECT COUNT(*) FROM inscripciones_aula ia WHERE ia.id_aula_profesor = ap.id_aula_profesor) as estudiantes,
          ROUND(
            (SELECT COUNT(*) FROM inscripciones_aula ia 
             JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion 
             WHERE ia.id_aula_profesor = ap.id_aula_profesor) * 100.0 / 
            NULLIF((SELECT COUNT(*) FROM inscripciones_aula ia WHERE ia.id_aula_profesor = ap.id_aula_profesor), 0) / 3, 0) as progreso,
          (SELECT COUNT(*) 
           FROM inscripciones_aula ia 
           LEFT JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion AND nap.trimestre = 1
           WHERE ia.id_aula_profesor = ap.id_aula_profesor AND nap.id_nota_aula_profesor IS NULL) as pendientes
        FROM 
          aulas_profesor ap
          LEFT JOIN gestiones_academicas ga ON ap.id_gestion = ga.id_gestion
          JOIN colegios c ON ap.id_colegio = c.id_colegio
          JOIN niveles n ON ap.id_nivel = n.id_nivel
          JOIN cursos cu ON ap.id_curso = cu.id_curso
          JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
          JOIN materias m ON ap.id_materia = m.id_materia
        WHERE 
          ap.id_profesor = ? ${gestionFilter} ${activaFilter}
        ORDER BY 
          COALESCE(ap.activa, TRUE) DESC, COALESCE(ga.activa, true) DESC, COALESCE(ga.anio, 2024) DESC, ap.nombre_aula`,
        [profesorId, ...gestionParam],
      )
    } else {
      // Si no existen gestiones, usar la lógica original sin gestiones
      const activaFilter = includeDeleted ? "" : "AND COALESCE(ap.activa, TRUE) = TRUE"
      
      aulas = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor as id,
          ap.nombre_aula,
          COALESCE(ap.activa, TRUE) as activa,
          ap.fecha_eliminacion,
          c.nombre as colegio,
          n.nombre as nivel,
          cu.nombre as curso,
          p.letra as paralelo,
          m.nombre_completo as materia,
          (SELECT COUNT(*) FROM inscripciones_aula ia WHERE ia.id_aula_profesor = ap.id_aula_profesor) as estudiantes,
          ROUND(
            (SELECT COUNT(*) FROM inscripciones_aula ia 
             JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion 
             WHERE ia.id_aula_profesor = ap.id_aula_profesor) * 100.0 / 
            NULLIF((SELECT COUNT(*) FROM inscripciones_aula ia WHERE ia.id_aula_profesor = ap.id_aula_profesor), 0) / 3, 0) as progreso,
          (SELECT COUNT(*) 
           FROM inscripciones_aula ia 
           LEFT JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion AND nap.trimestre = 1
           WHERE ia.id_aula_profesor = ap.id_aula_profesor AND nap.id_nota_aula_profesor IS NULL) as pendientes
        FROM 
          aulas_profesor ap
          JOIN colegios c ON ap.id_colegio = c.id_colegio
          JOIN niveles n ON ap.id_nivel = n.id_nivel
          JOIN cursos cu ON ap.id_curso = cu.id_curso
          JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
          JOIN materias m ON ap.id_materia = m.id_materia
        WHERE 
          ap.id_profesor = ? ${activaFilter}
        ORDER BY 
          COALESCE(ap.activa, TRUE) DESC, ap.nombre_aula`,
        [profesorId],
      )
    }

    return NextResponse.json(aulas)
  } catch (error) {
    console.error("Error fetching aulas:", error)
    return NextResponse.json({ error: "Error al obtener aulas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const body = await request.json()
    console.log("Datos recibidos:", body) // Debug log
    
    const { id_colegio, id_nivel, id_curso, id_paralelo, id_materia, nombre_aula, max_estudiantes, id_gestion, id_profesor } = body

    let profesorId: number

    // Si viene id_profesor en el body, es una asignación de administrador
    if (id_profesor && session.user.roles.includes("ADMIN")) {
      profesorId = id_profesor
    } else {
      // Lógica original para profesores
      if (!session.user.roles.includes("PROFESOR")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }

      const profesorQuery = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
        session.user.id,
      ])

      if (!profesorQuery || profesorQuery.length === 0) {
        return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
      }

      profesorId = profesorQuery[0].id_profesor
    }

    // Validar datos
    if (!id_colegio || !id_nivel || !id_curso || !id_paralelo || !id_materia || !nombre_aula) {
      console.log("Campos faltantes:", { id_colegio, id_nivel, id_curso, id_paralelo, id_materia, nombre_aula }) // Debug log
      return NextResponse.json({ 
        error: "Faltan campos requeridos",
        campos_recibidos: { id_colegio, id_nivel, id_curso, id_paralelo, id_materia, nombre_aula },
        body_completo: body
      }, { status: 400 })
    }

    console.log("Validación inicial pasada, continuando...") // Debug log

    // Verificar si existen gestiones
    const gestionesExist = await executeQuery<any[]>("SHOW TABLES LIKE 'gestiones_academicas'")
    console.log("Gestiones existen:", gestionesExist.length > 0) // Debug log

    let gestionActiva = 1 // Valor por defecto
    let useGestion = false

    if (gestionesExist.length > 0) {
      // Usar la gestión enviada desde el wizard si está presente, sino usar la activa
      if (id_gestion) {
        gestionActiva = parseInt(id_gestion)
        useGestion = true
        console.log("Usando gestión del wizard:", gestionActiva) // Debug log
      } else {
        // Obtener la gestión activa como fallback
        const gestionActivaQuery = await executeQuery<any[]>(
          "SELECT id_gestion FROM gestiones_academicas WHERE activa = TRUE LIMIT 1"
        )

        if (gestionActivaQuery.length > 0) {
          gestionActiva = gestionActivaQuery[0].id_gestion
          useGestion = true
          console.log("Usando gestión activa:", gestionActiva) // Debug log
        }
      }
    }

    // Verificar si ya existe un aula con los mismos datos (por cualquier profesor)
    console.log("Verificando conflictos con parámetros:", { id_colegio, id_nivel, id_curso, id_paralelo, id_materia, gestionActiva, useGestion }) // Debug log
    let existingAula: any[] = []

    if (useGestion) {
      existingAula = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor,
          ap.nombre_aula,
          u.nombre_completo as profesor_nombre,
          u.email as profesor_email
         FROM aulas_profesor ap
         JOIN profesores p ON ap.id_profesor = p.id_profesor
         JOIN usuarios u ON p.id_usuario = u.id_usuario
         WHERE ap.id_colegio = ? AND ap.id_nivel = ? AND ap.id_curso = ? AND ap.id_paralelo = ? AND ap.id_materia = ? AND ap.id_gestion = ? AND COALESCE(ap.activa, TRUE) = TRUE`,
        [id_colegio, id_nivel, id_curso, id_paralelo, id_materia, gestionActiva],
      )
    } else {
      existingAula = await executeQuery<any[]>(
        `SELECT 
          ap.id_aula_profesor,
          ap.nombre_aula,
          u.nombre_completo as profesor_nombre,
          u.email as profesor_email
         FROM aulas_profesor ap
         JOIN profesores p ON ap.id_profesor = p.id_profesor
         JOIN usuarios u ON p.id_usuario = u.id_usuario
         WHERE ap.id_colegio = ? AND ap.id_nivel = ? AND ap.id_curso = ? AND ap.id_paralelo = ? AND ap.id_materia = ? AND COALESCE(ap.activa, TRUE) = TRUE`,
        [id_colegio, id_nivel, id_curso, id_paralelo, id_materia],
      )
    }

    console.log("Aulas existentes encontradas:", existingAula.length) // Debug log

    if (existingAula && existingAula.length > 0) {
      const conflicto = existingAula[0]
      console.log("Conflicto encontrado:", conflicto) // Debug log
      return NextResponse.json({ 
        error: `Esta combinación ya está asignada al profesor ${conflicto.profesor_nombre} (${conflicto.profesor_email}) en el aula "${conflicto.nombre_aula}". No se pueden tener dos profesores enseñando la misma materia en el mismo curso y paralelo.`
      }, { status: 400 })
    }

    console.log("No hay conflictos, procediendo a crear aula...") // Debug log

    // Crear nueva aula
    let result: any

    try {
      if (useGestion) {
        result = await executeQuery<any>(
          `INSERT INTO aulas_profesor 
           (id_profesor, id_colegio, id_nivel, id_curso, id_paralelo, id_materia, nombre_aula, max_estudiantes, id_gestion) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [profesorId, id_colegio, id_nivel, id_curso, id_paralelo, id_materia, nombre_aula, max_estudiantes || 50, gestionActiva],
        )
      } else {
        result = await executeQuery<any>(
          `INSERT INTO aulas_profesor 
           (id_profesor, id_colegio, id_nivel, id_curso, id_paralelo, id_materia, nombre_aula, max_estudiantes) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [profesorId, id_colegio, id_nivel, id_curso, id_paralelo, id_materia, nombre_aula, max_estudiantes || 50],
        )
      }
    } catch (insertError: any) {
      // Manejar error de clave duplicada específicamente
      if (insertError.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ 
          error: "Ya existe un aula con la misma combinación de colegio, nivel, curso, paralelo y materia para este profesor en la gestión actual" 
        }, { status: 400 })
      }
      throw insertError
    }

    if (!result || !result.insertId) {
      return NextResponse.json({ error: "Error al crear el aula" }, { status: 500 })
    }

    // Obtener el aula recién creada
    const newAula = await executeQuery<any[]>(
      `SELECT 
        ap.id_aula_profesor as id,
        ap.nombre_aula,
        c.nombre as colegio,
        n.nombre as nivel,
        cu.nombre as curso,
        p.letra as paralelo,
        m.nombre_completo as materia,
        ap.max_estudiantes
      FROM 
        aulas_profesor ap
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        JOIN niveles n ON ap.id_nivel = n.id_nivel
        JOIN cursos cu ON ap.id_curso = cu.id_curso
        JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
        JOIN materias m ON ap.id_materia = m.id_materia
      WHERE 
        ap.id_aula_profesor = ?`,
      [result.insertId],
    )

    return NextResponse.json(newAula[0])
  } catch (error) {
    console.error("Error creating aula:", error)
    return NextResponse.json({ error: "Error al crear el aula" }, { status: 500 })
  }
}
