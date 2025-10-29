import { NextResponse } from "next/server"

export function GET() {
    return NextResponse.json({ error: "Asistencia general no disponible" }, { status: 404 })
}
