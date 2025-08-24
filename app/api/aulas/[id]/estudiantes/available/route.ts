import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession()
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        // Solo ADMIN o PROFESOR
        if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("PROFESOR")) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        }

        const { id } = await params
        const aulaId = id
        const { searchParams } = new URL(request.url)
        const search = (searchParams.get("search") || "").trim()
        const page = parseInt(searchParams.get("page") || "1", 10)
        const size = Math.min(parseInt(searchParams.get("size") || "10", 10), 100)
        const offset = (page - 1) * size

        // Obtener contexto del aula (colegio/nivel/curso/paralelo)
        const aula = await executeQuery<any[]>(
            `SELECT id_colegio, id_nivel, id_curso, id_paralelo
       FROM aulas_profesor WHERE id_aula_profesor = ?`,
            [aulaId]
        )
        if (!aula.length) return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })

        // Estudiantes no inscritos en esta aula
        const whereSearch = search ? "AND (e.nombres LIKE ? OR e.apellidos LIKE ?)" : ""
        const paramsList: any[] = [aulaId]
        if (search) paramsList.push(`%${search}%`, `%${search}%`)

        const candidatos = await executeQuery<any[]>(
            `SELECT e.id_estudiante as id, CONCAT(e.nombres,' ',e.apellidos) as nombre_completo
       FROM estudiantes e
       WHERE e.id_estudiante NOT IN (
         SELECT ia.id_estudiante FROM inscripciones_aula ia WHERE ia.id_aula_profesor = ?
       ) ${whereSearch}
       ORDER BY nombre_completo
       LIMIT ${size} OFFSET ${offset}`,
            paramsList
        )

        return NextResponse.json({ data: candidatos, page, size })
    } catch (error) {
        console.error("Error obteniendo candidatos:", error)
        return NextResponse.json({ error: "Error al obtener candidatos" }, { status: 500 })
    }
}


