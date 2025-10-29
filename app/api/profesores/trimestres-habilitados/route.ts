import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el ID del profesor
    const profesorQuery = await executeQuery<any[]>(
      "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
      [session.user.id]
    )

    if (!profesorQuery.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesorQuery[0].id_profesor

    // Obtener la gestión activa
    const gestionActiva = await executeQuery<any[]>(
      "SELECT id_gestion FROM gestiones_academicas WHERE activa = TRUE LIMIT 1"
    )

    if (!gestionActiva.length) {
      return NextResponse.json({ error: "No hay gestión activa" }, { status: 400 })
    }

    const gestionId = gestionActiva[0].id_gestion

    // Obtener trimestres habilitados
    const trimestresQuery = await executeQuery<any[]>(
      `SELECT trimestre, habilitado 
       FROM profesores_trimestres_habilitados 
       WHERE id_profesor = ? AND id_gestion = ? AND habilitado = TRUE
       ORDER BY trimestre`,
      [profesorId, gestionId]
    )

    // Crear un objeto con el estado de cada trimestre
    const trimestresHabilitados = {
      1: false,
      2: false,
      3: false
    }

    trimestresQuery.forEach(t => {
      trimestresHabilitados[t.trimestre as 1 | 2 | 3] = !!t.habilitado
    })

    return NextResponse.json({
      gestion_id: gestionId,
      trimestres_habilitados: trimestresHabilitados
    })
  } catch (error) {
    console.error("Error al obtener trimestres habilitados:", error)
    return NextResponse.json({ error: "Error al obtener trimestres habilitados" }, { status: 500 })
  }
}
