"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    FileText,
    Download,
    Calendar,
    Users,
    BookOpen,
    TrendingUp,
    BarChart3,
    Loader2,
    AlertCircle,
    Award,
    Target,
    Clock,
    Star,
    TrendingDown,
    CheckCircle,
    XCircle
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ReporteData {
    id: number
    nombre_aula: string
    materia: string
    curso: string
    paralelo: string
    total_estudiantes: number
    promedio_general: number
    aprobados: number
    reprobados: number
    porcentaje_aprobacion: number
}

interface MejoresEstudiantes {
    id: number
    estudiante: string
    promedio: number
    aula: string
    materia: string
}

interface ReporteAsistencia {
    id: number
    estudiante: string
    aula: string
    total_clases: number
    asistencias: number
    faltas: number
    porcentaje_asistencia: number
}

export default function ReportesPage() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [reportes, setReportes] = useState<ReporteData[]>([])
    const [mejoresEstudiantes, setMejoresEstudiantes] = useState<MejoresEstudiantes[]>([])
    const [reporteAsistencia, setReporteAsistencia] = useState<ReporteAsistencia[]>([])
    const [selectedAula, setSelectedAula] = useState<string>("all")
    const [aulas, setAulas] = useState<{ id: number; nombre: string }[]>([])
    const [error, setError] = useState("")

    useEffect(() => {
        fetchReportes()
        fetchAulas()
    }, [selectedAula])

    const fetchReportes = async () => {
        setIsLoading(true)
        setError("")
        try {
            const response = await fetch(`/api/reportes?${selectedAula !== "all" ? `aula=${selectedAula}` : ""}`)
            if (response.ok) {
                const data = await response.json()
                setReportes(data)
            } else {
                setError("Error al cargar reportes")
            }
        } catch (error) {
            console.error("Error al cargar reportes:", error)
            setError("Error al cargar reportes")
        } finally {
            setIsLoading(false)
        }
    }

    const fetchAulas = async () => {
        try {
            const response = await fetch("/api/aulas")
            if (response.ok) {
                const data = await response.json()
                setAulas(
                    data.map((aula: any) => ({
                        id: aula.id,
                        nombre: aula.nombre_aula,
                    })),
                )
            }
        } catch (error) {
            console.error("Error al cargar aulas:", error)
        }
    }

    const handleExportReporte = async (aulaId: number) => {
        try {
            const response = await fetch(`/api/exportar-reporte/${aulaId}`, {
                method: 'POST',
            })

            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.style.display = 'none'
                a.href = url
                a.download = `reporte-aula-${aulaId}-${new Date().toISOString().split('T')[0]}.xlsx`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                alert('Error al exportar reporte')
            }
        } catch (error) {
            console.error('Error al exportar reporte:', error)
            alert('Error al exportar reporte')
        }
    }

    const getPromedioColor = (promedio: number) => {
        if (promedio >= 7) return "text-green-600"
        if (promedio >= 5) return "text-yellow-600"
        return "text-red-600"
    }

    const getPorcentajeColor = (porcentaje: number) => {
        if (porcentaje >= 80) return "text-green-600"
        if (porcentaje >= 60) return "text-yellow-600"
        return "text-red-600"
    }

    // Función helper para convertir valores a número de forma segura
    const safeToNumber = (value: any): number => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') return parseFloat(value) || 0
        return 0
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando reportes...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reportes Académicos</h1>
                    <p className="text-muted-foreground">Análisis detallado del rendimiento académico</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedAula} onValueChange={setSelectedAula}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por aula" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las aulas</SelectItem>
                            {aulas.map((aula) => (
                                <SelectItem key={aula.id} value={aula.id.toString()}>
                                    {aula.nombre}
                                </SelectItem>
                            ))}
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

            {reportes.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No hay reportes disponibles</h3>
                        <p className="text-muted-foreground text-center">
                            No se encontraron datos para generar reportes
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {reportes.map((reporte) => (
                        <Card key={reporte.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <BookOpen className="h-5 w-5" />
                                            {reporte.nombre_aula}
                                        </CardTitle>
                                        <CardDescription>
                                            {reporte.materia} - {reporte.curso} {reporte.paralelo}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExportReporte(reporte.id)}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Exportar
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Total de estudiantes */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium">Total Estudiantes</span>
                                        </div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {reporte.total_estudiantes}
                                        </div>
                                    </div>

                                    {/* Promedio general */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium">Promedio General</span>
                                        </div>
                                        <div className={`text-2xl font-bold ${getPromedioColor(safeToNumber(reporte.promedio_general))}`}>
                                            {safeToNumber(reporte.promedio_general).toFixed(1)}
                                        </div>
                                    </div>

                                    {/* Aprobados */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium">Aprobados</span>
                                        </div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {reporte.aprobados}
                                        </div>
                                    </div>

                                    {/* Reprobados */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                            <span className="text-sm font-medium">Reprobados</span>
                                        </div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {reporte.reprobados}
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de progreso de aprobación */}
                                <div className="mt-6 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Porcentaje de Aprobación</span>
                                        <span className={`text-sm font-bold ${getPorcentajeColor(safeToNumber(reporte.porcentaje_aprobacion))}`}>
                                            {safeToNumber(reporte.porcentaje_aprobacion).toFixed(1)}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={safeToNumber(reporte.porcentaje_aprobacion)}
                                        className="h-2"
                                    />
                                </div>

                                {/* Badges de estado */}
                                <div className="mt-4 flex gap-2">
                                    <Badge variant={safeToNumber(reporte.promedio_general) >= 7 ? "default" : "secondary"}>
                                        Promedio: {safeToNumber(reporte.promedio_general).toFixed(1)}
                                    </Badge>
                                    <Badge variant={safeToNumber(reporte.porcentaje_aprobacion) >= 80 ? "default" : "secondary"}>
                                        Aprobación: {safeToNumber(reporte.porcentaje_aprobacion).toFixed(1)}%
                                    </Badge>
                                    <Badge variant="outline">
                                        {reporte.total_estudiantes} estudiantes
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
