import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getServerSession } from "@/lib/get-server-session"

interface NotaBatch {
    id_inscripcion: number
    trimestre: number
    nota_ser?: number
    nota_saber?: number
    nota_hacer?: number
    nota_decidir?: number
    nota_autoevaluacion?: number
    promedio_final_trimestre: number
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession()
        if (!session) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 })
        }

        const aulaId = parseInt((await params).id)
        const body = await req.json()
        const { notasPorTrimestre } = body as { notasPorTrimestre: Record<string, NotaBatch[]> }

        if (!notasPorTrimestre || typeof notasPorTrimestre !== 'object') {
            return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 })
        }

        console.log('📦 Guardando notas batch para aula:', aulaId)
        console.log('📊 Trimestres recibidos:', Object.keys(notasPorTrimestre))

        // Obtener información del aula y profesor para centralización
        const profesorQuery = await executeQuery<any[]>(
            "SELECT id_profesor FROM profesores WHERE id_usuario = ?",
            [session.user.id]
        )
        
        if (!profesorQuery.length) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 })
        }
        
        const profesorId = profesorQuery[0].id_profesor

        // Obtener información completa del aula
        const aulaQuery = await executeQuery<any[]>(
            `SELECT ap.id_colegio, ap.id_nivel, ap.id_curso, ap.id_paralelo, ap.id_materia, ap.id_gestion
             FROM aulas_profesor ap
             WHERE ap.id_aula_profesor = ? AND ap.id_profesor = ?`,
            [aulaId, profesorId]
        )

        if (!aulaQuery.length) {
            return NextResponse.json({ error: "Aula no encontrada" }, { status: 404 })
        }

        const aulaInfo = aulaQuery[0]

        let totalGuardadas = 0
        const trimestresGuardados: number[] = []

        // Procesar cada trimestre
        for (const [trimestreStr, notasArray] of Object.entries(notasPorTrimestre)) {
            const trimestre = parseInt(trimestreStr)
            
            if (!notasArray || notasArray.length === 0) {
                console.log(`⏭️ Trimestre ${trimestre}: sin notas, saltando`)
                continue
            }

            console.log(`💾 Guardando ${notasArray.length} notas modificadas del trimestre ${trimestre}`)

            // 1️⃣ GUARDAR SOLO LAS NOTAS MODIFICADAS
            for (const nota of notasArray) {
                // Verificar si ya existe la nota
                const existente = await executeQuery<any[]>(
                    "SELECT id_nota_aula_profesor FROM notas_aula_profesor WHERE id_inscripcion = ? AND trimestre = ?",
                    [nota.id_inscripcion, trimestre]
                )

                if (existente.length > 0) {
                    // Actualizar nota existente
                    await executeQuery(
                        `UPDATE notas_aula_profesor SET 
                            nota_ser = ?,
                            nota_saber = ?,
                            nota_hacer = ?,
                            nota_decidir = ?,
                            nota_autoevaluacion = ?,
                            promedio_final_trimestre = ?
                        WHERE id_inscripcion = ? AND trimestre = ?`,
                        [
                            nota.nota_ser || 0,
                            nota.nota_saber || 0,
                            nota.nota_hacer || 0,
                            nota.nota_decidir || 0,
                            nota.nota_autoevaluacion || 0,
                            nota.promedio_final_trimestre || 0,
                            nota.id_inscripcion,
                            trimestre
                        ]
                    )
                } else {
                    // Insertar nueva nota
                    await executeQuery(
                        `INSERT INTO notas_aula_profesor (
                            id_inscripcion,
                            trimestre,
                            nota_ser,
                            nota_saber,
                            nota_hacer,
                            nota_decidir,
                            nota_autoevaluacion,
                            promedio_final_trimestre
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            nota.id_inscripcion,
                            trimestre,
                            nota.nota_ser || 0,
                            nota.nota_saber || 0,
                            nota.nota_hacer || 0,
                            nota.nota_decidir || 0,
                            nota.nota_autoevaluacion || 0,
                            nota.promedio_final_trimestre || 0
                        ]
                    )
                }

                totalGuardadas++
            }

            // 2️⃣ CENTRALIZAR TODAS LAS NOTAS DEL AULA/TRIMESTRE (no solo las modificadas)
            console.log(`🔄 Centralizando TODAS las notas del trimestre ${trimestre}...`)
            
            // Obtener TODAS las notas del aula/trimestre (con promedio > 0)
            const todasLasNotas = await executeQuery<any[]>(
                `SELECT nap.id_inscripcion, nap.promedio_final_trimestre, ia.id_estudiante
                 FROM notas_aula_profesor nap
                 JOIN inscripciones_aula ia ON nap.id_inscripcion = ia.id_inscripcion
                 WHERE ia.id_aula_profesor = ? 
                 AND nap.trimestre = ?
                 AND nap.promedio_final_trimestre > 0`,
                [aulaId, trimestre]
            )

            console.log(`📤 Centralizando ${todasLasNotas.length} notas del trimestre ${trimestre}`)

            for (const nota of todasLasNotas) {
                // Verificar si ya existe en centralización
                const centralCheck = await executeQuery<any[]>(
                    `SELECT id_centralizacion_nota 
                     FROM centralizacion_notas 
                     WHERE id_colegio = ? AND id_nivel = ? AND id_curso = ? 
                     AND id_paralelo = ? AND id_estudiante = ? 
                     AND trimestre = ? AND id_materia = ?`,
                    [
                        aulaInfo.id_colegio,
                        aulaInfo.id_nivel,
                        aulaInfo.id_curso,
                        aulaInfo.id_paralelo,
                        nota.id_estudiante,
                        trimestre,
                        aulaInfo.id_materia
                    ]
                )

                if (centralCheck.length > 0) {
                    // Actualizar centralización existente
                    await executeQuery(
                        `UPDATE centralizacion_notas 
                         SET nota_final_materia = ?, 
                             fecha_ultima_modificacion = NOW(),
                             id_profesor_centralizador = ?
                         WHERE id_centralizacion_nota = ?`,
                        [
                            nota.promedio_final_trimestre,
                            profesorId,
                            centralCheck[0].id_centralizacion_nota
                        ]
                    )
                } else {
                    // Insertar nueva centralización
                    await executeQuery(
                        `INSERT INTO centralizacion_notas (
                            id_profesor_centralizador,
                            id_colegio,
                            id_nivel,
                            id_curso,
                            id_paralelo,
                            id_estudiante,
                            trimestre,
                            id_materia,
                            nota_final_materia
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            profesorId,
                            aulaInfo.id_colegio,
                            aulaInfo.id_nivel,
                            aulaInfo.id_curso,
                            aulaInfo.id_paralelo,
                            nota.id_estudiante,
                            trimestre,
                            aulaInfo.id_materia,
                            nota.promedio_final_trimestre
                        ]
                    )
                }
            }

            trimestresGuardados.push(trimestre)
        }

        console.log(`✅ Total guardadas: ${totalGuardadas} notas en ${trimestresGuardados.length} trimestre(s)`)

        return NextResponse.json({
            success: true,
            totalGuardadas,
            trimestresGuardados,
            message: `Notas de ${trimestresGuardados.length} trimestre(s) guardadas correctamente`
        })

    } catch (error) {
        console.error("Error guardando notas batch:", error)
        return NextResponse.json(
            { error: "Error al guardar las notas" },
            { status: 500 }
        )
    }
}
