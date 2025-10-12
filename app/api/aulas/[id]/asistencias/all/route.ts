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

        // Obtener todas las asistencias del aula
        const asistenciasQuery = await executeQuery<any[]>(
            `
      SELECT 
        ae.id_inscripcion,
        ae.fecha,
        ae.tipo_asistencia
      FROM asistencia_estudiante ae
      JOIN inscripciones_aula ia ON ae.id_inscripcion = ia.id_inscripcion
      WHERE ia.id_aula_profesor = ?
      ORDER BY ae.fecha ASC
      `,
            [aulaId]
        )

        // Asegurar que las fechas se devuelvan como strings
        const formattedAsistencias = asistenciasQuery.map(row => ({
            ...row,
            fecha: row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : row.fecha
        }))

        return NextResponse.json(formattedAsistencias)
    } catch (error) {
        console.error("Error al obtener asistencias (all):", error)
        return NextResponse.json({ error: "Error al obtener asistencias" }, { status: 500 })
    }
}


