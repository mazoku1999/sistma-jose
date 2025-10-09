import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Obtener ID del profesor
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

        const { searchParams } = new URL(request.url)
        const periodo = searchParams.get('periodo') || 'actual'

        // Obtener estadísticas generales
        const totalAulas = await executeQuery<any[]>(`
      SELECT COUNT(*) as total
      FROM aulas_profesor ap
      WHERE ap.id_profesor = ? AND ap.activa = 1
    `, [profesorId])

        const totalEstudiantes = await executeQuery<any[]>(`
      SELECT COUNT(DISTINCT ia.id_estudiante) as total
      FROM inscripciones_aula ia
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
    `, [profesorId])

        const totalNotas = await executeQuery<any[]>(`
      SELECT COUNT(*) as total
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
    `, [profesorId])

        const promedioGeneral = await executeQuery<any[]>(`
      SELECT AVG(nap.nota) as promedio
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
    `, [profesorId])

        // Obtener rendimiento por aula
        const rendimientoPorAula = await executeQuery<any[]>(`
      SELECT 
        ap.id_aula_profesor as id,
        ap.nombre_aula,
        COALESCE(m.nombre_completo, 'Sin materia') as materia,
        COUNT(DISTINCT ia.id_estudiante) as total_estudiantes,
        COALESCE(AVG(nap.nota), 0) as promedio,
        COUNT(CASE WHEN nap.nota >= 7 THEN 1 END) as aprobados,
        COUNT(CASE WHEN nap.nota < 7 THEN 1 END) as reprobados
      FROM aulas_profesor ap
      LEFT JOIN materias m ON ap.id_materia = m.id_materia
      LEFT JOIN inscripciones_aula ia ON ap.id_aula_profesor = ia.id_aula_profesor
      LEFT JOIN notas_aula_profesor nap ON ia.id_inscripcion = nap.id_inscripcion
      WHERE ap.id_profesor = ? AND ap.activa = 1
      GROUP BY ap.id_aula_profesor, ap.nombre_aula, m.nombre_completo
      ORDER BY ap.nombre_aula
    `, [profesorId])

        // Obtener distribución de notas
        const distribucionNotas = await executeQuery<any[]>(`
      SELECT 
        CASE 
          WHEN nap.nota >= 9 THEN '9.0 - 10.0'
          WHEN nap.nota >= 8 THEN '8.0 - 8.9'
          WHEN nap.nota >= 7 THEN '7.0 - 7.9'
          WHEN nap.nota >= 6 THEN '6.0 - 6.9'
          WHEN nap.nota >= 5 THEN '5.0 - 5.9'
          ELSE '0.0 - 4.9'
        END as rango,
        COUNT(*) as cantidad
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ?
      GROUP BY rango
      ORDER BY rango DESC
    `, [profesorId])

        // Calcular porcentajes para distribución de notas
        const totalNotasDistribucion = distribucionNotas.reduce((sum, item) => sum + item.cantidad, 0)
        const distribucionConPorcentaje = distribucionNotas.map(item => ({
            ...item,
            porcentaje: totalNotasDistribucion > 0 ? (item.cantidad / totalNotasDistribucion) * 100 : 0
        }))

        // Obtener tendencia mensual (últimos 6 meses)
        const tendenciaMensual = await executeQuery<any[]>(`
      SELECT 
        DATE_FORMAT(nap.fecha_registro, '%Y-%m') as mes,
        AVG(nap.nota) as promedio,
        COUNT(DISTINCT ia.id_estudiante) as total_estudiantes
      FROM notas_aula_profesor nap
      JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
      JOIN aulas_profesor ap ON ia.id_aula_profesor = ap.id_aula_profesor
      WHERE ap.id_profesor = ? 
        AND nap.fecha_registro >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(nap.fecha_registro, '%Y-%m')
      ORDER BY mes DESC
    `, [profesorId])

        // Formatear meses para mostrar
        const tendenciaFormateada = tendenciaMensual.map(item => ({
            mes: new Date(item.mes + '-01').toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long'
            }),
            promedio: parseFloat(item.promedio.toFixed(1)),
            total_estudiantes: item.total_estudiantes
        }))

        const estadisticas = {
            total_aulas: totalAulas[0]?.total || 0,
            total_estudiantes: totalEstudiantes[0]?.total || 0,
            total_notas: totalNotas[0]?.total || 0,
            promedio_general: parseFloat((promedioGeneral[0]?.promedio || 0).toFixed(1)),
            rendimiento_por_aula: rendimientoPorAula.map(aula => ({
                ...aula,
                promedio: parseFloat(aula.promedio.toFixed(1))
            })),
            distribucion_notas: distribucionConPorcentaje,
            tendencia_mensual: tendenciaFormateada
        }

        return NextResponse.json(estadisticas)
    } catch (error) {
        console.error("Error al obtener estadísticas:", error)
        return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 })
    }
}
