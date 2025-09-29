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

        const aulaId = (await params).id
        const { searchParams } = new URL(request.url)
        const search = (searchParams.get('q') || '').trim()

        const whereSearch = search ? "AND (e.nombres LIKE ? OR e.apellido_paterno LIKE ? OR e.apellido_materno LIKE ?)" : ""
        const paramsSearch: any[] = []
        if (search) { paramsSearch.push(`%${search}%`, `%${search}%`, `%${search}%`) }

        const estudiantes = await executeQuery<any[]>(
            `SELECT e.id_estudiante as id, e.nombres, e.apellido_paterno, e.apellido_materno,
       CONCAT_WS(' ', e.nombres, e.apellido_paterno, e.apellido_materno) as nombre_completo
       FROM estudiantes e
       WHERE e.id_estudiante NOT IN (
         SELECT ia.id_estudiante FROM inscripciones_aula ia WHERE ia.id_aula_profesor = ?
       )
       ${whereSearch}
       ORDER BY 
         CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN 0 ELSE 1 END,
         CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.apellido_materno) ELSE TRIM(e.apellido_paterno) END,
         CASE WHEN TRIM(IFNULL(e.apellido_paterno, '')) = '' THEN TRIM(e.nombres) ELSE TRIM(e.apellido_materno) END,
         TRIM(e.nombres)
      `,
            [aulaId, ...paramsSearch]
        )

        return NextResponse.json(estudiantes)
    } catch (e) {
        console.error('Error fetching available students', e)
        return NextResponse.json({ error: 'Error al obtener estudiantes disponibles' }, { status: 500 })
    }
}


