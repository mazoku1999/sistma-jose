"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { useTrimestreGlobal } from "@/hooks/use-trimestre-global"
import { useGestionGlobal } from "@/hooks/use-gestion-global"
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
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
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
        if (estudiantes.length > 0 && trimestreGlobal) {
            fetchNotas()
        }
    }, [estudiantes, trimestreGlobal])

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

    const fetchNotas = async () => {
        if (!aulaId || !trimestreGlobal) return
        try {
            const response = await fetch(`/api/aulas/${aulaId}/notas?trimestre=${trimestreGlobal}`)
            if (response.ok) {
                const data = await response.json()
                const notasMap: Record<number, Nota> = {}
                data.forEach((nota: Nota) => {
                    notasMap[nota.id_inscripcion] = nota
                })
                setNotas(notasMap)
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
        setNotas(prev => ({
            ...prev,
            [inscripcionId]: {
                id_inscripcion: inscripcionId,
                trimestre: parseInt(trimestreGlobal),
                promedio_final_trimestre: nota
            }
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
                fetchNotas()
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
                                Ingresa las notas finales del {trimestres[trimestreGlobal as keyof typeof trimestres]?.label}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {estudiantes.map((estudiante, index) => {
                                    const notaActual = notas[estudiante.inscripcion_id]
                                    const nota = notaActual?.promedio_final_trimestre || 0

                                    return (
                                        <div
                                            key={estudiante.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium">{estudiante.nombre_completo}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        ID: {estudiante.id}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        placeholder="0.0"
                                                        value={nota > 0 ? nota.toString() : ""}
                                                        onChange={(e) => handleNotaChange(estudiante.inscripcion_id, e.target.value)}
                                                        className="w-20 text-center"
                                                    />
                                                    <span className="text-xs text-muted-foreground">/ 100</span>
                                                </div>

                                                {nota > 0 && (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn("min-w-[80px] justify-center", getNotaColor(nota))}
                                                        >
                                                            {getNotaLabel(nota)}
                                                        </Badge>
                                                        <div className="w-16">
                                                            <Progress
                                                                value={nota}
                                                                className="h-2"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
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