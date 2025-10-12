"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Users, BookOpen, CheckCircle, XCircle, AlertTriangle, Loader2, AlertCircle, Calendar, CalendarDays, Timer, FileText, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ReporteAsistencia {
    id: number
    estudiante: string
    aula: string
    total_clases: number
    asistencias: number
    faltas: number
    retrasos: number
    licencias: number
    porcentaje_asistencia: number
}

const ControlAsistenciaPage = () => {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [reporteAsistencia, setReporteAsistencia] = useState<ReporteAsistencia[]>([])
    const [selectedAula, setSelectedAula] = useState<string>("all")
    const [selectedPeriodo, setSelectedPeriodo] = useState<string>("todo")
    const [aulas, setAulas] = useState<{ id: number; nombre: string }[]>([])
    const [error, setError] = useState("")

    useEffect(() => {
        fetchReporteAsistencia()
        fetchAulas()
    }, [selectedAula, selectedPeriodo])

    const fetchReporteAsistencia = async () => {
        setIsLoading(true)
        setError("")
        try {
            const params = new URLSearchParams()
            if (selectedAula !== "all") {
                params.append("aula", selectedAula)
            }
            if (selectedPeriodo !== "todo") {
                params.append("periodo", selectedPeriodo)
            }

            const response = await fetch(`/api/asistencia?${params.toString()}`)
            if (response.ok) {
                const data = await response.json()
                setReporteAsistencia(data)
            } else {
                setError("Error al cargar reporte de asistencia")
            }
        } catch (error) {
            console.error("Error al cargar reporte de asistencia:", error)
            setError("Error al cargar reporte de asistencia")
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

    const getPorcentajeColor = (porcentaje: number) => {
        if (porcentaje >= 90) return "text-green-600"
        if (porcentaje >= 80) return "text-blue-600"
        if (porcentaje >= 70) return "text-yellow-600"
        return "text-red-600"
    }

    const getAsistenciaBadge = (porcentaje: number) => {
        if (porcentaje >= 90) return "bg-green-100 text-green-800"
        if (porcentaje >= 80) return "bg-blue-100 text-blue-800"
        if (porcentaje >= 70) return "bg-yellow-100 text-yellow-800"
        return "bg-red-100 text-red-800"
    }

    const getAsistenciaText = (porcentaje: number) => {
        if (porcentaje >= 90) return "Excelente"
        if (porcentaje >= 80) return "Bueno"
        if (porcentaje >= 70) return "Regular"
        return "Bajo"
    }

    const safeToNumber = (value: any): number => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') return parseFloat(value) || 0
        return 0
    }

    const exportToPDF = async () => {
        try {
            const params = new URLSearchParams()
            if (selectedAula !== "all") {
                params.append("aula", selectedAula)
            }
            if (selectedPeriodo !== "todo") {
                params.append("periodo", selectedPeriodo)
            }
            params.append("export", "pdf")

            const response = await fetch(`/api/asistencia?${params.toString()}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `reporte-asistencia-${selectedPeriodo === "todo" ? "año-lectivo" : `${selectedPeriodo}er-trimestre`}-${new Date().toISOString().split('T')[0]}.pdf`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                setError("Error al exportar el reporte")
            }
        } catch (error) {
            console.error("Error al exportar PDF:", error)
            setError("Error al exportar el reporte")
        }
    }


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando control de asistencia...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Asistencia</h1>
                    <p className="text-muted-foreground">
                        Seguimiento de asistencia por estudiante
                        {selectedPeriodo !== "todo" && (
                            <span className="ml-2 text-blue-600 font-medium">
                                • {selectedPeriodo === "1" ? "1er Trimestre" : selectedPeriodo === "2" ? "2do Trimestre" : selectedPeriodo === "3" ? "3er Trimestre" : ""}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
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

                    <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todo">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Año Lectivo
                                </div>
                            </SelectItem>
                            <SelectItem value="1">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    1er Trimestre
                                </div>
                            </SelectItem>
                            <SelectItem value="2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    2do Trimestre
                                </div>
                            </SelectItem>
                            <SelectItem value="3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    3er Trimestre
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={exportToPDF}
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={reporteAsistencia.length === 0}
                    >
                        <Download className="h-4 w-4" />
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {reporteAsistencia.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No hay datos de asistencia</h3>
                        <p className="text-muted-foreground text-center">
                            No se encontraron datos para mostrar el control de asistencia
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Indicador del período seleccionado */}
                    {selectedPeriodo !== "todo" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-blue-900">
                                    Mostrando datos de: {selectedPeriodo === "1" ? "1er Trimestre" : selectedPeriodo === "2" ? "2do Trimestre" : selectedPeriodo === "3" ? "3er Trimestre" : "Año Lectivo"}
                                </span>
                                <Badge variant="secondary" className="ml-2">
                                    {selectedAula !== "all" ? `Aula: ${aulas.find(a => a.id.toString() === selectedAula)?.nombre || selectedAula}` : "Todas las aulas"}
                                </Badge>
                            </div>
                        </div>
                    )}

                    {/* KPIs - Estadísticas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Total de estudiantes */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Estudiantes</p>
                                        <p className="text-3xl font-bold text-gray-700 mt-2">
                                            {reporteAsistencia.length}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">En el período</p>
                                    </div>
                                    <Users className="h-8 w-8 text-gray-600 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total de asistencias */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Asistencias</p>
                                        <p className="text-3xl font-bold text-green-600 mt-2">
                                            {reporteAsistencia.reduce((sum, a) => sum + safeToNumber(a.asistencias), 0)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Registros</p>
                                    </div>
                                    <CheckCircle className="h-8 w-8 text-green-600 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total de faltas */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Faltas</p>
                                        <p className="text-3xl font-bold text-red-600 mt-2">
                                            {reporteAsistencia.reduce((sum, a) => sum + safeToNumber(a.faltas), 0)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Registros</p>
                                    </div>
                                    <XCircle className="h-8 w-8 text-red-600 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total de retrasos */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Retrasos</p>
                                        <p className="text-3xl font-bold text-orange-600 mt-2">
                                            {reporteAsistencia.reduce((sum, a) => sum + safeToNumber(a.retrasos), 0)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Registros</p>
                                    </div>
                                    <Timer className="h-8 w-8 text-orange-600 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total de licencias */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Licencias</p>
                                        <p className="text-3xl font-bold text-purple-600 mt-2">
                                            {reporteAsistencia.reduce((sum, a) => sum + safeToNumber(a.licencias), 0)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Registros</p>
                                    </div>
                                    <FileText className="h-8 w-8 text-purple-600 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Promedio general de asistencia */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Promedio General</p>
                                        <p className="text-3xl font-bold text-indigo-600 mt-2">
                                            {reporteAsistencia.length > 0
                                                ? (reporteAsistencia.reduce((sum, a) => sum + safeToNumber(a.porcentaje_asistencia), 0) / reporteAsistencia.length).toFixed(1)
                                                : 0
                                            }%
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Asistencia</p>
                                    </div>
                                    <Clock className="h-8 w-8 text-indigo-600 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Distribución de asistencia */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Distribución de Asistencia
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) >= 90).length}
                                    </div>
                                    <div className="text-sm text-green-700">Excelente (90%+)</div>
                                    <div className="text-xs text-green-600 mt-1">
                                        {reporteAsistencia.length > 0
                                            ? ((reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) >= 90).length / reporteAsistencia.length) * 100).toFixed(1)
                                            : 0
                                        }% del total
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) >= 80 && safeToNumber(a.porcentaje_asistencia) < 90).length}
                                    </div>
                                    <div className="text-sm text-blue-700">Bueno (80-89%)</div>
                                    <div className="text-xs text-blue-600 mt-1">
                                        {reporteAsistencia.length > 0
                                            ? ((reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) >= 80 && safeToNumber(a.porcentaje_asistencia) < 90).length / reporteAsistencia.length) * 100).toFixed(1)
                                            : 0
                                        }% del total
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) >= 70 && safeToNumber(a.porcentaje_asistencia) < 80).length}
                                    </div>
                                    <div className="text-sm text-yellow-700">Regular (70-79%)</div>
                                    <div className="text-xs text-yellow-600 mt-1">
                                        {reporteAsistencia.length > 0
                                            ? ((reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) >= 70 && safeToNumber(a.porcentaje_asistencia) < 80).length / reporteAsistencia.length) * 100).toFixed(1)
                                            : 0
                                        }% del total
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">
                                        {reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) < 70).length}
                                    </div>
                                    <div className="text-sm text-red-700">Bajo (&lt;70%)</div>
                                    <div className="text-xs text-red-600 mt-1">
                                        {reporteAsistencia.length > 0
                                            ? ((reporteAsistencia.filter(a => safeToNumber(a.porcentaje_asistencia) < 70).length / reporteAsistencia.length) * 100).toFixed(1)
                                            : 0
                                        }% del total
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabla detallada */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                Control de Asistencia por Estudiante
                                {selectedPeriodo !== "todo" && (
                                    <Badge variant="outline" className="ml-2">
                                        {selectedPeriodo === "1" ? "1er Trimestre" : selectedPeriodo === "2" ? "2do Trimestre" : selectedPeriodo === "3" ? "3er Trimestre" : ""}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {reporteAsistencia.map((asistencia) => (
                                    <div key={asistencia.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-lg">{asistencia.estudiante}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" />
                                                    {asistencia.aula}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-green-600">{asistencia.asistencias}</div>
                                                <div className="text-xs text-muted-foreground">Asistencias</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-red-600">{asistencia.faltas}</div>
                                                <div className="text-xs text-muted-foreground">Faltas</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-orange-600">{asistencia.retrasos}</div>
                                                <div className="text-xs text-muted-foreground">Retrasos</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-600">{asistencia.licencias}</div>
                                                <div className="text-xs text-muted-foreground">Licencias</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-blue-600">{asistencia.total_clases}</div>
                                                <div className="text-xs text-muted-foreground">Total Clases</div>
                                            </div>
                                            <div className="text-center min-w-[80px]">
                                                <div className={`text-lg font-bold ${getPorcentajeColor(safeToNumber(asistencia.porcentaje_asistencia))}`}>
                                                    {safeToNumber(asistencia.porcentaje_asistencia).toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">Asistencia</div>
                                            </div>
                                            <div className="min-w-[120px]">
                                                <Progress
                                                    value={safeToNumber(asistencia.porcentaje_asistencia)}
                                                    className="h-2 mb-2"
                                                />
                                                <Badge className={`${getAsistenciaBadge(safeToNumber(asistencia.porcentaje_asistencia))} text-xs font-medium px-2 py-1`}>
                                                    {getAsistenciaText(safeToNumber(asistencia.porcentaje_asistencia))}
                                                </Badge>
                                            </div>
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

export default ControlAsistenciaPage