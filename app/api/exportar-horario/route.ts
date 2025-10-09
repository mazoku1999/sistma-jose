import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener ID del profesor
        let profesorId = null
        if (session.user.roles.includes("PROFESOR")) {
            const profesores = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
                session.user.id,
            ])

            if (profesores && profesores.length > 0) {
                profesorId = profesores[0].id_profesor
            }
        }

        if (!profesorId) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }

        // Obtener horarios del profesor - consulta simplificada
        const horarios = await executeQuery<any[]>(`
      SELECT 
        h.id_horario as id,
        h.dia,
        h.hora_inicio,
        h.hora_fin,
        ap.nombre_aula,
        COALESCE(m.nombre_completo, 'Sin materia') as materia,
        COALESCE(c.nombre, 'Sin curso') as curso,
        COALESCE(p.letra, 'Sin paralelo') as paralelo
      FROM horario_profesor h
      JOIN aulas_profesor ap ON h.id_aula_profesor = ap.id_aula_profesor
      LEFT JOIN materias m ON ap.id_materia = m.id_materia
      LEFT JOIN cursos c ON ap.id_curso = c.id_curso
      LEFT JOIN paralelos p ON ap.id_paralelo = p.id_paralelo
      WHERE ap.id_profesor = ?
      ORDER BY h.dia, h.hora_inicio
    `, [profesorId])

        if (!horarios || horarios.length === 0) {
            return NextResponse.json({ error: "No hay horarios para exportar" }, { status: 404 })
        }

        // Crear datos para Excel
        const dias = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

        // Crear matriz de horario
        const scheduleData = []

        // Obtener todos los slots de tiempo únicos
        const timeSlots = []
        const processedTimes = new Set()

        horarios.forEach(horario => {
            const startFormatted = horario.hora_inicio.substring(0, 5) // HH:MM
            const endFormatted = horario.hora_fin.substring(0, 5) // HH:MM
            const timeKey = `${startFormatted}-${endFormatted}`

            if (!processedTimes.has(timeKey)) {
                processedTimes.add(timeKey)
                timeSlots.push({
                    start: startFormatted,
                    end: endFormatted
                })
            }
        })

        timeSlots.sort((a, b) => a.start.localeCompare(b.start))

        // Crear encabezados
        const headers = ["Hora", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
        scheduleData.push(headers)

        // Llenar datos del horario
        timeSlots.forEach((slot, index) => {
            const row = [`${slot.start} - ${slot.end}`]

            // Para cada día (1-6, lunes a sábado)
            for (let day = 1; day <= 6; day++) {
                const dayHorarios = horarios.filter(h => h.dia === day)
                const matchingHorario = dayHorarios.find(h => {
                    const hStart = h.hora_inicio.substring(0, 5)
                    const hEnd = h.hora_fin.substring(0, 5)
                    return hStart === slot.start && hEnd === slot.end
                })

                if (matchingHorario) {
                    const cellContent = `${matchingHorario.nombre_aula}\n${matchingHorario.materia}\n${matchingHorario.curso} ${matchingHorario.paralelo}`
                    row.push(cellContent)
                } else {
                    row.push("Libre")
                }
            }

            scheduleData.push(row)
        })

        // Crear workbook
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(scheduleData)

        // Ajustar ancho de columnas
        const colWidths = [
            { wch: 15 }, // Hora
            { wch: 20 }, // Lunes
            { wch: 20 }, // Martes
            { wch: 20 }, // Miércoles
            { wch: 20 }, // Jueves
            { wch: 20 }, // Viernes
            { wch: 20 }  // Sábado
        ]
        ws['!cols'] = colWidths

        // Agregar hoja al workbook
        XLSX.utils.book_append_sheet(wb, ws, "Horario")

        // Generar buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

        // Retornar archivo Excel
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="horario-${new Date().toISOString().split('T')[0]}.xlsx"`
            }
        })

    } catch (error) {
        console.error("Error al exportar horario:", error)
        return NextResponse.json({
            error: "Error al exportar horario",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
