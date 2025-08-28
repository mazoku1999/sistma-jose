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
    const materias = await executeQuery<any[]>(
      "SELECT id_materia as id, nombre_corto, nombre_completo FROM materias WHERE id_materia = ?",
      [id],
    )

    if (!materias || materias.length === 0) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 })
    }

    return NextResponse.json(materias[0])
  } catch (error) {
    console.error("Error fetching materia:", error)
    return NextResponse.json({ error: "Error al obtener materia" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id
    const { nombre_corto, nombre_completo } = await request.json()

    if (!nombre_corto || !nombre_completo) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const result = await executeQuery<any>(
      "UPDATE materias SET nombre_corto = ?, nombre_completo = ? WHERE id_materia = ?",
      [nombre_corto, nombre_completo, id],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 })
    }

    return NextResponse.json({
      id: Number.parseInt(id),
      nombre_corto,
      nombre_completo,
    })
  } catch (error) {
    console.error("Error updating materia:", error)
    return NextResponse.json({ error: "Error al actualizar materia" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id

    // Check if materia is being used
    const aulaCheck = await executeQuery<any[]>("SELECT COUNT(*) as count FROM aulas_profesor WHERE id_materia = ?", [
      id,
    ])

    if (aulaCheck[0].count > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar la materia porque está siendo utilizada en aulas",
        },
        { status: 400 },
      )
    }

    const result = await executeQuery<any>("DELETE FROM materias WHERE id_materia = ?", [id])

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting materia:", error)
    return NextResponse.json({ error: "Error al eliminar materia" }, { status: 500 })
  }
}
