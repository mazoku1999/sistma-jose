import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

export async function GET(req: Request) {
    try {
        const session = await getServerSession()
        if (!session) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const colegio = searchParams.get("colegio")
        const nivel = searchParams.get("nivel")
        const curso = searchParams.get("curso")
        const paralelo = searchParams.get("paralelo")
        const trimestre = searchParams.get("trimestre")

        if (!colegio || !nivel || !curso || !paralelo || !trimestre) {
            return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 })
        }

        console.log('📊 Calculando estadísticas para:', { colegio, nivel, curso, paralelo, trimestre })

        // 1. Determinar cuántas materias corresponden al curso
        const cursoInfo = await executeQuery<any[]>(
            `SELECT nombre FROM cursos WHERE id_curso = ?`,
            [curso]
        )
        const cursoNombre: string = (cursoInfo[0]?.nombre || "").toString()
        const cursoNumero = parseInt(cursoNombre) || 0

        // IDs de materias según el curso
        const baseMateriaIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13] // 11 materias base
        const extraMateriaIds = [10, 11] // Física y Química solo para 4-6
        const materiasPermitidas = cursoNumero >= 4 ? [...baseMateriaIds, ...extraMateriaIds] : baseMateriaIds
        const cantidadMateriasEsperadas = materiasPermitidas.length

        console.log(`📚 Curso ${cursoNumero}: ${cantidadMateriasEsperadas} materias esperadas`)

        // 2. Obtener todas las notas del curso/paralelo/trimestre
        const notasQuery = await executeQuery<any[]>(
            `SELECT 
                cn.id_estudiante,
                cn.id_materia,
                cn.nota_final_materia,
                CONCAT_WS(' ', 
                    COALESCE(e.apellido_paterno, ''),
                    COALESCE(e.apellido_materno, ''),
                    e.nombres
                ) as nombre_completo
             FROM centralizacion_notas cn
             JOIN estudiantes e ON cn.id_estudiante = e.id_estudiante
             WHERE cn.id_colegio = ? 
               AND cn.id_nivel = ? 
               AND cn.id_curso = ? 
               AND cn.id_paralelo = ? 
               AND cn.trimestre = ?
               AND cn.nota_final_materia > 0`,
            [colegio, nivel, curso, paralelo, trimestre]
        )

        console.log(`📝 Total de notas encontradas: ${notasQuery.length}`)

        // 3. Agrupar notas por estudiante
        const notasPorEstudiante: Record<number, { notas: number[], nombre: string }> = {}

        notasQuery.forEach(nota => {
            if (!notasPorEstudiante[nota.id_estudiante]) {
                notasPorEstudiante[nota.id_estudiante] = {
                    notas: [],
                    nombre: nota.nombre_completo
                }
            }
            notasPorEstudiante[nota.id_estudiante].notas.push(nota.nota_final_materia)
        })

        // 4. Calcular promedios dividiendo entre materias esperadas del curso
        const promedios = Object.entries(notasPorEstudiante).map(([id, data]) => {
            // Suma de todas las notas que tiene
            const suma = data.notas.reduce((sum, nota) => sum + nota, 0)
            
            // Promedio = suma / cantidad de materias que DEBE llevar (no las que tiene)
            const promedio = suma / cantidadMateriasEsperadas
            
            return {
                id_estudiante: parseInt(id),
                nombre: data.nombre,
                promedio,
                cantidadMateriasConNota: data.notas.length,
                cantidadMateriasEsperadas: cantidadMateriasEsperadas,
                notas: data.notas
            }
        })

        // 4. Detectar escala automáticamente
        const todasLasNotas = notasQuery.map(n => n.nota_final_materia)
        const notaMaxima = Math.max(...todasLasNotas)
        const esEscala0a10 = notaMaxima <= 10
        const puntajeMinimo = esEscala0a10 ? 5.1 : 51
        const puntajeDestacado = esEscala0a10 ? 8.5 : 85

        console.log(`🎯 Escala detectada: ${esEscala0a10 ? '0-10' : '0-100'}`)
        console.log(`📏 Puntaje mínimo: ${puntajeMinimo}`)

        // 5. Calcular estadísticas
        const totalEstudiantes = promedios.length
        const promedioGeneral = totalEstudiantes > 0
            ? promedios.reduce((sum, p) => sum + p.promedio, 0) / totalEstudiantes
            : 0

        // Aprobados: promedio >= puntajeMinimo
        const aprobados = promedios.filter(p => p.promedio >= puntajeMinimo).length

        // Reprobados: promedio < puntajeMinimo
        const reprobados = promedios.filter(p => p.promedio < puntajeMinimo).length

        // Destacados: promedio >= puntajeDestacado
        const destacados = promedios.filter(p => p.promedio >= puntajeDestacado).length

        const stats = {
            totalEstudiantes,
            promedioGeneral: parseFloat(promedioGeneral.toFixed(2)),
            aprobados,
            reprobados,
            destacados,
            puntajeMinimo,
            puntajeDestacado,
            esEscala0a10,
            detalleEstudiantes: promedios.map(p => ({
                nombre: p.nombre,
                promedio: parseFloat(p.promedio.toFixed(2)),
                cantidadMateriasConNota: p.cantidadMateriasConNota,
                cantidadMateriasEsperadas: p.cantidadMateriasEsperadas,
                estado: p.promedio >= puntajeMinimo ? 'aprobado' : 'reprobado'
            }))
        }

        console.log('✅ Estadísticas calculadas:', stats)

        return NextResponse.json(stats)

    } catch (error) {
        console.error("Error calculando estadísticas:", error)
        return NextResponse.json(
            { error: "Error al calcular estadísticas" },
            { status: 500 }
        )
    }
}
