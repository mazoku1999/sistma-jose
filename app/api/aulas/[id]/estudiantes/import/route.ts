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

    const capacidadParsed = capacidadRestante !== undefined && capacidadRestante !== null && capacidadRestante !== ''
      ? Number.parseInt(capacidadRestante, 10)
      : Number.NaN
    let remaining = Number.isNaN(capacidadParsed) ? estudiantes.length : Math.max(0, capacidadParsed)
    let createdNewStudents = 0
    let reusedExistingStudents = 0
    let skippedByCapacity = 0
    let addedToAula = 0
    const errors: string[] = []

    for (const estudiante of estudiantes) {
      const nombresRaw = (estudiante.Nombres || estudiante.NOMBRES || '')
      const paternoRaw = (estudiante.ApellidoPaterno || estudiante['Apellido Paterno'] || estudiante.apellido_paterno || estudiante.APELLIDOPATERNO || estudiante['APELLIDO PATERNO'] || '').toString().trim()
      const maternoRaw = (estudiante.ApellidoMaterno || estudiante['Apellido Materno'] || estudiante.apellido_materno || estudiante.APELLIDOMATERNO || estudiante['APELLIDO MATERNO'] || '').toString().trim()
      const apellidosRaw = (estudiante.Apellidos || estudiante.APELLIDOS || '').toString().trim()

      const nombres = nombresRaw.toString().trim()

      if (!nombres) {
        errors.push(`Estudiante sin nombres`)
        continue
      }

      let apellido_paterno = paternoRaw
      let apellido_materno = maternoRaw

      if (!apellido_paterno || !apellido_materno) {
        const parts = apellidosRaw.split(/\s+/).filter(Boolean)
        if (parts.length >= 2) {
          if (!apellido_paterno) apellido_paterno = parts[0]
          if (!apellido_materno) apellido_materno = parts.slice(1).join(' ')
        }
      }

      if (!apellido_paterno && !apellido_materno) {
        errors.push(`Apellidos incompletos para ${nombres}`)
        continue
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
            [nombres, apellido_paterno || null, apellido_materno || null]
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
          addedToAula += 1
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
      imported: addedToAula,
      errors,
    })
  } catch (error) {
    console.error("Error importando estudiantes:", error)
    return NextResponse.json({ error: "Error al importar estudiantes" }, { status: 500 })
  }
}
