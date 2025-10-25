"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Clock,
    Users,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    Download,
    Loader2,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    BarChart3,
    School,
    BookOpen
} from "lucide-react"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

interface ReporteAsistencia {
    id_estudiante: number
    nombres: string
    apellido_paterno: string
    apellido_materno: string
    nombre_completo: string
    colegio: string
    nivel: string
    curso: string
    paralelo: string
    total_registros: number
    asistencias: number
    faltas: number
    retrasos: number
    licencias: number
    porcentaje_asistencia: number
}

interface EstadisticasAsistencia {
    total_estudiantes: number
    promedio_asistencia_general: number
    estudiantes_excelente_asistencia: number
    estudiantes_buena_asistencia: number
    estudiantes_regular_asistencia: number
    estudiantes_mala_asistencia: number
}

interface AsistenciaPorNivel {
    nivel: string
    total_estudiantes: number
    promedio_asistencia: number
    estudiantes_excelente: number
    estudiantes_bueno: number
    estudiantes_regular: number
    estudiantes_malo: number
}

export default function AsistenciaGeneralPage() {
    const { gestionActual } = useGestionGlobal()
    const [reportes, setReportes] = useState<ReporteAsistencia[]>([])
    const [estadisticas, setEstadisticas] = useState<EstadisticasAsistencia | null>(null)
    const [asistenciaPorNivel, setAsistenciaPorNivel] = useState<AsistenciaPorNivel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedNivel, setSelectedNivel] = useState("all")
    const [selectedCurso, setSelectedCurso] = useState("all")
    const [selectedColegio, setSelectedColegio] = useState("all")
    const [niveles, setNiveles] = useState<{ id: number; nombre: string }[]>([])
    const [cursos, setCursos] = useState<{ id: number; nombre: string }[]>([])
    const [colegios, setColegios] = useState<{ id: number; nombre: string }[]>([])

    useEffect(() => {
        fetchData()
        fetchSelectOptions()
    }, [selectedNivel, selectedCurso, selectedColegio, gestionActual])

    const fetchSelectOptions = async () => {
        try {
            const [nivelesRes, cursosRes, colegiosRes] = await Promise.all([
                fetch("/api/niveles"),
                fetch("/api/cursos"),
                fetch("/api/colegios")
            ])

            if (nivelesRes.ok) setNiveles(await nivelesRes.json())
            if (cursosRes.ok) setCursos(await cursosRes.json())
            if (colegiosRes.ok) setColegios(await colegiosRes.json())
        } catch (error) {
            console.error("Error al cargar opciones:", error)
        }
    }

    const fetchData = async () => {
        setIsLoading(true)
        setError("")
        try {
            const params = new URLSearchParams()
            if (selectedNivel !== "all") params.append("nivel", selectedNivel)
            if (selectedCurso !== "all") params.append("curso", selectedCurso)
            if (selectedColegio !== "all") params.append("colegio", selectedColegio)
            if (gestionActual) params.append("gestion", gestionActual.id_gestion.toString())

            const response = await fetch(`/api/admin/reportes/asistencia-general?${params}`)
            if (response.ok) {
                const data = await response.json()
                setReportes(data.reportes || [])
                setEstadisticas(data.estadisticas || null)
                setAsistenciaPorNivel(data.asistencia_por_nivel || [])
            } else {
                setError("Error al cargar los datos")
            }
        } catch (error) {
            console.error("Error al cargar asistencia:", error)
            setError("Error al cargar los datos")
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = async () => {
        try {
            const params = new URLSearchParams()
            if (selectedNivel !== "all") params.append("nivel", selectedNivel)
            if (selectedCurso !== "all") params.append("curso", selectedCurso)
            if (selectedColegio !== "all") params.append("colegio", selectedColegio)
            if (gestionActual) params.append("gestion", gestionActual.id_gestion.toString())

            const response = await fetch(`/api/admin/reportes/asistencia-general/export?${params}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `asistencia-general-${new Date().toISOString().split('T')[0]}.xlsx`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            }
        } catch (error) {
            console.error("Error al exportar:", error)
        }
    }

    const getAsistenciaBadge = (porcentaje: number) => {
        if (porcentaje >= 95) return { label: "Excelente", color: "bg-green-100 text-green-800" }
        if (porcentaje >= 85) return { label: "Buena", color: "bg-blue-100 text-blue-800" }
        if (porcentaje >= 75) return { label: "Regular", color: "bg-yellow-100 text-yellow-800" }
        return { label: "Mala", color: "bg-red-100 text-red-800" }
    }

    const getAsistenciaIcon = (porcentaje: number) => {
        if (porcentaje >= 95) return <CheckCircle className="h-4 w-4 text-green-600" />
        if (porcentaje >= 85) return <TrendingUp className="h-4 w-4 text-blue-600" />
        if (porcentaje >= 75) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
        return <XCircle className="h-4 w-4 text-red-600" />
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Clock className="h-8 w-8 text-blue-600" />
                        Reporte de Asistencia General
                    </h1>
                    <p className="text-muted-foreground">
                        Análisis de asistencia de todos los estudiantes del colegio
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Gestión {gestionActual?.anio || 'N/A'}
                    </Badge>
                    <Button onClick={handleExport} disabled={isLoading}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Colegio</label>
                            <Select value={selectedColegio} onValueChange={setSelectedColegio}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar colegio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los colegios</SelectItem>
                                    {colegios.map((colegio) => (
                                        <SelectItem key={colegio.id} value={colegio.id.toString()}>
                                            {colegio.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Nivel</label>
                            <Select value={selectedNivel} onValueChange={setSelectedNivel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar nivel" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los niveles</SelectItem>
                                    {niveles.map((nivel) => (
                                        <SelectItem key={nivel.id} value={nivel.id.toString()}>
                                            {nivel.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Curso</label>
                            <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar curso" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los cursos</SelectItem>
                                    {cursos.map((curso) => (
                                        <SelectItem key={curso.id} value={curso.id.toString()}>
                                            {curso.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estadísticas Generales */}
            {estadisticas && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Estudiantes</p>
                                    <p className="text-2xl font-bold">{estadisticas.total_estudiantes}</p>
                                </div>
                                <Users className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Promedio Asistencia</p>
                                    <p className="text-2xl font-bold">{Number(estadisticas.promedio_asistencia_general || 0).toFixed(1)}%</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Excelente Asistencia</p>
                                    <p className="text-2xl font-bold text-green-600">{estadisticas.estudiantes_excelente_asistencia}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Mala Asistencia</p>
                                    <p className="text-2xl font-bold text-red-600">{estadisticas.estudiantes_mala_asistencia}</p>
                                </div>
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="detalle" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="detalle">Detalle por Estudiante</TabsTrigger>
                    <TabsTrigger value="niveles">Por Niveles</TabsTrigger>
                </TabsList>

                <TabsContent value="detalle" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Asistencia por Estudiante
                            </CardTitle>
                            <CardDescription>
                                Lista detallada de asistencia de todos los estudiantes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <span className="ml-2">Cargando datos...</span>
                                </div>
                            ) : error ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            ) : reportes.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
                                    <p className="text-muted-foreground">
                                        No se encontraron registros de asistencia con los filtros seleccionados
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Estudiante</TableHead>
                                                <TableHead>Colegio</TableHead>
                                                <TableHead>Nivel - Curso</TableHead>
                                                <TableHead className="text-center">Total Registros</TableHead>
                                                <TableHead className="text-center">Asistencias</TableHead>
                                                <TableHead className="text-center">Faltas</TableHead>
                                                <TableHead className="text-center">Retrasos</TableHead>
                                                <TableHead className="text-center">Licencias</TableHead>
                                                <TableHead className="text-center">% Asistencia</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reportes.map((reporte) => {
                                                const asistencia = getAsistenciaBadge(reporte.porcentaje_asistencia)
                                                return (
                                                    <TableRow key={reporte.id_estudiante} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{reporte.nombre_completo}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{reporte.colegio}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                <p>{reporte.nivel}</p>
                                                                <p className="text-muted-foreground">{reporte.curso} {reporte.paralelo}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-medium">{reporte.total_registros}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                                <span className="font-medium text-green-600">{reporte.asistencias}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <XCircle className="h-4 w-4 text-red-600" />
                                                                <span className="font-medium text-red-600">{reporte.faltas}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                                <span className="font-medium text-yellow-600">{reporte.retrasos}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-medium text-blue-600">{reporte.licencias}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Progress
                                                                    value={reporte.porcentaje_asistencia}
                                                                    className="w-16"
                                                                />
                                                                <span className="text-sm font-medium">{Number(reporte.porcentaje_asistencia || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getAsistenciaIcon(reporte.porcentaje_asistencia)}
                                                                <Badge className={asistencia.color}>
                                                                    {asistencia.label}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="niveles" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <School className="h-5 w-5" />
                                Asistencia por Niveles
                            </CardTitle>
                            <CardDescription>
                                Resumen de asistencia agrupado por nivel educativo
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {asistenciaPorNivel.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
                                    <p className="text-muted-foreground">
                                        No se encontraron datos de asistencia por niveles
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {asistenciaPorNivel.map((nivel) => (
                                        <Card key={nivel.nivel} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <BookOpen className="h-5 w-5" />
                                                    {nivel.nivel}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">Total Estudiantes</span>
                                                    <span className="font-medium">{nivel.total_estudiantes}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">Promedio Asistencia</span>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={nivel.promedio_asistencia} className="w-16" />
                                                        <span className="font-medium">{Number(nivel.promedio_asistencia || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                                        <span>Excelente: {nivel.estudiantes_excelente}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp className="h-3 w-3 text-blue-600" />
                                                        <span>Bueno: {nivel.estudiantes_bueno}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                                        <span>Regular: {nivel.estudiantes_regular}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <XCircle className="h-3 w-3 text-red-600" />
                                                        <span>Malo: {nivel.estudiantes_malo}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
