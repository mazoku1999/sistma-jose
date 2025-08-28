import { NextResponse } from "next/server"
import { getGradeRangeOptions, GRADE_RANGES } from "@/lib/grade-utils"

export async function GET() {
    try {
        // Devolver toda la información de rangos
        return NextResponse.json({
            ranges: GRADE_RANGES,
            options: getGradeRangeOptions(),
            description: "Sistema de rangos valorativos del colegio"
        })
    } catch (error) {
        console.error("Error al obtener rangos:", error)
        return NextResponse.json({ error: "Error al obtener rangos" }, { status: 500 })
    }
}
