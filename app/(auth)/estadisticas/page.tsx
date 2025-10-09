"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    BookOpen,
    Calendar,
    Award,
    AlertTriangle,
    CheckCircle,
    Loader2,
    AlertCircle
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface EstadisticaData {
    total_aulas: number
    total_estudiantes: number
    total_notas: number
    promedio_general: number
    rendimiento_por_aula: Array<{
        id: number
        nombre_aula: string
        materia: string
        promedio: number
        total_estudiantes: number
        aprobados: number
        reprobados: number
    }>
    distribucion_notas: Array<{
        rango: string
        cantidad: number
        porcentaje: number
    }>
    tendencia_mensual: Array<{
        mes: string
        promedio: number
        total_estudiantes: number
    }>
}

export default function EstadisticasPage() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [estadisticas, setEstadisticas] = useState<EstadisticaData | null>(null)
    const [selectedPeriodo, setSelectedPeriodo] = useState<string>("actual")
    const [error, setError] = useState("")

    useEffect(() => {
        fetchEstadisticas()
    }, [selectedPeriodo])

    const fetchEstadisticas = async () => {
        setIsLoading(true)
        setError("")
        try {
            const response = await fetch(`/api/estadisticas?periodo=${selectedPeriodo}`)
            if (response.ok) {
                const data = await response.json()
                setEstadisticas(data)
            } else {
                setError("Error al cargar estadísticas")
            }
        } catch (error) {
            console.error("Error al cargar estadísticas:", error)
            setError("Error al cargar estadísticas")
        } finally {
            setIsLoading(false)
        }
    }

    const getPromedioColor = (promedio: number) => {
        if (promedio >= 7) return "text-green-600"
        if (promedio >= 5) return "text-yellow-600"
        return "text-red-600"
    }

    const getRendimientoColor = (promedio: number) => {
        if (promedio >= 7) return "bg-green-100 text-green-800"
        if (promedio >= 5) return "bg-yellow-100 text-yellow-800"
        return "bg-red-100 text-red-800"
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando estadísticas...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Estadísticas Académicas</h1>
                    <p className="text-muted-foreground">Análisis del rendimiento académico general</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Seleccionar período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="actual">Período Actual</SelectItem>
                            <SelectItem value="anterior">Período Anterior</SelectItem>
                            <SelectItem value="anual">Año Completo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!estadisticas ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No hay estadísticas disponibles</h3>
                        <p className="text-muted-foreground text-center">
                            No se encontraron datos para generar estadísticas
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Resumen general */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Aulas</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{estadisticas.total_aulas}</div>
                                <p className="text-xs text-muted-foreground">Aulas activas</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{estadisticas.total_estudiantes}</div>
                                <p className="text-xs text-muted-foreground">Estudiantes inscritos</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${getPromedioColor(estadisticas.promedio_general)}`}>
                                    {estadisticas.promedio_general.toFixed(1)}
                                </div>
                                <p className="text-xs text-muted-foreground">Promedio de todas las aulas</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Notas</CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{estadisticas.total_notas}</div>
                                <p className="text-xs text-muted-foreground">Notas registradas</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Rendimiento por aula */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Rendimiento por Aula</CardTitle>
                            <CardDescription>
                                Análisis detallado del rendimiento en cada aula
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {estadisticas.rendimiento_por_aula.map((aula) => (
                                    <div key={aula.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <BookOpen className="h-4 w-4" />
                                                <span className="font-medium">{aula.nombre_aula}</span>
                                                <Badge variant="outline">{aula.materia}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span>{aula.total_estudiantes} estudiantes</span>
                                                <span>{aula.aprobados} aprobados</span>
                                                <span>{aula.reprobados} reprobados</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${getPromedioColor(aula.promedio)}`}>
                                                    {aula.promedio.toFixed(1)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Promedio</div>
                                            </div>
                                            <Badge className={getRendimientoColor(aula.promedio)}>
                                                {aula.promedio >= 7 ? "Excelente" : aula.promedio >= 5 ? "Bueno" : "Necesita mejora"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Distribución de notas */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribución de Notas</CardTitle>
                            <CardDescription>
                                Análisis de la distribución de calificaciones
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {estadisticas.distribucion_notas.map((rango, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{rango.rango}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {rango.cantidad} notas ({rango.porcentaje.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <Progress value={rango.porcentaje} className="h-2" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tendencia mensual */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tendencia Mensual</CardTitle>
                            <CardDescription>
                                Evolución del rendimiento a lo largo del tiempo
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {estadisticas.tendencia_mensual.map((mes, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{mes.mes}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${getPromedioColor(mes.promedio)}`}>
                                                    {mes.promedio.toFixed(1)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {mes.total_estudiantes} estudiantes
                                                </div>
                                            </div>
                                            {index > 0 && (
                                                <div className="flex items-center gap-1">
                                                    {mes.promedio > estadisticas.tendencia_mensual[index - 1].promedio ? (
                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
