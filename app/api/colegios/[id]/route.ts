import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    const colegios = await executeQuery<any[]>("SELECT id_colegio as id, nombre FROM colegios WHERE id_colegio = ?", [
      id,
    ])

    if (!colegios || colegios.length === 0) {
      return NextResponse.json({ error: "Colegio no encontrado" }, { status: 404 })
    }

    return NextResponse.json(colegios[0])
  } catch (error) {
    console.error("Error fetching colegio:", error)
    return NextResponse.json({ error: "Error al obtener colegio" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    const { nombre } = await request.json()

    if (!nombre) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const result = await executeQuery<any>("UPDATE colegios SET nombre = ? WHERE id_colegio = ?", [nombre, id])

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Colegio no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ id: Number.parseInt(id), nombre })
  } catch (error) {
    console.error("Error updating colegio:", error)
    return NextResponse.json({ error: "Error al actualizar colegio" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id

    // Check if colegio is being used
    const aulaCheck = await executeQuery<any[]>("SELECT COUNT(*) as count FROM aulas_profesor WHERE id_colegio = ?", [
      id,
    ])

    if (aulaCheck[0].count > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar el colegio porque está siendo utilizado en aulas",
        },
        { status: 400 },
      )
    }

    const result = await executeQuery<any>("DELETE FROM colegios WHERE id_colegio = ?", [id])

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Colegio no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting colegio:", error)
    return NextResponse.json({ error: "Error al eliminar colegio" }, { status: 500 })
  }
}
