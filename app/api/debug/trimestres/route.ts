import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 1. Verificar que la tabla existe
    const tableCheck = await executeQuery<any[]>(
      `SHOW TABLES LIKE 'profesores_trimestres_habilitados'`
    )

    // 2. Obtener el ID del profesor
    const profesorQuery = await executeQuery<any[]>(
      "SELECT id_profesor, id_usuario FROM profesores WHERE id_usuario = ?",
      [session.user.id]
    )

    // 3. Obtener la gestión activa
    const gestionActiva = await executeQuery<any[]>(
      "SELECT id_gestion, nombre FROM gestiones_academicas WHERE activa = TRUE LIMIT 1"
    )

    // 4. Obtener TODOS los registros de trimestres para este profesor
    let trimestresData: any[] = []
    if (profesorQuery.length > 0 && gestionActiva.length > 0) {
      trimestresData = await executeQuery<any[]>(
        `SELECT * FROM profesores_trimestres_habilitados 
         WHERE id_profesor = ? AND id_gestion = ?
         ORDER BY trimestre`,
        [profesorQuery[0].id_profesor, gestionActiva[0].id_gestion]
      )
    }

    // 5. Contar TODOS los registros en la tabla
    const totalRegistros = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM profesores_trimestres_habilitados`
    )

    return NextResponse.json({
      debug: {
        tabla_existe: tableCheck.length > 0,
        usuario_id: session.user.id,
        profesor: profesorQuery[0] || null,
        gestion_activa: gestionActiva[0] || null,
        trimestres_profesor: trimestresData,
        total_registros_tabla: totalRegistros[0]?.total || 0,
      }
    })
  } catch (error: any) {
    console.error("Error en debug:", error)
    return NextResponse.json({ 
      error: "Error en debug",
      message: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
