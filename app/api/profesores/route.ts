import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"
import { enviarCredencialesProfesor } from "@/lib/email-utils"
import bcrypt from "bcrypt"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session || !session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener todos los usuarios (profesores, admin, administrativos)
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
        COALESCE(p.puede_centralizar_notas, 0) as puede_centralizar_notas,
        COALESCE(p.profesor_area, 0) as profesor_area,
        COALESCE(p.es_tutor, 0) as es_tutor
      FROM usuarios u
      LEFT JOIN profesores p ON u.id_usuario = p.id_usuario
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

      // Obtener conteo de aulas asignadas (solo si es profesor)
      if (profesor.id) {
        const aulasCount = await executeQuery<any[]>(
          `SELECT COUNT(*) as count 
           FROM aulas_profesor 
           WHERE id_profesor = ? AND activa = TRUE`,
          [profesor.id]
        )
        profesor.aulas_asignadas = aulasCount[0]?.count || 0
      } else {
        profesor.aulas_asignadas = 0
      }
      profesor.puede_centralizar_notas = !!profesor.puede_centralizar_notas
      profesor.es_tutor = !!profesor.es_tutor
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
    const esTutor: boolean = typeof body.es_tutor !== "undefined" ? !!body.es_tutor : false
    const puedeCentralizar: boolean = typeof body.puede_centralizar_notas !== "undefined" ? !!body.puede_centralizar_notas : true

    if (!usuario || !nombres || !apellido_paterno || !apellido_materno) {
      return NextResponse.json({ error: "Usuario, nombres, apellido paterno y apellido materno son requeridos" }, { status: 400 })
    }

    if (!email || email.trim() === "") {
      return NextResponse.json({ error: "El email es requerido para enviar las credenciales" }, { status: 400 })
    }

    const nombre_completo = `${nombres} ${apellido_paterno} ${apellido_materno}`.trim()

    // Verificar si el usuario ya existe
    const existingUser = await executeQuery<any[]>(
      "SELECT id_usuario FROM usuarios WHERE usuario = ? OR email = ?",
      [usuario, email]
    )

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "El usuario o email ya existe" }, { status: 400 })
    }

    // Generar contraseña automática siempre
    const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase()
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

      // Crear registro en profesores solo si el rol es PROFESOR
      const desiredRoles = roles && Array.isArray(roles) && roles.length > 0 ? roles : ["PROFESOR"]
      let profesorId = null
      
      if (desiredRoles.includes("PROFESOR")) {
        const profesorResult = await executeQuery<any>(
          "INSERT INTO profesores (id_usuario, puede_centralizar_notas, profesor_area, es_tutor) VALUES (?, ?, ?, ?)",
          [userId, puedeCentralizar, body.profesor_area ?? false, esTutor]
        )
        profesorId = profesorResult.insertId
      }

      // Asignar roles
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

      // Enviar credenciales por email automáticamente
      let emailEnviado = false
      let emailError = null

      try {
        const emailResult = await enviarCredencialesProfesor({
          nombreCompleto: nombre_completo,
          usuario,
          password,
          email
        })

        emailEnviado = emailResult.success
        emailError = emailResult.error
      } catch (error) {
        console.error("Error al enviar email:", error)
        emailError = error instanceof Error ? error.message : "Error desconocido"
      }

      return NextResponse.json({
        id: profesorId || userId,
        usuario,
        nombres,
        apellido_paterno,
        apellido_materno,
        nombre_completo,
        email: email,
        puede_centralizar_notas: desiredRoles.includes("PROFESOR") ? puedeCentralizar : false,
        es_tutor: desiredRoles.includes("PROFESOR") ? esTutor : false,
        password: password,
        emailEnviado,
        emailError
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
