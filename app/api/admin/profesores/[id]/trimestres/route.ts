import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el usuario sea administrador
    const adminQuery = await executeQuery<any[]>(
      `SELECT ur.id_rol FROM usuario_roles ur 
       JOIN roles r ON ur.id_rol = r.id_rol 
       WHERE ur.id_usuario = ? AND r.nombre = 'ADMIN'`,
      [session.user.id]
    )

    if (!adminQuery.length) {
      return NextResponse.json({ error: "Solo administradores pueden consultar trimestres" }, { status: 403 })
    }

    const profesorId = (await params).id

    // Obtener la gestión activa
    const gestionActiva = await executeQuery<any[]>(
      "SELECT id_gestion FROM gestiones_academicas WHERE activa = TRUE LIMIT 1"
    )

    if (!gestionActiva.length) {
      return NextResponse.json({ error: "No hay gestión activa" }, { status: 400 })
    }

    const gestionId = gestionActiva[0].id_gestion

    // Obtener trimestres habilitados para el profesor en la gestión activa
    const trimestresQuery = await executeQuery<any[]>(
      `SELECT 
        trimestre,
        habilitado,
        fecha_habilitacion,
        habilitado_por,
        u.nombre_completo as habilitado_por_nombre
      FROM profesores_trimestres_habilitados pth
      LEFT JOIN usuarios u ON pth.habilitado_por = u.id_usuario
      WHERE pth.id_profesor = ? AND pth.id_gestion = ?
      ORDER BY trimestre`,
      [profesorId, gestionId]
    )

    // Si no existen registros, devolver estructura por defecto
    if (trimestresQuery.length === 0) {
      return NextResponse.json({
        gestion_id: gestionId,
        trimestres: [
          { trimestre: 1, habilitado: false, fecha_habilitacion: null, habilitado_por: null, habilitado_por_nombre: null },
          { trimestre: 2, habilitado: false, fecha_habilitacion: null, habilitado_por: null, habilitado_por_nombre: null },
          { trimestre: 3, habilitado: false, fecha_habilitacion: null, habilitado_por: null, habilitado_por_nombre: null }
        ]
      })
    }

    // Completar trimestres faltantes
    const trimestresMap = new Map(trimestresQuery.map(t => [t.trimestre, t]))
    const trimestresCompletos = [1, 2, 3].map(t => 
      trimestresMap.get(t) || { 
        trimestre: t, 
        habilitado: false, 
        fecha_habilitacion: null, 
        habilitado_por: null,
        habilitado_por_nombre: null 
      }
    )

    return NextResponse.json({
      gestion_id: gestionId,
      trimestres: trimestresCompletos
    })
  } catch (error) {
    console.error("Error al obtener trimestres habilitados:", error)
    return NextResponse.json({ error: "Error al obtener trimestres habilitados" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el usuario sea administrador
    const adminQuery = await executeQuery<any[]>(
      `SELECT ur.id_rol FROM usuario_roles ur 
       JOIN roles r ON ur.id_rol = r.id_rol 
       WHERE ur.id_usuario = ? AND r.nombre = 'ADMIN'`,
      [session.user.id]
    )

    if (!adminQuery.length) {
      return NextResponse.json({ error: "Solo administradores pueden modificar trimestres" }, { status: 403 })
    }

    const profesorId = (await params).id
    const { trimestre, habilitado } = await request.json()

    if (!trimestre || trimestre < 1 || trimestre > 3) {
      return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 })
    }

    if (typeof habilitado !== 'boolean') {
      return NextResponse.json({ error: "Estado habilitado inválido" }, { status: 400 })
    }

    // Verificar que el profesor existe
    const profesorQuery = await executeQuery<any[]>(
      "SELECT id_profesor FROM profesores WHERE id_profesor = ?",
      [profesorId]
    )

    if (!profesorQuery.length) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
    }

    // Obtener la gestión activa
    const gestionActiva = await executeQuery<any[]>(
      "SELECT id_gestion FROM gestiones_academicas WHERE activa = TRUE LIMIT 1"
    )

    if (!gestionActiva.length) {
      return NextResponse.json({ error: "No hay gestión activa" }, { status: 400 })
    }

    const gestionId = gestionActiva[0].id_gestion

    // Insertar o actualizar el registro
    await executeQuery(
      `INSERT INTO profesores_trimestres_habilitados 
        (id_profesor, id_gestion, trimestre, habilitado, fecha_habilitacion, habilitado_por) 
       VALUES (?, ?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE 
        habilitado = VALUES(habilitado),
        fecha_habilitacion = NOW(),
        habilitado_por = VALUES(habilitado_por)`,
      [profesorId, gestionId, trimestre, habilitado, session.user.id]
    )

    return NextResponse.json({ 
      success: true,
      message: `Trimestre ${trimestre} ${habilitado ? 'habilitado' : 'deshabilitado'} correctamente`
    })
  } catch (error) {
    console.error("Error al actualizar trimestre:", error)
    return NextResponse.json({ error: "Error al actualizar trimestre" }, { status: 500 })
  }
}
