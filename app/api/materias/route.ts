import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const materias = await executeQuery<any[]>(
      "SELECT id_materia as id, nombre_corto, nombre_completo FROM materias ORDER BY nombre_completo",
    )

    return NextResponse.json(materias)
  } catch (error) {
    console.error("Error fetching materias:", error)
    return NextResponse.json({ error: "Error al obtener materias" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { nombre_corto, nombre_completo } = await request.json()

    if (!nombre_corto || !nombre_completo) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const result = await executeQuery<any>("INSERT INTO materias (nombre_corto, nombre_completo) VALUES (?, ?)", [
      nombre_corto,
      nombre_completo,
    ])

    return NextResponse.json({
      id: result.insertId,
      nombre_corto,
      nombre_completo,
    })
  } catch (error) {
    console.error("Error creating materia:", error)
    return NextResponse.json({ error: "Error al crear materia" }, { status: 500 })
  }
}
