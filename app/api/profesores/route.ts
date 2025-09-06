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
        u.nombre_completo,
        u.email,
        u.telefono,
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
    const nombre_completo: string | undefined = body.nombre_completo
    const email: string | undefined = body.email
    const telefono: string | undefined = body.telefono
    const estado: string | undefined = body.estado
    const roles: string[] | undefined = body.roles
    let password: string | undefined = body.password

    if (!usuario || !nombre_completo) {
      return NextResponse.json({ error: "Usuario y nombre son requeridos" }, { status: 400 })
    }

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
        `INSERT INTO usuarios (usuario, password, nombre_completo, email, telefono, activo) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          usuario,
          hashedPassword,
          nombre_completo,
          email && email.trim() !== "" ? email : null,
          telefono || null,
          estado ? estado === "activo" : true,
        ]
      )

      const userId = userResult.insertId

      // Crear profesor
      const profesorResult = await executeQuery<any>(
        "INSERT INTO profesores (id_usuario, especialidad, puede_centralizar_notas, profesor_area) VALUES (?, ?, ?, ?)",
        [userId, null, true, false]
      )

      const profesorId = profesorResult.insertId

      console.log("Profesor creado - ID Usuario:", userId, "ID Profesor:", profesorId)

      // Verificar que el profesor se creó correctamente
      const profesorVerificado = await executeQuery<any[]>(
        "SELECT id_profesor, id_usuario FROM profesores WHERE id_profesor = ?",
        [profesorId]
      )

      if (profesorVerificado.length === 0) {
        throw new Error("Error: El profesor no se creó correctamente en la base de datos")
      }

      console.log("Profesor verificado:", profesorVerificado[0])

      // Verificar todos los profesores antes del commit
      const profesoresAntes = await executeQuery<any[]>(
        "SELECT id_profesor, id_usuario FROM profesores ORDER BY id_profesor"
      )
      console.log("Profesores antes del commit:", profesoresAntes)

      // Asignar roles
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

      // Nota: se omiten asignaciones de colegio/materia en este flujo básico

      await executeQuery("COMMIT")

      // Obtener el id_profesor correcto después de la transacción
      const profesorFinal = await executeQuery<any[]>(
        "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
        [userId]
      )

      if (profesorFinal.length === 0) {
        throw new Error("Error: No se pudo obtener el id_profesor después de crear el profesor")
      }

      const profesorIdFinal = profesorFinal[0].id_profesor
      console.log("Profesor final - ID Usuario:", userId, "ID Profesor Final:", profesorIdFinal)

      // Verificación final: verificar que el profesor existe en la base de datos
      const profesorFinalVerificado = await executeQuery<any[]>(
        "SELECT p.id_profesor, p.id_usuario, u.nombre_completo FROM profesores p JOIN usuarios u ON p.id_usuario = u.id_usuario WHERE p.id_profesor = ?",
        [profesorIdFinal]
      )

      if (profesorFinalVerificado.length === 0) {
        throw new Error(`Error: El profesor con id_profesor ${profesorIdFinal} no existe en la base de datos`)
      }

      console.log("Profesor final verificado:", profesorFinalVerificado[0])

      return NextResponse.json({
        id: profesorIdFinal,
        usuario,
        nombre_completo,
        email: email || null,
        message: "Usuario creado correctamente",
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
