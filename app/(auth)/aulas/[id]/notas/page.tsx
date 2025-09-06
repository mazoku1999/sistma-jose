"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { useTrimestreGlobal } from "@/hooks/use-trimestre-global"
import { useGestionGlobal } from "@/hooks/use-gestion-global"
import { useAuth } from "@/lib/auth-provider"
import * as XLSX from "xlsx"
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
    Send
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Estudiante {
    id: number
    inscripcion_id: number
    nombres: string
    apellidos: string
    nombre_completo: string
}

interface Nota {
    id_inscripcion: number
    trimestre: number
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
}

export default function NotasPage() {
    const params = useParams()
    const router = useRouter()
    const aulaId = params?.id
    const { toast } = useToast()
    const { trimestreGlobal, trimestres } = useTrimestreGlobal()
    const { user } = useAuth()

    const [aula, setAula] = useState<Aula | null>(null)
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
    const [notas, setNotas] = useState<Record<number, Nota>>({})
    const [notasPorTrimestre, setNotasPorTrimestre] = useState<Record<number, Record<number, Nota>>>({ 1: {}, 2: {}, 3: {} })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [hasChanges, setHasChanges] = useState(false)
    const [isCentralizing, setIsCentralizing] = useState(false)
    const [showConfirmCentralizar, setShowConfirmCentralizar] = useState(false)



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

    useEffect(() => {
        if (!aulaId || aulaId === 'undefined') {
            router.push('/aulas')
            return
        }
        fetchAula()
    }, [aulaId, router])

    useEffect(() => {
        if (trimestreGlobal) {
            fetchEstudiantes()
        }
    }, [trimestreGlobal])

    useEffect(() => {
        if (estudiantes.length > 0) {
            fetchNotasTodas()
        }
    }, [estudiantes])

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
        if (!aulaId) return
        try {
            const [r1, r2, r3] = await Promise.all([
                fetch(`/api/aulas/${aulaId}/notas?trimestre=1`),
                fetch(`/api/aulas/${aulaId}/notas?trimestre=2`),
                fetch(`/api/aulas/${aulaId}/notas?trimestre=3`),
            ])
            const [d1, d2, d3] = await Promise.all([r1.ok ? r1.json() : [], r2.ok ? r2.json() : [], r3.ok ? r3.json() : []])

            const map1: Record<number, Nota> = {}
            const map2: Record<number, Nota> = {}
            const map3: Record<number, Nota> = {}

            d1.forEach((n: Nota) => { map1[n.id_inscripcion] = n })
            d2.forEach((n: Nota) => { map2[n.id_inscripcion] = n })
            d3.forEach((n: Nota) => { map3[n.id_inscripcion] = n })

            setNotasPorTrimestre({ 1: map1, 2: map2, 3: map3 })
            // Sincronizar estado editable con el trimestre actual
            if (trimestreGlobal) {
                const t = parseInt(trimestreGlobal)
                setNotas({ ...(t === 1 ? map1 : t === 2 ? map2 : map3) })
            }
        } catch (error) {
            console.error("Error al cargar notas:", error)
        }
    }

    const handleNotaChange = (inscripcionId: number, valor: string) => {
        const nota = parseFloat(valor)
        if (isNaN(nota) || nota < 0 || nota > 100) {
            return
        }
        const t = parseInt(trimestreGlobal)
        const nextNota: Nota = { id_inscripcion: inscripcionId, trimestre: t, promedio_final_trimestre: nota }
        setNotas(prev => ({ ...prev, [inscripcionId]: nextNota }))
        setNotasPorTrimestre(prev => ({
            ...prev,
            [t]: { ...(prev[t] || {}), [inscripcionId]: nextNota }
        }))
        setHasChanges(true)
    }

    const handleGuardarNotas = async () => {
        if (!aulaId || !hasChanges || !trimestreGlobal) return
        setIsSaving(true)
        try {
            const notasArray = Object.values(notas).filter(nota =>
                nota.promedio_final_trimestre >= 0 && nota.promedio_final_trimestre <= 100
            )

            const response = await fetch(`/api/aulas/${aulaId}/notas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    trimestre: parseInt(trimestreGlobal),
                    notas: notasArray
                })
            })

            if (response.ok) {
                toast({
                    title: "Éxito",
                    description: "Notas guardadas correctamente",
                })
                setHasChanges(false)
                fetchNotasTodas()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al guardar las notas",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al guardar notas:", error)
            toast({
                title: "Error",
                description: "Error al guardar las notas",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const normalizeName = (s: string) => {
        return stripDiacritics(s)
            .toLowerCase()
            .replace(/[^a-z\s]/g, ' ') // quitar puntuación/números
            .replace(/\s+/g, ' ')
            .trim()
    }
    const connectors = new Set(['de','del','la','las','los','y','e'])
    const tokenize = (s: string) => normalizeName(s).split(' ').filter(t => t && !connectors.has(t) && t.length > 1)
    const keySorted = (tokens: string[]) => tokens.slice().sort().join(' ')

    const handleImportClick = () => fileInputRef.current?.click()

    const handleImportNotasFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!trimestreGlobal) {
            toast({ title: "Selecciona trimestre", description: "Define el trimestre antes de importar", variant: "destructive" })
            e.target.value = ""
            return
        }
        try {
            setIsImporting(true)
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: "array" })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })

            if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
                toast({ title: "Sin lista", description: "Aún no se cargan los estudiantes del aula", variant: "destructive" })
                return
            }

            // Construir mapa de estudiantes por varias claves de coincidencia y lista para búsqueda difusa
            const matchMap = new Map<string, { inscripcion_id: number; id: number }>()
            const candidates: { key: string; tokens: string[]; inscripcion_id: number; id: number }[] = []
            for (const est of estudiantes) {
                const full = `${est.nombres || ''} ${est.apellidos || ''}`
                const alt = `${est.apellidos || ''} ${est.nombres || ''}`
                const t1 = tokenize(full)
                const t2 = tokenize(alt)
                const k1 = t1.join(' ')
                const k2 = t2.join(' ')
                const ks = keySorted(t1)
                // insertar múltiples llaves para robustez
                if (k1) matchMap.set(k1, { inscripcion_id: est.inscripcion_id, id: est.id })
                if (k2) matchMap.set(k2, { inscripcion_id: est.inscripcion_id, id: est.id })
                if (ks) matchMap.set(ks, { inscripcion_id: est.inscripcion_id, id: est.id })
                candidates.push({ key: k1 || ks || k2, tokens: t1.length ? t1 : t2, inscripcion_id: est.inscripcion_id, id: est.id })
            }

            let matched = 0
            let invalid = 0
            let notFound = 0
            const updates: Record<number, Nota> = {}
            const t = parseInt(trimestreGlobal)

            // Similar al ejemplo dado: comienza en fila 10, nombre en columna B (1), nota en AD (29)
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i] as any[]
                if (!row) continue
                const nombre = String(row[1] || "").trim()
                const notaRaw = row[29]
                if (!nombre) continue
                const tokens = tokenize(nombre)
                const keyA = tokens.join(' ')
                const keyB = keySorted(tokens)
                let target = matchMap.get(keyA) || matchMap.get(keyB)
                // Fallback: mejor coincidencia por intersección de tokens (>=2)
                if (!target && tokens.length) {
                    let best: { c: number; inscripcion_id: number; id: number } | null = null
                    const tokSet = new Set(tokens)
                    for (const c of candidates) {
                        let inter = 0
                        for (const tkn of c.tokens) if (tokSet.has(tkn)) inter++
                        if (inter >= 2) {
                            if (!best || inter > best.c) best = { c: inter, inscripcion_id: c.inscripcion_id, id: c.id }
                        }
                    }
                    if (best) target = { inscripcion_id: best.inscripcion_id, id: best.id }
                }
                if (!target) { notFound++; continue }

                const notaVal = Number(notaRaw)
                if (!isFinite(notaVal)) { invalid++; continue }
                const bounded = Math.max(0, Math.min(100, notaVal))
                updates[target.inscripcion_id] = { id_inscripcion: target.inscripcion_id, trimestre: t, promedio_final_trimestre: bounded }
                matched++
            }

            if (matched === 0) {
                toast({ title: "Sin coincidencias", description: `No se encontraron estudiantes coincidentes. No se importó nada.`, variant: "destructive" })
            } else {
                // Aplicar a estado local y marcar cambios
                setNotas((prev) => ({ ...prev, ...updates }))
                setNotasPorTrimestre((prev) => ({
                    ...prev,
                    [t]: { ...(prev[t] || {}), ...updates }
                }))
                setHasChanges(true)

                toast({ title: "Importación preparada", description: `${matched} coincidentes. ${notFound} no encontrados. ${invalid} inválidos. Revisa y guarda.`, })
            }
        } catch (err: any) {
            console.error("Error importando notas:", err)
            toast({ title: "Error al importar", description: err?.message || "Archivo inválido" , variant: "destructive" })
        } finally {
            setIsImporting(false)
            e.target.value = ""
        }
    }

    const handleCentralizarNotas = async () => {
        if (!aulaId || !trimestreGlobal || !aula) return

        // Verificar que no hay cambios sin guardar
        if (hasChanges) {
            toast({
                title: "Cambios sin guardar",
                description: "Debes guardar las notas antes de centralizarlas",
                variant: "destructive",
            })
            return
        }

        // Verificar que hay notas para centralizar
        const notasValidas = Object.values(notas).filter(n => n.promedio_final_trimestre > 0)
        if (notasValidas.length === 0) {
            toast({
                title: "Sin notas",
                description: "No hay notas para centralizar",
                variant: "destructive",
            })
            return
        }

        // NUEVA VERIFICACIÓN: Solo permitir centralización en gestión activa
        if (aula.gestion_activa === false) {
            toast({
                title: "🔒 Centralización no permitida",
                description: "Solo se pueden centralizar notas de la gestión académica activa (año actual)",
                variant: "destructive",
            })
            return
        }

        setIsCentralizing(true)
        try {
            // Obtener información completa del aula para la centralización
            const aulaResponse = await fetch(`/api/aulas/${aulaId}`)
            if (!aulaResponse.ok) {
                throw new Error("No se pudo obtener información del aula")
            }
            const aulaData = await aulaResponse.json()

            // Preparar las notas para centralización
            const notasParaCentralizar = estudiantes.map(estudiante => {
                const notaEstudiante = notas[estudiante.inscripcion_id]
                return {
                    id_estudiante: estudiante.id,
                    id_materia: aulaData.id_materia,
                    nota_final: notaEstudiante?.promedio_final_trimestre || 0
                }
            }).filter(nota => nota.nota_final > 0)

            const response = await fetch('/api/central/notas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    colegio: aulaData.id_colegio,
                    nivel: aulaData.id_nivel,
                    curso: aulaData.id_curso,
                    paralelo: aulaData.id_paralelo,
                    trimestre: parseInt(trimestreGlobal),
                    notas: notasParaCentralizar
                })
            })

            if (response.ok) {
                const result = await response.json()
                toast({
                    title: "Éxito",
                    description: `${result.count} notas del ${trimestres[trimestreGlobal as keyof typeof trimestres]?.label} centralizadas correctamente`,
                })
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al centralizar las notas",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al centralizar notas:", error)
            toast({
                title: "Error",
                description: "Error al centralizar las notas",
                variant: "destructive",
            })
        } finally {
            setIsCentralizing(false)
        }
    }

    const getEstadisticasNotas = () => {
        const notasValidas = Object.values(notas).filter(n => n.promedio_final_trimestre > 0)
        const total = estudiantes.length
        const conNotas = notasValidas.length
        const sinNotas = total - conNotas

        if (notasValidas.length === 0) {
            return { total, conNotas, sinNotas, promedio: 0, aprobados: 0, reprobados: 0 }
        }

        const suma = notasValidas.reduce((acc, nota) => acc + nota.promedio_final_trimestre, 0)
        const promedio = suma / notasValidas.length
        const aprobados = notasValidas.filter(n => n.promedio_final_trimestre >= 60).length
        const reprobados = notasValidas.filter(n => n.promedio_final_trimestre < 60).length

        return { total, conNotas, sinNotas, promedio, aprobados, reprobados }
    }

    const stats = getEstadisticasNotas()

    if (isLoading || !trimestreGlobal) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">
                        {!trimestreGlobal ? "Cargando configuración..." : "Cargando notas..."}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">

            {/* Modal de confirmación para centralizar */}
            <Dialog open={showConfirmCentralizar} onOpenChange={setShowConfirmCentralizar}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-orange-600" />
                            Confirmar Centralización
                        </DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas centralizar las notas?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                                <div className="space-y-2">
                                    <h4 className="font-medium text-orange-800">Información importante</h4>
                                    <ul className="text-sm text-orange-700 space-y-1">
                                        <li>• Se centralizarán {stats.conNotas} notas del {trimestres[trimestreGlobal as keyof typeof trimestres]?.label}</li>
                                        <li>• Esta acción enviará las notas al sistema central</li>
                                        <li>• Las notas centralizadas podrán ser vistas por otros profesores autorizados</li>
                                        <li>• Puedes centralizar nuevamente si realizas cambios posteriores</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="text-2xl">{trimestres[trimestreGlobal as keyof typeof trimestres]?.icon}</div>
                                <div>
                                    <h4 className="font-medium text-blue-800">
                                        {aula?.nombre_aula} - {aula?.curso} {aula?.paralelo}
                                    </h4>
                                    <p className="text-sm text-blue-600">
                                        {aula?.materia} • {trimestres[trimestreGlobal as keyof typeof trimestres]?.label}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmCentralizar(false)}
                            disabled={isCentralizing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={async () => {
                                setShowConfirmCentralizar(false)
                                await handleCentralizarNotas()
                            }}
                            disabled={isCentralizing}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isCentralizing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            Centralizar Notas
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/aulas/${aulaId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Ingreso de Notas</h1>
                    <p className="text-muted-foreground">
                        {aula?.nombre_aula} - {aula?.curso} {aula?.paralelo}
                    </p>
                </div>

            </div>

            {trimestreGlobal && (
                <>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleImportClick}
                            disabled={isImporting}
                            title="Importar desde Excel (columna AD)"
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
                            disabled={!hasChanges || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Guardar Notas
                        </Button>

                        {user?.roles.includes("ADMIN") && (
                            <Button
                                onClick={() => setShowConfirmCentralizar(true)}
                                disabled={hasChanges || isCentralizing || stats.conNotas === 0 || aula?.gestion_activa === false}
                                variant="outline"
                                title={aula?.gestion_activa === false ? "Solo se pueden centralizar notas de la gestión activa" : ""}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Centralizar Notas
                                {aula?.gestion_activa === false && (
                                    <span className="ml-2 text-xs">🔒</span>
                                )}
                            </Button>
                        )}
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
                                <p className="text-xs text-muted-foreground">≥ 60 pts</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Reprobados</CardTitle>
                                <X className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{stats.reprobados}</div>
                                <p className="text-xs text-muted-foreground">&lt; 60 pts</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Registro de Calificaciones</CardTitle>
                            <CardDescription>
                                Ver los tres bimestres. Solo el bimestre actual es editable.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>#</TableHead>
                                            <TableHead>Estudiante</TableHead>
                                            <TableHead className="text-center">1er Bim</TableHead>
                                            <TableHead className="text-center">2do Bim</TableHead>
                                            <TableHead className="text-center">3er Bim</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {estudiantes.map((estudiante, index) => {
                                            const n1 = notasPorTrimestre[1]?.[estudiante.inscripcion_id]?.promedio_final_trimestre || 0
                                            const n2 = notasPorTrimestre[2]?.[estudiante.inscripcion_id]?.promedio_final_trimestre || 0
                                            const n3 = notasPorTrimestre[3]?.[estudiante.inscripcion_id]?.promedio_final_trimestre || 0
                                            const tActual = parseInt(trimestreGlobal)
                                            const renderCell = (t: number, valor: number) => {
                                                const editable = t === tActual
                                                if (editable) {
                                                    return (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.1"
                                                                placeholder="0.0"
                                                                value={valor > 0 ? valor.toString() : ""}
                                                                onChange={(e) => handleNotaChange(estudiante.inscripcion_id, e.target.value)}
                                                                className="w-20 text-center"
                                                            />
                                                            <span className="text-[10px] text-muted-foreground">/ 100</span>
                                                        </div>
                                                    )
                                                }
                                                // No editable: mostrar input bloqueado con valor (0 si null/NaN)
                                                const shown = Number.isFinite(valor) && valor > 0 ? valor : 0
                                                return (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                            value={shown}
                                                            readOnly
                                                            disabled
                                                            className="w-20 text-center bg-muted"
                                                        />
                                                        <span className="text-[10px] text-muted-foreground">/ 100</span>
                                                    </div>
                                                )
                                            }

                                            return (
                                                <TableRow key={estudiante.id}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{estudiante.nombre_completo}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">{renderCell(1, n1)}</TableCell>
                                                    <TableCell className="text-center">{renderCell(2, n2)}</TableCell>
                                                    <TableCell className="text-center">{renderCell(3, n3)}</TableCell>
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
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span className="text-sm">90-100: Excelente</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-sm">80-89: Muy Bueno</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                    <span className="text-sm">70-79: Bueno</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                    <span className="text-sm">60-69: Regular</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span className="text-sm">0-59: Insuficiente</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
            {/* Input oculto para importar */}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportNotasFromExcel} style={{ display: "none" }} />

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
