import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 })
    }

    // Get user from database
    const users = await executeQuery<any[]>(
      `SELECT u.id_usuario, u.usuario, u.password, u.nombre_completo, 
              GROUP_CONCAT(r.nombre) as roles
       FROM usuarios u
       JOIN usuario_roles ur ON u.id_usuario = ur.id_usuario
       JOIN roles r ON ur.id_rol = r.id_rol
       WHERE u.usuario = ? AND u.activo = TRUE
       GROUP BY u.id_usuario`,
      [username],
    )

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const user = users[0]

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      // Update failed attempts
      await executeQuery("UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id_usuario = ?", [
        user.id_usuario,
      ])

      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    // Reset failed attempts
    await executeQuery("UPDATE usuarios SET intentos_fallidos = 0, ultimo_acceso = NOW() WHERE id_usuario = ?", [
      user.id_usuario,
    ])

    // Create session token
    const token = jwt.sign(
      {
        id: user.id_usuario,
        username: user.usuario,
        roles: user.roles.split(","),
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "8h" },
    )

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    })

    // Get professor info if user is a professor
    let professorInfo = null
    if (user.roles.includes("PROFESOR")) {
      const professors = await executeQuery<any[]>(
        "SELECT id_profesor, puede_centralizar_notas, profesor_area FROM profesores WHERE id_usuario = ?",
        [user.id_usuario],
      )
      if (professors && professors.length > 0) {
        professorInfo = professors[0]
      }
    }

    return NextResponse.json({
      user: {
        id: user.id_usuario,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        roles: user.roles.split(","),
        ...(professorInfo && { profesor: professorInfo }),
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
