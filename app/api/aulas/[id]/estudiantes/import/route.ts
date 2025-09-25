import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const aulaId = (await params).id

    const { estudiantes, capacidadRestante } = await request.json()

    if (!Array.isArray(estudiantes)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 })
    }

    let remaining = Math.max(0, parseInt(capacidadRestante || '0', 10) || 0)
    let createdNewStudents = 0
    let reusedExistingStudents = 0
    let skippedByCapacity = 0
    const errors: string[] = []

    for (const estudiante of estudiantes) {
      // Validar datos (acepta antiguos y nuevos encabezados)
      const nombresRaw = (estudiante.Nombres || estudiante.NOMBRES || '').toString().trim()
      const apellidosRaw = (estudiante.Apellidos || estudiante.APELLIDOS || '').toString().trim()
      const paternoRaw = (estudiante.ApellidoPaterno || estudiante['Apellido Paterno'] || '').toString().trim()
      const maternoRaw = (estudiante.ApellidoMaterno || estudiante['Apellido Materno'] || '').toString().trim()

      if (!nombresRaw || (!apellidosRaw && (!paternoRaw || !maternoRaw))) {
        errors.push(`Estudiante sin nombres o apellidos completos`)
        continue
      }

      const nombres = nombresRaw
      let apellido_paterno = paternoRaw
      let apellido_materno = maternoRaw

      // Si solo viene "Apellidos", intentar dividir por espacio
      if (!apellido_paterno || !apellido_materno) {
        const parts = apellidosRaw.split(/\s+/).filter(Boolean)
        if (parts.length >= 2) {
          apellido_paterno = apellido_paterno || parts[0]
          apellido_materno = apellido_materno || parts.slice(1).join(' ')
        } else {
          errors.push(`Apellidos incompletos: ${apellidosRaw}`)
          continue
        }
      }

      try {
        if (remaining <= 0) { skippedByCapacity += 1; continue }

        // Verificar si el estudiante ya existe
        const existingStudent = await executeQuery<any[]>(
          "SELECT id_estudiante FROM estudiantes WHERE nombres = ? AND apellido_paterno = ? AND apellido_materno = ?",
          [nombres, apellido_paterno, apellido_materno]
        )

        let studentId: number

        if (existingStudent.length > 0) {
          studentId = existingStudent[0].id_estudiante
          reusedExistingStudents += 1
        } else {
          // Crear nuevo estudiante
          const insertResult = await executeQuery<any>(
            "INSERT INTO estudiantes (nombres, apellido_paterno, apellido_materno) VALUES (?, ?, ?)",
            [nombres, apellido_paterno, apellido_materno]
          )
          studentId = insertResult.insertId
          createdNewStudents += 1
        }

        // Verificar si ya está inscrito en esta aula
        const existingInscription = await executeQuery<any[]>(
          "SELECT id_inscripcion FROM inscripciones_aula WHERE id_aula_profesor = ? AND id_estudiante = ?",
          [aulaId, studentId]
        )

        if (existingInscription.length === 0) {
          await executeQuery(
            "INSERT INTO inscripciones_aula (id_aula_profesor, id_estudiante, fecha_inscripcion) VALUES (?, ?, CURRENT_DATE)",
            [aulaId, studentId]
          )
          remaining -= 1
        }
      } catch (error) {
        console.error(`Error al procesar estudiante ${nombres} ${apellido_paterno} ${apellido_materno}:`, error)
        errors.push(`Error al procesar ${nombres} ${apellido_paterno} ${apellido_materno}`)
      }
    }

    return NextResponse.json({
      success: true,
      createdNewStudents,
      reusedExistingStudents,
      skippedByCapacity,
      remainingCapacity: remaining,
      errors,
    })
  } catch (error) {
    console.error("Error importando estudiantes:", error)
    return NextResponse.json({ error: "Error al importar estudiantes" }, { status: 500 })
  }
}
