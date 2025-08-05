import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const colegios = await executeQuery<any[]>(
      "SELECT id_colegio as id, nombre, direccion, telefono, email FROM colegios ORDER BY nombre"
    )

    return NextResponse.json(colegios)
  } catch (error) {
    console.error("Error fetching colegios:", error)
    return NextResponse.json({ error: "Error al obtener colegios" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { nombre, direccion, telefono, email } = await request.json()

    if (!nombre) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const result = await executeQuery<any>(
      "INSERT INTO colegios (nombre, direccion, telefono, email) VALUES (?, ?, ?, ?)",
      [nombre, direccion || null, telefono || null, email || null]
    )

    return NextResponse.json({
      id: result.insertId,
      nombre,
      direccion,
      telefono,
      email,
    })
  } catch (error) {
    console.error("Error creating colegio:", error)
    return NextResponse.json({ error: "Error al crear colegio" }, { status: 500 })
  }
}