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
    const materiaId = searchParams.get('materia')
    const gestionId = searchParams.get('gestion')

    if (!materiaId) {
      return NextResponse.json({ error: "Materia requerida" }, { status: 400 })
    }

    // Obtener todas las combinaciones ya ocupadas para esta materia (solo aulas activas)
    const ocupadasQuery = `
      SELECT 
        ap.id_colegio,
        ap.id_nivel, 
        ap.id_curso,
        ap.id_paralelo,
        u.nombre_completo as profesor_nombre,
        u.email as profesor_email,
        ap.nombre_aula
      FROM aulas_profesor ap
      JOIN profesores p ON ap.id_profesor = p.id_profesor
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE ap.id_materia = ? AND COALESCE(ap.activa, TRUE) = TRUE
      ${gestionId ? 'AND ap.id_gestion = ?' : ''}
    `
    
    const ocupadasParams = gestionId ? [materiaId, gestionId] : [materiaId]
    const ocupadas = await executeQuery<any[]>(ocupadasQuery, ocupadasParams)

    // Crear sets para búsqueda rápida
    const ocupadasSet = new Set(
      ocupadas.map(o => `${o.id_colegio}-${o.id_nivel}-${o.id_curso}-${o.id_paralelo}`)
    )
    const ocupadasMap = new Map(
      ocupadas.map(o => [
        `${o.id_colegio}-${o.id_nivel}-${o.id_curso}-${o.id_paralelo}`,
        {
          profesor_nombre: o.profesor_nombre,
          profesor_email: o.profesor_email,
          aula_existente: o.nombre_aula
        }
      ])
    )

    // Obtener todas las opciones disponibles
    const [colegios, niveles, cursos, paralelos] = await Promise.all([
      executeQuery<any[]>("SELECT id_colegio as id, nombre FROM colegios ORDER BY nombre"),
      executeQuery<any[]>("SELECT id_nivel as id, nombre FROM niveles ORDER BY nombre"), 
      executeQuery<any[]>("SELECT id_curso as id, nombre FROM cursos ORDER BY nombre"),
      executeQuery<any[]>("SELECT id_paralelo as id, letra as nombre FROM paralelos ORDER BY letra")
    ])

    // Por ahora, mostrar todas las opciones como disponibles
    // La verificación de combinaciones específicas se hará dinámicamente en el wizard
    const colegiosConDisponibilidad = colegios.map(colegio => ({
      ...colegio,
      disponible: true
    }))

    const nivelesConDisponibilidad = niveles.map(nivel => ({
      ...nivel,
      disponible: true
    }))

    const cursosConDisponibilidad = cursos.map(curso => ({
      ...curso,
      disponible: true
    }))

    const paralelosConDisponibilidad = paralelos.map(paralelo => ({
      ...paralelo,
      disponible: true
    }))

    return NextResponse.json({
      colegios: colegiosConDisponibilidad,
      niveles: nivelesConDisponibilidad,
      cursos: cursosConDisponibilidad,
      paralelos: paralelosConDisponibilidad,
      ocupadas: ocupadas.length
    })

  } catch (error) {
    console.error("Error fetching available options:", error)
    return NextResponse.json({ error: "Error al obtener opciones disponibles" }, { status: 500 })
  }
}