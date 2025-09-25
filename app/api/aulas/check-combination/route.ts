import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    let { id_materia, id_colegio, id_nivel, id_curso, id_paralelo, id_gestion } = body

    if (!id_materia) {
      return NextResponse.json({ error: "Materia requerida" }, { status: 400 })
    }

    // Normalizar id_gestion si viene como string/no numérico
    const gestionParsed = Number.parseInt(String(id_gestion || ''))
    if (!Number.isFinite(gestionParsed) || gestionParsed <= 0) {
      // Usar la gestión activa por defecto
      const gestionActiva = await executeQuery<any[]>("SELECT id_gestion FROM gestiones_academicas WHERE activa = TRUE LIMIT 1")
      if (gestionActiva && gestionActiva.length > 0) {
        id_gestion = gestionActiva[0].id_gestion
      } else {
        id_gestion = undefined
      }
    } else {
      id_gestion = gestionParsed
    }

    // Construir la consulta dinámicamente según los campos proporcionados
    let whereConditions = ["ap.id_materia = ?"]
    let queryParams: any[] = [id_materia]

    if (id_colegio) {
      whereConditions.push("ap.id_colegio = ?")
      queryParams.push(id_colegio)
    }

    if (id_nivel) {
      whereConditions.push("ap.id_nivel = ?")
      queryParams.push(id_nivel)
    }

    if (id_curso) {
      whereConditions.push("ap.id_curso = ?")
      queryParams.push(id_curso)
    }

    if (id_paralelo) {
      whereConditions.push("ap.id_paralelo = ?")
      queryParams.push(id_paralelo)
    }

    if (id_gestion) {
      whereConditions.push("ap.id_gestion = ?")
      queryParams.push(id_gestion)
    }

    const query = `
      SELECT 
        ap.id_aula_profesor,
        ap.id_colegio,
        ap.id_nivel,
        ap.id_curso,
        ap.id_paralelo,
        ap.nombre_aula,
        u.nombre_completo as profesor_nombre,
        u.email as profesor_email,
        c.nombre as colegio_nombre,
        n.nombre as nivel_nombre,
        cu.nombre as curso_nombre,
        p.letra as paralelo_nombre
      FROM aulas_profesor ap
      JOIN profesores pr ON ap.id_profesor = pr.id_profesor
      JOIN usuarios u ON pr.id_usuario = u.id_usuario
      JOIN colegios c ON ap.id_colegio = c.id_colegio
      JOIN niveles n ON ap.id_nivel = n.id_nivel
      JOIN cursos cu ON ap.id_curso = cu.id_curso
      JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
      WHERE ${whereConditions.join(' AND ')} AND COALESCE(ap.activa, TRUE) = TRUE
    `

    const ocupadas = await executeQuery<any[]>(query, queryParams)

    // Si hay una combinación exacta ocupada
    if (id_colegio && id_nivel && id_curso && id_paralelo && ocupadas.length > 0) {
      const conflicto = ocupadas[0]
      return NextResponse.json({
        hasConflict: true,
        conflictDetails: {
          profesor_nombre: conflicto.profesor_nombre,
          profesor_email: conflicto.profesor_email,
          nombre_aula: conflicto.nombre_aula,
          colegio: conflicto.colegio_nombre,
          nivel: conflicto.nivel_nombre,
          curso: conflicto.curso_nombre,
          paralelo: conflicto.paralelo_nombre
        },
        ocupadas: ocupadas
      })
    }

    // Devolver las combinaciones ocupadas para referencia
    return NextResponse.json({
      hasConflict: false,
      ocupadas: ocupadas.map(o => ({
        id_colegio: o.id_colegio,
        id_nivel: o.id_nivel,
        id_curso: o.id_curso,
        id_paralelo: o.id_paralelo,
        profesor_nombre: o.profesor_nombre,
        profesor_email: o.profesor_email,
        nombre_aula: o.nombre_aula,
        colegio: o.colegio_nombre,
        nivel: o.nivel_nombre,
        curso: o.curso_nombre,
        paralelo: o.paralelo_nombre
      }))
    })

  } catch (error) {
    console.error("Error checking combination:", error)
    return NextResponse.json({ error: "Error al verificar combinación" }, { status: 500 })
  }
}