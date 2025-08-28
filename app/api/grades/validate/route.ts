import { NextResponse } from "next/server"
import { getGradeRange, getGradeInfo, isValidGrade } from "@/lib/grade-utils"

export async function POST(request: Request) {
    try {
        const { grade } = await request.json()

        if (typeof grade !== 'number') {
            return NextResponse.json({ error: "La nota debe ser un número" }, { status: 400 })
        }

        const isValid = isValidGrade(grade)

        if (!isValid) {
            return NextResponse.json({
                valid: false,
                error: "La nota debe estar entre 1 y 100"
            })
        }

        const range = getGradeRange(grade)
        const info = getGradeInfo(grade)

        return NextResponse.json({
            valid: true,
            grade,
            range,
            info,
            formatted: `${grade} (${range})`
        })
    } catch (error) {
        console.error("Error al validar nota:", error)
        return NextResponse.json({ error: "Error al validar nota" }, { status: 500 })
    }
}
