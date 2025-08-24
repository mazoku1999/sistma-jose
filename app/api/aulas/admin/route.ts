import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request) {
    try {
        const session = await getServerSession()
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        if (!session.user.roles.includes("ADMIN")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

        const { searchParams } = new URL(request.url)
        const search = (searchParams.get("search") || "").trim()
        const page = parseInt(searchParams.get("page") || "1", 10)
        const size = Math.min(parseInt(searchParams.get("size") || "10", 10), 100)
        const offset = (page - 1) * size

        const where = search ? "WHERE ap.nombre_aula LIKE ?" : ""
        const params: any[] = []
        if (search) params.push(`%${search}%`)

        const aulas = await executeQuery<any[]>(
            `SELECT 
        ap.id_aula_profesor as id,
        ap.nombre_aula,
        c.nombre as colegio,
        n.nombre as nivel,
        cur.nombre as curso,
        p.letra as paralelo,
        m.nombre_completo as materia,
        ap.max_estudiantes,
        (SELECT COUNT(*) FROM inscripciones_aula ia WHERE ia.id_aula_profesor = ap.id_aula_profesor) as inscritos
       FROM aulas_profesor ap
       JOIN colegios c ON ap.id_colegio = c.id_colegio
       JOIN niveles n ON ap.id_nivel = n.id_nivel
       JOIN cursos cur ON ap.id_curso = cur.id_curso
       JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
       JOIN materias m ON ap.id_materia = m.id_materia
       ${where}
       ORDER BY ap.nombre_aula
       LIMIT ${size} OFFSET ${offset}`,
            params
        )

        return NextResponse.json({ data: aulas, page, size })
    } catch (error) {
        console.error("Error listando aulas (admin):", error)
        return NextResponse.json({ error: "Error al listar aulas" }, { status: 500 })
    }
}


