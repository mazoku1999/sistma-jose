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

    // Obtener profesores con sus asignaciones
    const profesores = await executeQuery<any[]>(
      `SELECT 
        u.id_usuario,
        p.id_profesor as id,
        u.usuario,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        u.nombre_completo,
        u.email,
        u.activo,
        DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_registro,
        p.especialidad,
        p.puede_centralizar_notas,
        p.profesor_area
      FROM usuarios u
      JOIN profesores p ON u.id_usuario = p.id_usuario
      ORDER BY u.nombre_completo`
    )

    // Obtener roles y conteo de aulas para cada profesor
    for (const profesor of profesores) {
      const roles = await executeQuery<any[]>(
        `SELECT r.nombre 
         FROM usuario_roles ur 
         JOIN roles r ON ur.id_rol = r.id_rol 
         WHERE ur.id_usuario = ?`,
        [profesor.id_usuario]
      )
      profesor.roles = roles.map(r => r.nombre)
      profesor.estado = profesor.activo ? "activo" : "inactivo"

      // Obtener conteo de aulas asignadas
      const aulasCount = await executeQuery<any[]>(
        `SELECT COUNT(*) as count 
         FROM aulas_profesor 
         WHERE id_profesor = ? AND activa = TRUE`,
        [profesor.id]
      )
      profesor.aulas_asignadas = aulasCount[0]?.count || 0
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

    const body = await request.json()
    const usuario: string | undefined = body.usuario
    const nombres: string | undefined = body.nombres
    const apellido_paterno: string | undefined = body.apellido_paterno
    const apellido_materno: string | undefined = body.apellido_materno
    const email: string | undefined = body.email
    // telefono eliminado
    const estado: string | undefined = body.estado
    const roles: string[] | undefined = body.roles
    let password: string | undefined = body.password

    if (!usuario || !nombres || !apellido_paterno || !apellido_materno) {
      return NextResponse.json({ error: "Usuario, nombres, apellido paterno y apellido materno son requeridos" }, { status: 400 })
    }

    const nombre_completo = `${nombres} ${apellido_paterno} ${apellido_materno}`.trim()

    // Verificar si el usuario ya existe
    const existingUser = await executeQuery<any[]>(
      email && email.trim() !== ""
        ? "SELECT id_usuario FROM usuarios WHERE usuario = ? OR email = ?"
        : "SELECT id_usuario FROM usuarios WHERE usuario = ?",
      email && email.trim() !== "" ? [usuario, email] : [usuario]
    )

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "El usuario o email ya existe" }, { status: 400 })
    }

    // Generar contraseña temporal si no se envía
    let generatedTemp = false
    if (!password || password.trim() === "") {
      const tmp = Math.random().toString(36).slice(-10)
      password = tmp
      generatedTemp = true
    }
    const hashedPassword = await bcrypt.hash(password, 10)

    // Iniciar transacción
    await executeQuery("START TRANSACTION")

    try {
      // Crear usuario
      const userResult = await executeQuery<any>(
        `INSERT INTO usuarios (usuario, password, nombres, apellido_paterno, apellido_materno, nombre_completo, email, activo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          usuario,
          hashedPassword,
          nombres,
          apellido_paterno,
          apellido_materno,
          nombre_completo,
          email && email.trim() !== "" ? email : null,
          estado ? estado === "activo" : true,
        ]
      )

      const userId = userResult.insertId

      // Crear profesor
      const profesorResult = await executeQuery<any>(
        "INSERT INTO profesores (id_usuario, especialidad, puede_centralizar_notas, profesor_area) VALUES (?, ?, ?, ?)",
        [userId, body.especialidad || null, body.puede_centralizar_notas ?? true, body.profesor_area ?? false]
      )

      const profesorId = profesorResult.insertId

      // Asignar roles (por defecto PROFESOR si no se envían)
      const desiredRoles = roles && Array.isArray(roles) && roles.length > 0 ? roles : ["PROFESOR"]
      for (const roleName of desiredRoles) {
        const roleResult = await executeQuery<any[]>(
          "SELECT id_rol FROM roles WHERE nombre = ?",
          [roleName]
        )
        if (roleResult.length > 0) {
          await executeQuery(
            "INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)",
            [userId, roleResult[0].id_rol]
          )
        }
      }

      await executeQuery("COMMIT")

      return NextResponse.json({
        id: profesorId,
        usuario,
        nombres,
        apellido_paterno,
        apellido_materno,
        nombre_completo,
        email: email || null,
        tempPassword: generatedTemp ? password : undefined,
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
