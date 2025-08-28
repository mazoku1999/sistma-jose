import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"
import bcrypt from "bcrypt"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener profesores con datos básicos
    const profesores = await executeQuery<any[]>(
      `SELECT
        p.id_profesor as id,
        u.id_usuario,
        u.usuario,
        u.nombre_completo,
        u.email,
        u.telefono,
        u.activo,
        DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_registro,
        DATE_FORMAT(p.fecha_ingreso, '%Y-%m-%d') as fecha_ingreso
      FROM profesores p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      ORDER BY u.nombre_completo`
    )

    // Agregar información adicional básica
    for (const profesor of profesores) {
      profesor.estado = profesor.activo ? "activo" : "inactivo"

      // Obtener conteo de aulas asignadas (información útil)
      const aulasCount = await executeQuery<any[]>(
        `SELECT COUNT(*) as count
         FROM aulas_profesor
         WHERE id_profesor = ? AND activa = TRUE`,
        [profesor.id]
      )
      profesor.aulas_activas = aulasCount[0]?.count || 0
    }

    return NextResponse.json(profesores)
  } catch (error) {
    console.error("Error fetching profesores:", error)
    return NextResponse.json({ error: "Error al obtener profesores" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const {
      usuario,
      nombre_completo,
      email,
      telefono,
      password
    } = await request.json()

    if (!usuario || !nombre_completo || !email || !password) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 })
    }

    // Verificar si el usuario ya existe
    const existingUser = await executeQuery<any[]>(
      "SELECT id_usuario FROM usuarios WHERE usuario = ? OR email = ?",
      [usuario, email]
    )

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "El usuario o email ya existe" }, { status: 400 })
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Crear usuario
      const userResult = await executeQuery<any>(
        `INSERT INTO usuarios (usuario, password, nombre_completo, email, telefono, activo)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [usuario, hashedPassword, nombre_completo, email, telefono || null]
      )

      const userId = userResult.insertId

      // Crear profesor con datos básicos
      await executeQuery(
        "INSERT INTO profesores (id_usuario, especialidad, puede_centralizar_notas, profesor_area, fecha_ingreso) VALUES (?, NULL, FALSE, FALSE, CURDATE())",
        [userId]
      )

      // Asignar automáticamente el rol de PROFESOR
      const roleResult = await executeQuery<any[]>(
        "SELECT id_rol FROM roles WHERE nombre = 'PROFESOR'",
        []
      )

      if (roleResult.length > 0) {
        await executeQuery(
          "INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)",
          [userId, roleResult[0].id_rol]
        )
      }

      await executeQuery("COMMIT")

      // Obtener el profesor creado
      const profesorCreado = await executeQuery<any[]>(
        `SELECT
          p.id_profesor as id,
          u.usuario,
          u.nombre_completo,
          u.email,
          u.telefono
         FROM profesores p
         JOIN usuarios u ON p.id_usuario = u.id_usuario
         WHERE u.id_usuario = ?`,
        [userId]
      )

      if (profesorCreado.length === 0) {
        throw new Error("Error al obtener el profesor creado")
      }

      return NextResponse.json({
        ...profesorCreado[0],
        message: "Profesor creado correctamente"
      })
    } catch (error) {
      await executeQuery("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error creating profesor:", error)
    return NextResponse.json({ error: "Error al crear profesor" }, { status: 500 })
  }
}