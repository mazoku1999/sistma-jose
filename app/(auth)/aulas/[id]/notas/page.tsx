"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-provider"
import {
    ArrowLeft,
    Check,
    X,
    Users,
    Loader2,
    Save,
    Settings,
    Calculator,
    TrendingUp,
    Award,
    AlertTriangle,
    Send,
    Download,
    FileSpreadsheet,
    ChevronDown,
    BarChart3,
    FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    exportNotasToExcel,
    createNotasImportTemplate,
    importNotasFromExcel,
    calcularPuntajeTrimestral,
    tokenizeName,
    type AulaInfo,
    type NotaEstudiante
} from "@/lib/excel-utils"

interface Estudiante {
    id: number
    inscripcion_id: number
    nombres?: string
    apellido_paterno?: string
    apellido_materno?: string
    nombre_completo: string
    situacion?: string
}

interface Nota {
    id_inscripcion: number
    trimestre: number
    nota_ser: number
    nota_saber: number
    nota_hacer: number
    nota_decidir: number
    nota_autoevaluacion: number
    promedio_final_trimestre: number
}

interface Aula {
    id: number
    nombre_aula: string
    colegio: string
    nivel: string
    curso: string
    paralelo: string
    materia: string
    id_gestion?: number
    gestion_activa?: boolean
    gestion_nombre?: string
    es_tutor?: boolean
}

export default function NotasPage() {
    const params = useParams()
    const router = useRouter()
    const aulaId = params?.id
    const { toast } = useToast()
    const { user } = useAuth()

    // Definición local de trimestres
    const trimestres = {
        '1': { label: '1er Trimestre', icon: '🌱', periodo: '5 Feb - 10 May' },
        '2': { label: '2do Trimestre', icon: '☀️', periodo: '13 May - 30 Ago' },
        '3': { label: '3er Trimestre', icon: '🍂', periodo: '2 Sep - 10 Dic' }
    }
    const puedeCentralizar = user?.roles.includes("ADMIN") || !!user?.profesor?.puede_centralizar_notas

    const [aula, setAula] = useState<Aula | null>(null)
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
    const [notas, setNotas] = useState<Record<number, Nota>>({})
    const [notasPorTrimestre, setNotasPorTrimestre] = useState<Record<number, Record<number, Nota>>>({ 1: {}, 2: {}, 3: {} })
    const [notasPorTrimestreInicial, setNotasPorTrimestreInicial] = useState<Record<number, Record<number, Nota>>>({ 1: {}, 2: {}, 3: {} }) // Snapshot inicial
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [hasChanges, setHasChanges] = useState(false)
    const [trimestresHabilitados, setTrimestresHabilitados] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false })
    const [isLoadingTrimestres, setIsLoadingTrimestres] = useState(true)
    const [showTrimestreSelector, setShowTrimestreSelector] = useState(false)
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [selectedTrimestreImport, setSelectedTrimestreImport] = useState<number | null>(null)

    // Debug: Monitorear cambios en trimestresHabilitados
    useEffect(() => {
        console.log('📊 Estado trimestresHabilitados actualizado:', trimestresHabilitados)
    }, [trimestresHabilitados])



    const getNotaColor = (nota: number) => {
        if (nota >= 90) return "text-green-600 bg-green-50"
        if (nota >= 80) return "text-blue-600 bg-blue-50"
        if (nota >= 70) return "text-yellow-600 bg-yellow-50"
        if (nota >= 60) return "text-orange-600 bg-orange-50"
        return "text-red-600 bg-red-50"
    }

    const getNotaLabel = (nota: number) => {
        if (nota >= 90) return "Excelente"
        if (nota >= 80) return "Muy Bueno"
        if (nota >= 70) return "Bueno"
        if (nota >= 60) return "Regular"
        return "Insuficiente"
    }

    const normalizeValue = (value: string | undefined | null) => (value ?? '').toString().trim()

    const deriveNames = (est: Estudiante) => {
        const nombres = normalizeValue(est.nombres)
        const apellido_paterno = normalizeValue(est.apellido_paterno)
        const apellido_materno = normalizeValue(est.apellido_materno)

        if (nombres || apellido_paterno || apellido_materno) {
            return { nombres, apellido_paterno, apellido_materno }
        }

        const nombreCompleto = normalizeValue(est.nombre_completo)
        const parts = nombreCompleto.split(/\s+/).filter(Boolean)

        if (parts.length >= 3) {
            return {
                nombres: parts.slice(0, parts.length - 2).join(' '),
                apellido_paterno: parts[parts.length - 2] || '',
                apellido_materno: parts[parts.length - 1] || '',
            }
        }

        if (parts.length === 2) {
            return {
                nombres: parts[0],
                apellido_paterno: '',
                apellido_materno: parts[1],
            }
        }

        if (parts.length === 1) {
            return {
                nombres: nombreCompleto,
                apellido_paterno: '',
                apellido_materno: '',
            }
        }

        return {
            nombres: '',
            apellido_paterno: '',
            apellido_materno: '',
        }
    }

    useEffect(() => {
        if (!aulaId || aulaId === 'undefined') {
            router.push('/aulas')
            return
        }
        fetchAula()
    }, [aulaId, router])

    useEffect(() => {
        if (aula) {
            fetchEstudiantes()
        }
    }, [aula])

    useEffect(() => {
        if (estudiantes.length > 0) {
            fetchNotasTodas()
        }
    }, [estudiantes])

    useEffect(() => {
        // Cargar trimestres habilitados al montar el componente
        fetchTrimestresHabilitados()
    }, [])

    const fetchTrimestresHabilitados = async () => {
        try {
            setIsLoadingTrimestres(true)
            const response = await fetch('/api/profesores/trimestres-habilitados')
            if (response.ok) {
                const data = await response.json()
                console.log('🔍 TRIMESTRES HABILITADOS DESDE API:', data.trimestres_habilitados)
                setTrimestresHabilitados(data.trimestres_habilitados)
            } else {
                console.error('❌ Error en API trimestres:', response.status)
            }
        } catch (error) {
            console.error("Error al cargar trimestres habilitados:", error)
        } finally {
            setIsLoadingTrimestres(false)
        }
    }

    const fetchAula = async () => {
        if (!aulaId) return
        try {
            const response = await fetch(`/api/aulas/${aulaId}`)
            if (response.ok) {
                const data = await response.json()
                setAula(data)
            }
        } catch (error) {
            console.error("Error al cargar aula:", error)
        }
    }

    const fetchEstudiantes = async () => {
        if (!aulaId) return
        setIsLoading(true)
        try {
            const response = await fetch(`/api/aulas/${aulaId}/estudiantes`)
            if (response.ok) {
                const data = await response.json()
                setEstudiantes(data)
            } else {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los estudiantes",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al cargar estudiantes:", error)
            toast({
                title: "Error",
                description: "Error al cargar los estudiantes",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const fetchNotasTodas = async () => {
        if (!aulaId) return {}
        try {
            const [r1, r2, r3] = await Promise.all([
                fetch(`/api/aulas/${aulaId}/notas?trimestre=1`),
                fetch(`/api/aulas/${aulaId}/notas?trimestre=2`),
                fetch(`/api/aulas/${aulaId}/notas?trimestre=3`),
            ])
            const [d1, d2, d3] = await Promise.all([r1.ok ? r1.json() : [], r2.ok ? r2.json() : [], r3.ok ? r3.json() : []])

            const normalize = (entry: any): Nota => ({
                id_inscripcion: Number(entry.id_inscripcion),
                trimestre: Number(entry.trimestre),
                nota_ser: Number(entry.nota_ser ?? 0),
                nota_saber: Number(entry.nota_saber ?? 0),
                nota_hacer: Number(entry.nota_hacer ?? 0),
                nota_decidir: Number(entry.nota_decidir ?? 0),
                nota_autoevaluacion: Number(entry.nota_autoevaluacion ?? 0),
                promedio_final_trimestre: Number(entry.promedio_final_trimestre ?? 0),
            })

            const map1: Record<number, Nota> = {}
            const map2: Record<number, Nota> = {}
            const map3: Record<number, Nota> = {}

            d1.forEach((n: any) => {
                const normalized = normalize(n)
                map1[normalized.id_inscripcion] = normalized
            })
            d2.forEach((n: any) => {
                const normalized = normalize(n)
                map2[normalized.id_inscripcion] = normalized
            })
            d3.forEach((n: any) => {
                const normalized = normalize(n)
                map3[normalized.id_inscripcion] = normalized
            })

            const notasCompletas = { 1: map1, 2: map2, 3: map3 }
            setNotasPorTrimestre(notasCompletas)
            
            // Guardar snapshot inicial (copia profunda) para comparar cambios
            setNotasPorTrimestreInicial(JSON.parse(JSON.stringify(notasCompletas)))
            
            // Sincronizar con el primer trimestre disponible (para vista inicial)
            // Los inputs editables se controlan por trimestresHabilitados
            const firstMap = map1
            setNotas({ ...firstMap })
            return firstMap
        } catch (error) {
            console.error("Error al cargar notas:", error)
        }
        return {}
    }


    // Helper específico para tutores que siempre muestra los valores correctos
    const renderTutorDimensionCell = (
        inscripcionId: number,
        trimestre: number,
        dimension: 'nota_ser' | 'nota_saber' | 'nota_hacer' | 'nota_decidir' | 'nota_autoevaluacion',
        valor: number,
        bgColor: string
    ) => {
        // Los tutores pueden editar todos los trimestres
        // Los profesores solo los habilitados por el admin
        const esEditable = aula?.es_tutor || (!isLoadingTrimestres && trimestresHabilitados[trimestre])

        // Debug: Ver qué está evaluando
        if (inscripcionId === 1) { // Solo log para el primer estudiante
            console.log(`🎯 T${trimestre} - editable:`, esEditable, 'tutor:', aula?.es_tutor, 'loading:', isLoadingTrimestres, 'habilitado:', trimestresHabilitados[trimestre])
        }

        return (
            <TableCell className={`text-center ${bgColor}`}>
                {esEditable ? (
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0"
                        value={valor || ""}
                        onChange={(e) => handleTrimestreDimensionChange(inscripcionId, trimestre, dimension, e.target.value)}
                        className="w-14 text-center text-xs h-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                ) : (
                    <span className="text-xs text-gray-600">{valor || ""}</span>
                )}
            </TableCell>
        )
    }

    const sortedEstudiantes = useMemo(() => {
        return [...estudiantes].sort((a, b) => {
            const da = deriveNames(a)
            const db = deriveNames(b)

            const grupoA = da.apellido_paterno ? 1 : 0
            const grupoB = db.apellido_paterno ? 1 : 0
            if (grupoA !== grupoB) return grupoA - grupoB

            const campos = grupoA === 0
                ? ['apellido_materno', 'nombres']
                : ['apellido_paterno', 'apellido_materno', 'nombres']

            for (const campo of campos) {
                const va = normalizeValue(da[campo as keyof typeof da]).toLocaleLowerCase()
                const vb = normalizeValue(db[campo as keyof typeof db]).toLocaleLowerCase()
                const cmp = va.localeCompare(vb, 'es', { sensitivity: 'base' })
                if (cmp !== 0) return cmp
            }

            return 0
        })
    }, [estudiantes])

    // Función handleDimensionChange eliminada - no se usaba

    // Función para actualizar dimensiones por trimestre específico (para tutores)
    const handleTrimestreDimensionChange = (
        inscripcionId: number,
        trimestre: number,
        dimension: 'nota_ser' | 'nota_saber' | 'nota_hacer' | 'nota_decidir' | 'nota_autoevaluacion',
        valor: string
    ) => {
        const notaActual = notasPorTrimestre[trimestre]?.[inscripcionId] || {
            id_inscripcion: inscripcionId,
            trimestre,
            nota_ser: 0,
            nota_saber: 0,
            nota_hacer: 0,
            nota_decidir: 0,
            nota_autoevaluacion: 0,
            promedio_final_trimestre: 0
        }

        if (valor.trim() === "") {
            valor = "0"
        }

        const nota = Number(valor)
        if (!Number.isFinite(nota)) {
            return
        }

        const bounded = Math.max(0, Math.min(100, nota))

        const notaActualizada = {
            ...notaActual,
            id_inscripcion: inscripcionId,
            trimestre,
            [dimension]: bounded
        }

        notaActualizada.promedio_final_trimestre = calcularPuntajeTrimestral(
            notaActualizada.nota_ser,
            notaActualizada.nota_saber,
            notaActualizada.nota_hacer,
            notaActualizada.nota_decidir,
            notaActualizada.nota_autoevaluacion
        )

        setNotasPorTrimestre(prev => ({
            ...prev,
            [trimestre]: { ...(prev[trimestre] || {}), [inscripcionId]: notaActualizada }
        }))
        setHasChanges(true)
    }

    const handleGuardarNotas = async () => {
        if (!aulaId || !hasChanges) return
        if (!puedeCentralizar) {
            toast({
                title: "Permiso requerido",
                description: "No tienes permisos para guardar notas en esta aula.",
                variant: "destructive",
            })
            return
        }

        setIsSaving(true)
        try {
            // Función para comparar si dos notas son diferentes
            const sonDiferentes = (nota1: Nota | undefined, nota2: Nota | undefined): boolean => {
                if (!nota1 && !nota2) return false
                if (!nota1 || !nota2) return true
                
                return (
                    nota1.nota_ser !== nota2.nota_ser ||
                    nota1.nota_saber !== nota2.nota_saber ||
                    nota1.nota_hacer !== nota2.nota_hacer ||
                    nota1.nota_decidir !== nota2.nota_decidir ||
                    nota1.nota_autoevaluacion !== nota2.nota_autoevaluacion ||
                    nota1.promedio_final_trimestre !== nota2.promedio_final_trimestre
                )
            }

            // Preparar solo las notas que cambiaron
            const notasParaGuardar: Record<string, any[]> = {}

            if (aula?.es_tutor) {
                // TUTOR: Preparar notas modificadas de los 3 trimestres
                for (let trimestre = 1; trimestre <= 3; trimestre++) {
                    const notasTrimestre = notasPorTrimestre[trimestre] || {}
                    const notasInicialesTrimestre = notasPorTrimestreInicial[trimestre] || {}
                    
                    const notasModificadas = Object.values(notasTrimestre).filter(nota => {
                        const notaInicial = notasInicialesTrimestre[nota.id_inscripcion]
                        return sonDiferentes(nota, notaInicial) &&
                               nota.promedio_final_trimestre >= 0 && 
                               nota.promedio_final_trimestre <= 100
                    })

                    if (notasModificadas.length > 0) {
                        notasParaGuardar[trimestre] = notasModificadas
                        console.log(`✏️ Trimestre ${trimestre}: ${notasModificadas.length} notas modificadas`)
                    }
                }
            } else {
                // PROFESOR: Preparar solo trimestres habilitados y modificados
                console.log('🔍 Guardando notas - Trimestres habilitados:', trimestresHabilitados)

                for (let t = 1; t <= 3; t++) {
                    if (!trimestresHabilitados[t]) {
                        console.log(`⏭️ Trimestre ${t} NO habilitado - saltando`)
                        continue
                    }

                    const notasMap = notasPorTrimestre[t] || {}
                    const notasInicialesMap = notasPorTrimestreInicial[t] || {}
                    
                    const notasModificadas = Object.values(notasMap).filter(nota => {
                        const notaInicial = notasInicialesMap[nota.id_inscripcion]
                        return sonDiferentes(nota, notaInicial) &&
                               nota.promedio_final_trimestre >= 0 && 
                               nota.promedio_final_trimestre <= 100
                    })

                    console.log(`📊 Trimestre ${t}: ${notasModificadas.length} notas modificadas`)

                    if (notasModificadas.length > 0) {
                        notasParaGuardar[t] = notasModificadas
                    }
                }
            }

            // Verificar que hay algo que guardar
            const totalTrimestres = Object.keys(notasParaGuardar).length
            if (totalTrimestres === 0) {
                toast({
                    title: "Sin cambios",
                    description: "No hay notas para guardar",
                    variant: "destructive",
                })
                return
            }

            console.log(`📦 Enviando batch con ${totalTrimestres} trimestre(s)`)

            // Enviar todas las notas en una sola petición
            const response = await fetch(`/api/aulas/${aulaId}/notas/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notasPorTrimestre: notasParaGuardar
                })
            })

            if (!response.ok) {
                throw new Error('Error guardando notas')
            }

            const result = await response.json()

            // Construir mensaje detallado con los trimestres guardados
            const trimestresGuardadosNumeros = result.trimestresGuardados || Object.keys(notasParaGuardar).map(Number)
            const trimestresTexto = trimestresGuardadosNumeros.length === 1 
                ? `Trimestre ${trimestresGuardadosNumeros[0]}`
                : `Trimestres ${trimestresGuardadosNumeros.join(', ')}`
            
            const totalNotasGuardadas = Object.values(notasParaGuardar).reduce((sum: number, notas: any) => sum + notas.length, 0)

            toast({
                title: "✅ Éxito",
                description: `${totalNotasGuardadas} nota(s) del ${trimestresTexto} guardadas correctamente`,
            })

            setHasChanges(false)
            
            // Actualizar el snapshot inicial con el estado actual (después de guardar)
            setNotasPorTrimestreInicial(JSON.parse(JSON.stringify(notasPorTrimestre)))
            
            await fetchNotasTodas()

        } catch (error: any) {
            console.error("Error al guardar notas:", error)
            toast({
                title: "Error",
                description: error?.message || "Error al guardar las notas",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }


    const handleImportClick = () => {
        // Verificar trimestres habilitados
        const habilitados = Object.entries(trimestresHabilitados)
            .filter(([_, enabled]) => enabled)
            .map(([t]) => parseInt(t))

        if (habilitados.length === 0) {
            toast({
                title: "Sin permisos",
                description: "No tienes trimestres habilitados para importar notas",
                variant: "destructive"
            })
            return
        }

        // Si hay solo 1 trimestre habilitado, seleccionarlo automáticamente
        if (habilitados.length === 1) {
            setSelectedTrimestreImport(habilitados[0])
            fileInputRef.current?.click()
        } else {
            // Múltiples trimestres: mostrar selector
            setShowTrimestreSelector(true)
        }
    }

    const handleTrimestreSelected = (trimestre: number) => {
        setSelectedTrimestreImport(trimestre)
        setShowTrimestreSelector(false)
        fileInputRef.current?.click()
    }

    const handleImportNotasFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!selectedTrimestreImport) {
            toast({ title: "Error", description: "No se seleccionó trimestre", variant: "destructive" })
            e.target.value = ""
            return
        }
        try {
            setIsImporting(true)

            if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
                toast({ title: "Sin lista", description: "Aún no se cargan los estudiantes del aula", variant: "destructive" })
                return
            }

            // Importar notas usando la función de excel-utils
            // Fila 12 en Excel = índice 11 (0-indexed)
            const notasImportadas = await importNotasFromExcel(file, 11)

            console.log(`👥 ${estudiantes.length} estudiantes en el aula`)
            console.log('📋 Primeros 3 estudiantes:', estudiantes.slice(0, 3).map(e => ({
                nombres: e.nombres,
                ap_paterno: e.apellido_paterno,
                ap_materno: e.apellido_materno,
                completo: e.nombre_completo
            })))

            // Construir mapa de estudiantes para matching
            const matchMap = new Map<string, { inscripcion_id: number; id: number }>()
            const candidates: { key: string; tokens: string[]; inscripcion_id: number; id: number }[] = []

            for (const est of estudiantes) {
                // Formato 1: Nombres + Apellidos
                const full = `${est.nombres || ''} ${est.apellido_paterno || ''} ${est.apellido_materno || ''}`.trim()
                // Formato 2: Apellidos + Nombres
                const alt = `${est.apellido_paterno || ''} ${est.apellido_materno || ''} ${est.nombres || ''}`.trim()
                // Formato 3: nombre_completo tal cual viene de la BD
                const completo = est.nombre_completo || ''

                const t1 = tokenizeName(full)
                const t2 = tokenizeName(alt)
                const t3 = tokenizeName(completo)

                const k1 = t1.join(' ')
                const k2 = t2.join(' ')
                const k3 = t3.join(' ')
                const ks = t1.slice().sort().join(' ')

                // Agregar todas las variaciones posibles
                if (k1) matchMap.set(k1, { inscripcion_id: est.inscripcion_id, id: est.id })
                if (k2) matchMap.set(k2, { inscripcion_id: est.inscripcion_id, id: est.id })
                if (k3) matchMap.set(k3, { inscripcion_id: est.inscripcion_id, id: est.id })
                if (ks) matchMap.set(ks, { inscripcion_id: est.inscripcion_id, id: est.id })

                // Agregar a candidatos con más tokens
                const allTokens = [...new Set([...t1, ...t2, ...t3])]
                candidates.push({
                    key: k1 || k3 || k2,
                    tokens: allTokens.length ? allTokens : t1,
                    inscripcion_id: est.inscripcion_id,
                    id: est.id
                })
            }

            console.log(`🔑 ${matchMap.size} combinaciones de nombres en el mapa`)

            let matched = 0
            let notFound = 0
            const updates: Record<number, Nota> = {}
            const t = selectedTrimestreImport

            for (const notaImportada of notasImportadas) {
                const tokens = tokenizeName(notaImportada.nombre)
                const keyA = tokens.join(' ')
                const keyB = tokens.slice().sort().join(' ')

                console.log(`🔎 Buscando match para: "${notaImportada.nombre}"`)
                console.log(`   Tokens: [${tokens.join(', ')}]`)
                console.log(`   KeyA: "${keyA}"`)
                console.log(`   KeyB: "${keyB}"`)

                let target = matchMap.get(keyA) || matchMap.get(keyB)
                console.log(`   Match directo: ${target ? '✅ SI' : '❌ NO'}`)

                // Fallback: búsqueda difusa con intersección de tokens
                if (!target && tokens.length) {
                    let best: { c: number; inscripcion_id: number; id: number } | null = null
                    const tokSet = new Set(tokens)
                    for (const c of candidates) {
                        let inter = 0
                        for (const tkn of c.tokens) if (tokSet.has(tkn)) inter++
                        if (inter >= 2) {
                            if (!best || inter > best.c) {
                                best = { c: inter, inscripcion_id: c.inscripcion_id, id: c.id }
                            }
                        }
                    }
                    if (best) {
                        target = { inscripcion_id: best.inscripcion_id, id: best.id }
                        console.log(`   Match difuso: ✅ SI (${best.c} tokens en común)`)
                    }
                }

                if (!target) {
                    console.log(`   ❌ NO SE ENCONTRÓ MATCH`)
                    notFound++
                    continue
                }

                console.log(`   ✅ MATCH EXITOSO!`)

                // Crear nota con todas las dimensiones
                const puntaje = calcularPuntajeTrimestral(
                    notaImportada.nota_ser,
                    notaImportada.nota_saber,
                    notaImportada.nota_hacer,
                    notaImportada.nota_decidir,
                    notaImportada.nota_autoevaluacion || 0
                )

                updates[target.inscripcion_id] = {
                    id_inscripcion: target.inscripcion_id,
                    trimestre: t,
                    nota_ser: notaImportada.nota_ser,
                    nota_saber: notaImportada.nota_saber,
                    nota_hacer: notaImportada.nota_hacer,
                    nota_decidir: notaImportada.nota_decidir,
                    nota_autoevaluacion: notaImportada.nota_autoevaluacion || 0,
                    promedio_final_trimestre: puntaje
                }
                matched++
            }

            if (matched === 0) {
                toast({
                    title: "Sin coincidencias",
                    description: `No se encontraron estudiantes coincidentes. No se importó nada.`,
                    variant: "destructive"
                })
            } else {
                // Aplicar a estado local y marcar cambios
                setNotas((prev) => ({ ...prev, ...updates }))
                setNotasPorTrimestre((prev) => ({
                    ...prev,
                    [t]: { ...(prev[t] || {}), ...updates }
                }))
                setHasChanges(true)

                toast({
                    title: "Importación preparada",
                    description: `${matched} coincidentes. ${notFound} no encontrados. Revisa y guarda.`
                })
            }
        } catch (err: any) {
            console.error("Error importando notas:", err)
            toast({
                title: "Error al importar",
                description: err?.message || "Archivo inválido",
                variant: "destructive"
            })
        } finally {
            setIsImporting(false)
            e.target.value = ""
        }
    }

    const handleCentralizarNotas = async () => {
        // Mantener función para compatibilidad si se requiere manualmente en el futuro
        toast({
            title: "Operación automática",
            description: "Las notas se centralizan automáticamente al guardar.",
        })
    }

    const handleExportarDimensiones = async () => {
        if (estudiantes.length === 0) {
            toast({
                title: "Sin datos",
                description: "No hay estudiantes para exportar",
                variant: "destructive",
            })
            return
        }

        setIsExporting(true)
        try {
            // Preparar datos de estudiantes para la API de dimensiones
            const estudiantesParaExportar = estudiantes.map((estudiante) => {
                const notaT1 = notasPorTrimestre['1']?.[estudiante.inscripcion_id] || {
                    nota_ser: 0, nota_saber: 0, nota_hacer: 0, nota_decidir: 0, nota_autoevaluacion: 0
                }
                const notaT2 = notasPorTrimestre['2']?.[estudiante.inscripcion_id] || {
                    nota_ser: 0, nota_saber: 0, nota_hacer: 0, nota_decidir: 0, nota_autoevaluacion: 0
                }
                const notaT3 = notasPorTrimestre['3']?.[estudiante.inscripcion_id] || {
                    nota_ser: 0, nota_saber: 0, nota_hacer: 0, nota_decidir: 0, nota_autoevaluacion: 0
                }

                return {
                    apellidoPaterno: estudiante.apellido_paterno || '',
                    apellidoMaterno: estudiante.apellido_materno || '',
                    nombres: estudiante.nombres || '',
                    situacion: 'E',
                    // Primer trimestre
                    ser1: notaT1.nota_ser || 0,
                    saber1: notaT1.nota_saber || 0,
                    hacer1: notaT1.nota_hacer || 0,
                    decidir1: notaT1.nota_decidir || 0,
                    evaluacion1: notaT1.nota_autoevaluacion || 0,
                    // Segundo trimestre
                    ser2: notaT2.nota_ser || 0,
                    saber2: notaT2.nota_saber || 0,
                    hacer2: notaT2.nota_hacer || 0,
                    decidir2: notaT2.nota_decidir || 0,
                    evaluacion2: notaT2.nota_autoevaluacion || 0,
                    // Tercer trimestre
                    ser3: notaT3.nota_ser || 0,
                    saber3: notaT3.nota_saber || 0,
                    hacer3: notaT3.nota_hacer || 0,
                    decidir3: notaT3.nota_decidir || 0,
                    evaluacion3: notaT3.nota_autoevaluacion || 0
                }
            })

            const datosEncabezado = {
                gestion: aula?.gestion_nombre || 'GESTIÓN 2024',
                unidadEducativa: aula?.colegio || 'UNIDAD EDUCATIVA',
                nivel: aula?.nivel || 'NIVEL',
                curso: `${aula?.curso || ''} ${aula?.paralelo || ''}`.trim() || 'CURSO',
                materia: aula?.materia || 'MATERIA',
                docente: user?.nombre_completo || 'DOCENTE'
            }

            const response = await fetch("/api/exportar-dimensiones", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    estudiantes: estudiantesParaExportar,
                    datosEncabezado
                }),
            })

            if (!response.ok) {
                throw new Error("Error al generar el archivo")
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `dimensiones-${aula?.nombre_aula}-${new Date().toISOString().split("T")[0]}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast({
                title: "✅ Archivo generado",
                description: "El archivo Excel de dimensiones se descargó correctamente",
            })
        } catch (error) {
            console.error("Error al exportar dimensiones:", error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Error al generar el archivo",
                variant: "destructive",
            })
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportarNotas = async () => {
        if (estudiantes.length === 0) {
            toast({
                title: "Sin datos",
                description: "No hay estudiantes para exportar",
                variant: "destructive",
            })
            return
        }

        setIsExporting(true)
        try {
            // Preparar datos de estudiantes para la API
            const estudiantesParaExportar = estudiantes.map(estudiante => {
                const notaT1 = notasPorTrimestre['1']?.[estudiante.inscripcion_id] || { promedio_final_trimestre: 0 }
                const notaT2 = notasPorTrimestre['2']?.[estudiante.inscripcion_id] || { promedio_final_trimestre: 0 }
                const notaT3 = notasPorTrimestre['3']?.[estudiante.inscripcion_id] || { promedio_final_trimestre: 0 }

                // Derivar nombres y apellidos
                const { nombres, apellido_paterno, apellido_materno } = deriveNames(estudiante)

                console.log('📋 Exportando estudiante:', {
                    original: estudiante,
                    derivado: { nombres, apellido_paterno, apellido_materno }
                })

                return {
                    apellidos: [apellido_paterno, apellido_materno].filter(Boolean).join(' '),
                    nombres: nombres || '',
                    situacion: estudiante.situacion || 'E',
                    notaTrimestre1: notaT1.promedio_final_trimestre || 0,
                    notaTrimestre2: notaT2.promedio_final_trimestre || 0,
                    notaTrimestre3: notaT3.promedio_final_trimestre || 0
                }
            })

            const response = await fetch("/api/exportar-promedios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    estudiantes: estudiantesParaExportar,
                    aulaInfo: {
                        gestion: aula?.gestion_nombre || 'GESTIÓN 2024',
                        unidadEducativa: aula?.colegio || 'UNIDAD EDUCATIVA',
                        nivel: aula?.nivel || 'NIVEL',
                        curso: `${aula?.curso || ''} ${aula?.paralelo || ''}`.trim() || 'CURSO',
                        materia: aula?.materia || 'MATERIA'
                    },
                    docenteInfo: {
                        nombre_completo: user?.nombre_completo || 'DOCENTE'
                    }
                }),
            })

            if (!response.ok) {
                throw new Error("Error al generar el archivo")
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `promedios-${aula?.nombre_aula}-${new Date().toISOString().split("T")[0]}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast({
                title: "✅ Archivo generado",
                description: "El archivo Excel se descargó correctamente",
            })
        } catch (error) {
            console.error("Error al exportar:", error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Error al generar el archivo",
                variant: "destructive",
            })
        } finally {
            setIsExporting(false)
        }
    }

    const handleDownloadTemplate = () => {
        if (!aula) return

        // Usar el primer trimestre habilitado para el template
        const primerHabilitado = [1, 2, 3].find(t => trimestresHabilitados[t])
        if (!primerHabilitado) {
            toast({
                title: "Sin permisos",
                description: "No tienes trimestres habilitados",
                variant: "destructive",
            })
            return
        }

        const aulaInfo: AulaInfo = {
            nombre_aula: aula.nombre_aula,
            colegio: aula.colegio,
            nivel: aula.nivel,
            curso: aula.curso,
            paralelo: aula.paralelo,
            materia: aula.materia
        }

        try {
            const result = createNotasImportTemplate(aulaInfo, primerHabilitado)
            toast({
                title: "📋 Template descargado",
                description: `Archivo ${result.fileName} listo para usar`,
            })
        } catch (error) {
            console.error("Error al crear template:", error)
            toast({
                title: "Error",
                description: "Error al crear template",
                variant: "destructive",
            })
        }
    }

    const getEstadisticasNotas = () => {
        const total = estudiantes.length
        
        // Recopilar todas las notas de todos los trimestres (solo los habilitados para profesores)
        const todasLasNotas: number[] = []
        const estudiantesConNotas = new Set<number>()

        for (let t = 1; t <= 3; t++) {
            // Para profesores, solo contar trimestres habilitados
            if (!aula?.es_tutor && !trimestresHabilitados[t]) {
                continue
            }

            const notasTrimestre = notasPorTrimestre[t] || {}
            Object.entries(notasTrimestre).forEach(([inscripcionId, nota]) => {
                if (nota.promedio_final_trimestre > 0) {
                    todasLasNotas.push(nota.promedio_final_trimestre)
                    estudiantesConNotas.add(parseInt(inscripcionId))
                }
            })
        }

        const conNotas = estudiantesConNotas.size
        const sinNotas = total - conNotas

        if (todasLasNotas.length === 0) {
            return { total, conNotas, sinNotas, promedio: 0, aprobados: 0, reprobados: 0 }
        }

        const suma = todasLasNotas.reduce((acc, nota) => acc + nota, 0)
        const promedio = suma / todasLasNotas.length
        const aprobados = todasLasNotas.filter(n => n >= 51).length
        const reprobados = todasLasNotas.filter(n => n < 51).length

        return { total, conNotas, sinNotas, promedio, aprobados, reprobados }
    }

    const stats = getEstadisticasNotas()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando notas...</p>
                </div>
            </div>
        )
    }


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/aulas/${aulaId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Ingreso de Notas</h1>
                    <p className="text-muted-foreground">
                        {aula?.nombre_aula}
                    </p>
                </div>

            </div>

            <>
                <div className="flex justify-end gap-2">
                    {!!aula?.es_tutor && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    disabled={estudiantes.length === 0 || isExporting}
                                    title="Exportar notas (Solo tutores)"
                                >
                                    {isExporting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    {isExporting ? "Exportando..." : "Exportar"}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportarNotas}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Promedios
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportarDimensiones}>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Dimensiones
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {/* Template button - Comentado para uso futuro
                        {!!aula?.es_tutor && (
                            <Button
                                variant="outline"
                                onClick={handleDownloadTemplate}
                                title="Descargar template de importación (Solo tutores)"
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Template
                            </Button>
                        )}
                        */}
                    <Button
                        variant="outline"
                        onClick={handleImportClick}
                        disabled={isImporting}
                        title="Importar notas desde Excel"
                    >
                        {isImporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4 rotate-[-90deg]" />
                        )}
                        Importar Excel
                    </Button>
                    <Button
                        onClick={handleGuardarNotas}
                        disabled={!hasChanges || isSaving || !puedeCentralizar}
                        title={!puedeCentralizar ? "Necesitas permiso para guardar notas" : ""}
                    >
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Guardar Notas
                    </Button>

                    {/* Centralización manual eliminada: el guardado ya centraliza automáticamente */}
                </div>

                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">estudiantes</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Con Notas</CardTitle>
                            <Calculator className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.conNotas}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.total > 0 ? Math.round((stats.conNotas / stats.total) * 100) : 0}%
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Sin Notas</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.sinNotas}</div>
                            <p className="text-xs text-muted-foreground">pendientes</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                {stats.promedio.toFixed(1)}
                            </div>
                            <p className="text-xs text-muted-foreground">general</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
                            <Award className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.aprobados}</div>
                            <p className="text-xs text-muted-foreground">≥ 51 pts</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Reprobados</CardTitle>
                            <X className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.reprobados}</div>
                            <p className="text-xs text-muted-foreground">&lt; 51 pts</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Registro de Calificaciones
                        </CardTitle>

                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12 sticky left-0 bg-background z-10 border-r">#</TableHead>
                                        <TableHead className="min-w-[200px] sticky left-12 bg-background z-10 border-r">Estudiante</TableHead>
                                        {!!aula?.es_tutor ? (
                                            // Vista TUTOR: Todas las dimensiones de los 3 trimestres
                                            <>
                                                {[1, 2, 3].map(t => (
                                                    <TableHead key={t} colSpan={6} className={`text-center font-bold border-r-2 ${t === 1 ? "bg-blue-100" : t === 2 ? "bg-green-100" : "bg-purple-100"}`}>
                                                        TRIMESTRE {t}
                                                    </TableHead>
                                                ))}
                                            </>
                                        ) : (
                                            // Vista PROFESOR: Puntajes de los 3 trimestres (editables según permisos)
                                            <>
                                                {[1, 2, 3].map(t => {
                                                    const esHabilitado = trimestresHabilitados[t]
                                                    const bgColor = esHabilitado
                                                        ? (t === 1 ? "bg-blue-100" : t === 2 ? "bg-green-100" : "bg-purple-100")
                                                        : (t === 1 ? "bg-blue-50" : t === 2 ? "bg-green-50" : "bg-purple-50")
                                                    return (
                                                        <TableHead key={t} className={`text-center w-24 ${bgColor}`}>
                                                            PUNTAJE T{t} {esHabilitado && "✓"}
                                                        </TableHead>
                                                    )
                                                })}
                                            </>
                                        )}
                                    </TableRow>
                                    {!!aula?.es_tutor && (
                                        <TableRow>
                                            <TableHead className="w-12 sticky left-0 bg-background z-10 border-r"></TableHead>
                                            <TableHead className="min-w-[200px] sticky left-12 bg-background z-10 border-r"></TableHead>
                                            {!!aula?.es_tutor ? (
                                                // TUTOR: Sub-headers de los 3 trimestres
                                                <>
                                                    {[1, 2, 3].map(t => (
                                                        <React.Fragment key={t}>
                                                            <TableHead className={`text-center w-16 text-xs ${t === 1 ? "bg-blue-50" : t === 2 ? "bg-green-50" : "bg-purple-50"}`}>SER</TableHead>
                                                            <TableHead className={`text-center w-16 text-xs ${t === 1 ? "bg-blue-50" : t === 2 ? "bg-green-50" : "bg-purple-50"}`}>SABER</TableHead>
                                                            <TableHead className={`text-center w-16 text-xs ${t === 1 ? "bg-blue-50" : t === 2 ? "bg-green-50" : "bg-purple-50"}`}>HACER</TableHead>
                                                            <TableHead className={`text-center w-16 text-xs ${t === 1 ? "bg-blue-50" : t === 2 ? "bg-green-50" : "bg-purple-50"}`}>DECIDIR</TableHead>
                                                            <TableHead className={`text-center w-16 text-xs ${t === 1 ? "bg-blue-50" : t === 2 ? "bg-green-50" : "bg-purple-50"}`}>AUTO</TableHead>
                                                            <TableHead className={`text-center w-20 text-xs border-r-2 ${t === 1 ? "bg-blue-100" : t === 2 ? "bg-green-100" : "bg-purple-100"}`}>PUNTAJE</TableHead>
                                                        </React.Fragment>
                                                    ))}
                                                </>
                                            ) : (
                                                // PROFESOR: Solo headers vacíos
                                                <>
                                                    {[1, 2, 3].map(t => (
                                                        <TableHead key={t} className="w-24"></TableHead>
                                                    ))}
                                                </>
                                            )}
                                        </TableRow>
                                    )}
                                </TableHeader>
                                <TableBody>
                                    {sortedEstudiantes.map((estudiante, index) => {
                                        const { apellido_paterno, apellido_materno, nombres } = deriveNames(estudiante)

                                        return (
                                            <TableRow key={estudiante.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">{index + 1}</TableCell>
                                                <TableCell className="font-medium sticky left-12 bg-background z-10 border-r">
                                                    {[apellido_paterno, apellido_materno, nombres].filter(Boolean).join(' ')}
                                                </TableCell>

                                                {!!aula?.es_tutor ? (
                                                    // Vista TUTOR: Todas las dimensiones de los 3 trimestres
                                                    <>
                                                        {[1, 2, 3].map(t => {
                                                            const notaT = notasPorTrimestre[t]?.[estudiante.inscripcion_id] || {
                                                                nota_ser: 0, nota_saber: 0, nota_hacer: 0, nota_decidir: 0, nota_autoevaluacion: 0, promedio_final_trimestre: 0
                                                            }
                                                            const bgColor = t === 1 ? 'bg-blue-50' : t === 2 ? 'bg-green-50' : 'bg-purple-50'
                                                            const bgColorPuntaje = t === 1 ? 'bg-blue-100' : t === 2 ? 'bg-green-100' : 'bg-purple-100'
                                                            const textColor = t === 1 ? 'text-blue-700' : t === 2 ? 'text-green-700' : 'text-purple-700'

                                                            return (
                                                                <React.Fragment key={t}>
                                                                    {renderTutorDimensionCell(estudiante.inscripcion_id, t, 'nota_ser', notaT.nota_ser, bgColor)}
                                                                    {renderTutorDimensionCell(estudiante.inscripcion_id, t, 'nota_saber', notaT.nota_saber, bgColor)}
                                                                    {renderTutorDimensionCell(estudiante.inscripcion_id, t, 'nota_hacer', notaT.nota_hacer, bgColor)}
                                                                    {renderTutorDimensionCell(estudiante.inscripcion_id, t, 'nota_decidir', notaT.nota_decidir, bgColor)}
                                                                    {renderTutorDimensionCell(estudiante.inscripcion_id, t, 'nota_autoevaluacion', notaT.nota_autoevaluacion, bgColor)}
                                                                    <TableCell className={`text-center border-r-2 ${bgColorPuntaje}`}>
                                                                        <span className={`font-bold ${textColor} text-sm`}>{notaT.promedio_final_trimestre?.toFixed(0) || "0"}</span>
                                                                    </TableCell>
                                                                </React.Fragment>
                                                            )
                                                        })}
                                                    </>
                                                ) : (
                                                    // Vista PROFESOR: Puntajes de los 3 trimestres (editables según permisos)
                                                    <>
                                                        {[1, 2, 3].map(t => {
                                                            const notaT = notasPorTrimestre[t]?.[estudiante.inscripcion_id] || { promedio_final_trimestre: 0 }
                                                            const esHabilitado = trimestresHabilitados[t]
                                                            const bgColor = esHabilitado
                                                                ? (t === 1 ? 'bg-blue-100' : t === 2 ? 'bg-green-100' : 'bg-purple-100')
                                                                : (t === 1 ? 'bg-blue-50' : t === 2 ? 'bg-green-50' : 'bg-purple-50')
                                                            const textColor = t === 1 ? 'text-blue-700' : t === 2 ? 'text-green-700' : 'text-purple-700'

                                                            return (
                                                                <TableCell key={t} className={`text-center ${bgColor}`}>
                                                                    {esHabilitado ? (
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            step="0.1"
                                                                            placeholder="0"
                                                                            value={notaT.promedio_final_trimestre || ""}
                                                                            onChange={(e) => {
                                                                                const valor = parseFloat(e.target.value) || 0
                                                                                const bounded = Math.max(0, Math.min(100, valor))

                                                                                const updated = {
                                                                                    ...notaT,
                                                                                    id_inscripcion: estudiante.inscripcion_id,
                                                                                    trimestre: t,
                                                                                    promedio_final_trimestre: bounded
                                                                                }

                                                                                // Actualizar ambos estados para NO TUTOR
                                                                                setNotasPorTrimestre(prev => ({
                                                                                    ...prev,
                                                                                    [t]: { ...(prev[t] || {}), [estudiante.inscripcion_id]: updated }
                                                                                }))

                                                                                // También actualizar el estado principal para que se refleje inmediatamente
                                                                                setNotas(prev => ({
                                                                                    ...prev,
                                                                                    [estudiante.inscripcion_id]: updated
                                                                                }))

                                                                                setHasChanges(true)
                                                                            }}
                                                                            className="w-20 text-center text-sm h-8 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={`text-lg font-bold ${textColor}`}>
                                                                                {notaT.promedio_final_trimestre?.toFixed(0) || "0"}
                                                                            </span>
                                                                            <span className="text-xs text-gray-500">/ 100</span>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            )
                                                        })}
                                                    </>
                                                )}
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {estudiantes.length === 0 && (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No hay estudiantes registrados en esta aula</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Escala de Calificación</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-500"></div>
                                <span className="text-sm">0-50: En Desarrollo (ED)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-orange-500"></div>
                                <span className="text-sm">51-69: Desarrollo Aceptable (DA)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-blue-500"></div>
                                <span className="text-sm">70-84: Desarrollo Óptimo (DO)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                <span className="text-sm">85-100: Desarrollo Pleno (DP)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </>

            {/* Input oculto para importar */}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportNotasFromExcel} style={{ display: "none" }} />

            {/* Modal selector de trimestre para importar */}
            <Dialog open={showTrimestreSelector} onOpenChange={setShowTrimestreSelector}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Seleccionar Trimestre</DialogTitle>
                        <DialogDescription>
                            Elige a qué trimestre importar las notas del archivo Excel
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {Object.entries(trimestresHabilitados)
                            .filter(([_, enabled]) => enabled)
                            .map(([t]) => {
                                const trimestre = parseInt(t)
                                const color = trimestre === 1 ? 'blue' : trimestre === 2 ? 'green' : 'purple'
                                return (
                                    <Button
                                        key={trimestre}
                                        onClick={() => handleTrimestreSelected(trimestre)}
                                        variant="outline"
                                        className={`justify-start h-auto py-4 border-2 hover:bg-${color}-50 hover:border-${color}-500`}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-lg">
                                                {trimestres[t as '1' | '2' | '3']?.label || `Trimestre ${trimestre}`}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {trimestre === 1 && "Febrero - Mayo"}
                                                {trimestre === 2 && "Mayo - Agosto"}
                                                {trimestre === 3 && "Septiembre - Diciembre"}
                                            </span>
                                        </div>
                                    </Button>
                                )
                            })}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowTrimestreSelector(false)}>
                            Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {hasChanges && (
                <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Tienes cambios sin guardar</span>
                    </div>
                </div>
            )}
        </div>
    )
}
