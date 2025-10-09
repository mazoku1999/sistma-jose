import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get profesor ID
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

    // Get horario
    const horario = await executeQuery<any[]>(
      `SELECT h.id_horario as id, h.dia, h.hora_inicio, h.hora_fin, 
              h.id_aula_profesor, ap.nombre_aula
       FROM horario_profesor h
       JOIN aulas_profesor ap ON h.id_aula_profesor = ap.id_aula_profesor
       WHERE ap.id_profesor = ?
       ORDER BY h.dia, h.hora_inicio`,
      [profesorId],
    )

    return NextResponse.json(horario)
  } catch (error) {
    console.error("Error fetching horario:", error)
    return NextResponse.json({ error: "Error al obtener horario" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("PROFESOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Horario POST body:", body)

    const { dia, hora_inicio, hora_fin, id_aula_profesor, id_aula } = body

    // Manejar tanto id_aula_profesor como id_aula (compatibilidad)
    const aulaProfesorId = id_aula_profesor || id_aula

    // Validar campos requeridos
    if (!dia || !hora_inicio || !hora_fin || !aulaProfesorId) {
      console.log("Campos faltantes:", { dia, hora_inicio, hora_fin, id_aula_profesor, id_aula })
      return NextResponse.json({
        error: "Todos los campos son requeridos",
        details: {
          dia,
          hora_inicio,
          hora_fin,
          id_aula_profesor: aulaProfesorId,
          note: "Se acepta tanto 'id_aula_profesor' como 'id_aula'"
        }
      }, { status: 400 })
    }

    // Validar que el día sea un número del 1-7
    const diaNumero = parseInt(dia)
    if (isNaN(diaNumero) || diaNumero < 1 || diaNumero > 7) {
      return NextResponse.json({
        error: "Día inválido. Debe ser un número del 1 al 7 (1=Lunes, 7=Domingo)",
        received: dia
      }, { status: 400 })
    }

    console.log("Día validado:", { original: dia, numero: diaNumero })

    // Validar formato de horas
    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!horaRegex.test(hora_inicio) || !horaRegex.test(hora_fin)) {
      return NextResponse.json({
        error: "Formato de hora inválido. Use HH:MM (24 horas)",
        received: { hora_inicio, hora_fin }
      }, { status: 400 })
    }

    // Validar que hora_inicio < hora_fin
    const [horaInicio, minutoInicio] = hora_inicio.split(':').map(Number)
    const [horaFin, minutoFin] = hora_fin.split(':').map(Number)
    const minutosInicio = horaInicio * 60 + minutoInicio
    const minutosFin = horaFin * 60 + minutoFin

    if (minutosInicio >= minutosFin) {
      return NextResponse.json({
        error: "La hora de inicio debe ser anterior a la hora de fin",
        received: { hora_inicio, hora_fin }
      }, { status: 400 })
    }

    // Get profesor ID
    const profesores = await executeQuery<any[]>("SELECT id_profesor FROM profesores WHERE id_usuario = ?", [
      session.user.id,
    ])

    if (!profesores || profesores.length === 0) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    const profesorId = profesores[0].id_profesor

    // Check if aula belongs to profesor
    const aulaCheck = await executeQuery<any[]>(
      "SELECT id_aula_profesor FROM aulas_profesor WHERE id_aula_profesor = ? AND id_profesor = ?",
      [aulaProfesorId, profesorId],
    )

    if (!aulaCheck || aulaCheck.length === 0) {
      return NextResponse.json({ error: "Aula no encontrada o no tiene permisos" }, { status: 404 })
    }

    // Check for overlapping horario
    const overlapCheck = await executeQuery<any[]>(
      `SELECT h.id_horario, h.hora_inicio, h.hora_fin, ap.nombre_aula
       FROM horario_profesor h
       JOIN aulas_profesor ap ON h.id_aula_profesor = ap.id_aula_profesor
       WHERE ap.id_profesor = ? AND h.dia = ? AND 
       ((h.hora_inicio <= ? AND h.hora_fin > ?) OR
        (h.hora_inicio < ? AND h.hora_fin >= ?) OR
        (h.hora_inicio >= ? AND h.hora_fin <= ?))`,
      [profesorId, diaNumero, hora_inicio, hora_inicio, hora_fin, hora_fin, hora_inicio, hora_fin],
    )

    if (overlapCheck && overlapCheck.length > 0) {
      console.log("Horario superpuesto encontrado:", overlapCheck[0])
      return NextResponse.json({
        error: "El horario se superpone con otro existente",
        conflict: {
          dia: diaNumero,
          hora_inicio,
          hora_fin,
          conflicto_con: overlapCheck[0]
        }
      }, { status: 400 })
    }

    // Insert horario
    console.log("Insertando horario:", { dia: diaNumero, hora_inicio, hora_fin, id_aula_profesor: aulaProfesorId, profesorId })

    const result = await executeQuery<any>(
      "INSERT INTO horario_profesor (dia, hora_inicio, hora_fin, id_aula_profesor) VALUES (?, ?, ?, ?)",
      [diaNumero, hora_inicio, hora_fin, aulaProfesorId],
    )

    console.log("Horario insertado con ID:", result.insertId)

    // Get aula name
    const aulas = await executeQuery<any[]>("SELECT nombre_aula FROM aulas_profesor WHERE id_aula_profesor = ?", [
      aulaProfesorId,
    ])

    const response = {
      id: result.insertId,
      dia: diaNumero,
      hora_inicio,
      hora_fin,
      id_aula_profesor: aulaProfesorId,
      nombre_aula: aulas[0]?.nombre_aula || 'Aula no encontrada',
    }

    console.log("Respuesta del horario:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error creating horario:", error)
    return NextResponse.json({ error: "Error al crear horario" }, { status: 500 })
  }
}
