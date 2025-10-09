import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea administrador
    if (!session.user.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    console.log("🔍 Obteniendo datos del dashboard de administrador...")

    // Obtener estadísticas más relevantes
    const totalUsuarios = await executeQuery<any[]>("SELECT COUNT(*) as total FROM usuarios")
    const totalColegios = await executeQuery<any[]>("SELECT COUNT(*) as total FROM colegios")
    const totalAulas = await executeQuery<any[]>("SELECT COUNT(*) as total FROM aulas_profesor WHERE activa = 1")
    const totalEstudiantes = await executeQuery<any[]>("SELECT COUNT(DISTINCT ia.id_estudiante) as total FROM inscripciones_aula ia JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor WHERE ap.activa = 1")
    const usuariosActivos = await executeQuery<any[]>("SELECT COUNT(*) as total FROM usuarios WHERE activo = 1")
    const usuariosInactivos = await executeQuery<any[]>("SELECT COUNT(*) as total FROM usuarios WHERE activo = 0")
    const aulasActivas = await executeQuery<any[]>("SELECT COUNT(*) as total FROM aulas_profesor WHERE activa = 1")
    const aulasInactivas = await executeQuery<any[]>("SELECT COUNT(*) as total FROM aulas_profesor WHERE activa = 0")



    // Obtener profesores
    let totalProfesores = 0
    try {
      const profesoresResult = await executeQuery<any[]>(`
        SELECT COUNT(*) as total 
        FROM usuarios u 
        JOIN usuario_roles ur ON u.id_usuario = ur.id_usuario 
        JOIN roles r ON ur.id_rol = r.id_rol 
        WHERE r.nombre = 'PROFESOR'
      `)
      totalProfesores = profesoresResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo profesores:", error)
    }

    // Obtener materias
    let totalMaterias = 0
    try {
      const materiasResult = await executeQuery<any[]>("SELECT COUNT(*) as total FROM materias")
      totalMaterias = materiasResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo materias:", error)
    }

    // Obtener últimos usuarios
    let ultimosUsuarios = []
    try {
      ultimosUsuarios = await executeQuery<any[]>(`
        SELECT 
          u.id_usuario,
          u.nombre_completo,
          u.usuario,
          u.email,
          DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_registro,
          u.activo
        FROM usuarios u
        ORDER BY u.fecha_creacion DESC
        LIMIT 5
      `)
    } catch (error) {
      console.log("⚠️ Error obteniendo últimos usuarios:", error)
    }

    // Obtener colegios con más aulas
    let colegiosConMasAulas = []
    try {
      colegiosConMasAulas = await executeQuery<any[]>(`
        SELECT 
          c.id_colegio as id,
          c.nombre,
          COUNT(ap.id_aula_profesor) as total_aulas,
          COUNT(DISTINCT ia.id_estudiante) as total_estudiantes
        FROM colegios c
        LEFT JOIN aulas_profesor ap ON c.id_colegio = ap.id_colegio AND ap.activa = 1
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        GROUP BY c.id_colegio, c.nombre
        ORDER BY total_aulas DESC
        LIMIT 5
      `)
    } catch (error) {
      console.log("⚠️ Error obteniendo colegios:", error)
    }

    // Obtener profesores más activos
    let profesoresMasActivos = []
    try {
      profesoresMasActivos = await executeQuery<any[]>(`
        SELECT 
          u.id_usuario as id,
          u.nombre_completo,
          COUNT(DISTINCT ap.id_aula_profesor) as total_aulas,
          COUNT(DISTINCT ia.id_estudiante) as total_estudiantes
        FROM usuarios u
        JOIN usuario_roles ur ON u.id_usuario = ur.id_usuario
        JOIN roles r ON ur.id_rol = r.id_rol
        JOIN profesores p ON u.id_usuario = p.id_usuario
        LEFT JOIN aulas_profesor ap ON p.id_profesor = ap.id_profesor AND ap.activa = 1
        LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        WHERE r.nombre = 'PROFESOR'
        GROUP BY u.id_usuario, u.nombre_completo
        ORDER BY total_aulas DESC
        LIMIT 5
      `)
    } catch (error) {
      console.log("⚠️ Error obteniendo profesores activos:", error)
    }

    // Obtener métricas administrativas relevantes
    let usuariosNuevosEsteMes = 0
    try {
      const usuariosResult = await executeQuery<any[]>(`
        SELECT COUNT(*) as total
        FROM usuarios u
        WHERE u.fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `)
      usuariosNuevosEsteMes = usuariosResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo usuarios nuevos:", error)
    }

    // Obtener aulas creadas este mes
    let aulasCreadasEsteMes = 0
    try {
      const aulasResult = await executeQuery<any[]>(`
        SELECT COUNT(*) as total
        FROM aulas_profesor ap
        WHERE ap.fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `)
      aulasCreadasEsteMes = aulasResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo aulas creadas:", error)
    }

    // Obtener profesores sin aulas asignadas
    let profesoresSinAulas = 0
    try {
      const profesoresResult = await executeQuery<any[]>(`
        SELECT COUNT(*) as total
        FROM profesores p
        WHERE p.id_profesor NOT IN (
          SELECT DISTINCT ap.id_profesor 
          FROM aulas_profesor ap 
          WHERE ap.activa = 1
        )
      `)
      profesoresSinAulas = profesoresResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo profesores sin aulas:", error)
    }

    // Obtener aulas sin estudiantes
    let aulasSinEstudiantes = 0
    try {
      const aulasResult = await executeQuery<any[]>(`
        SELECT COUNT(*) as total
        FROM aulas_profesor ap
        WHERE ap.activa = 1
        AND ap.id_aula_profesor NOT IN (
          SELECT DISTINCT ia.id_aula_profesor 
          FROM inscripciones_aula ia
        )
      `)
      aulasSinEstudiantes = aulasResult[0]?.total || 0
    } catch (error) {
      console.log("⚠️ Error obteniendo aulas sin estudiantes:", error)
    }

    // Obtener aulas con más estudiantes
    let aulasConMasEstudiantes = []
    try {
      aulasConMasEstudiantes = await executeQuery<any[]>(`
        SELECT 
          ap.nombre_aula as nombre,
          COUNT(DISTINCT ia.id_estudiante) as total_estudiantes,
          c.nombre as colegio
        FROM aulas_profesor ap
        JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
        JOIN colegios c ON ap.id_colegio = c.id_colegio
        WHERE ap.activa = 1
        GROUP BY ap.id_aula_profesor, ap.nombre_aula, c.nombre
        ORDER BY total_estudiantes DESC
        LIMIT 5
      `)
    } catch (error) {
      console.log("⚠️ Error obteniendo aulas con más estudiantes:", error)
    }

    const result = {
      totalUsuarios: totalUsuarios[0]?.total || 0,
      totalColegios: totalColegios[0]?.total || 0,
      totalAulas: totalAulas[0]?.total || 0,
      totalEstudiantes: totalEstudiantes[0]?.total || 0,
      totalProfesores,
      totalMaterias,
      usuariosActivos: usuariosActivos[0]?.total || 0,
      usuariosInactivos: usuariosInactivos[0]?.total || 0,
      aulasActivas: aulasActivas[0]?.total || 0,
      aulasInactivas: aulasInactivas[0]?.total || 0,
      usuariosNuevosEsteMes,
      aulasCreadasEsteMes,
      profesoresSinAulas,
      aulasSinEstudiantes,
      ultimosUsuarios: ultimosUsuarios || [],
      colegiosConMasAulas: colegiosConMasAulas || [],
      profesoresMasActivos: profesoresMasActivos || [],
      aulasConMasEstudiantes: aulasConMasEstudiantes || []
    }


    return NextResponse.json(result)

  } catch (error) {
    console.error("❌ Error fetching admin dashboard data:", error)
    return NextResponse.json({
      error: "Error al obtener datos del dashboard",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}
