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
    BarChart3,
    Users,
    BookOpen,
    GraduationCap,
    School,
    Calendar,
    Download,
    Loader2,
    AlertCircle,
    TrendingUp,
    Award,
    Target,
    CheckCircle,
    XCircle,
    Clock,
    Star,
    Building,
    UserCheck,
    BookMarked
} from "lucide-react"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

interface EstadisticasGenerales {
    total_estudiantes: number
    total_profesores: number
    total_aulas: number
    total_materias: number
    total_colegios: number
    promedio_general_colegio: number
    porcentaje_aprobacion_general: number
    promedio_asistencia_general: number
    estudiantes_por_nivel: Array<{
        nivel: string
        total_estudiantes: number
        promedio_general: number
        porcentaje_aprobacion: number
    }>
    profesores_por_colegio: Array<{
        colegio: string
        total_profesores: number
        total_aulas: number
        promedio_general: number
    }>
    materias_mas_demandadas: Array<{
        materia: string
        total_aulas: number
        total_estudiantes: number
        promedio_general: number
    }>
    rendimiento_por_trimestre: Array<{
        trimestre: number
        promedio_general: number
        porcentaje_aprobacion: number
        total_estudiantes: number
    }>
}

export default function EstadisticasGeneralesPage() {
    const { gestionActual } = useGestionGlobal()
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedColegio, setSelectedColegio] = useState("all")
    const [colegios, setColegios] = useState<{ id: number; nombre: string }[]>([])

    useEffect(() => {
        fetchData()
        fetchSelectOptions()
    }, [selectedColegio, gestionActual])

    const fetchSelectOptions = async () => {
        try {
            const response = await fetch("/api/colegios")
            if (response.ok) {
                const data = await response.json()
                setColegios(data)
            }
        } catch (error) {
            console.error("Error al cargar colegios:", error)
        }
    }

    const fetchData = async () => {
        setIsLoading(true)
        setError("")
        try {
            const params = new URLSearchParams()
            if (selectedColegio !== "all") params.append("colegio", selectedColegio)
            if (gestionActual) params.append("gestion", gestionActual.id_gestion.toString())

            const response = await fetch(`/api/admin/reportes/estadisticas-generales?${params}`)
            if (response.ok) {
                const data = await response.json()
                setEstadisticas(data)
            } else {
                setError("Error al cargar los datos")
            }
        } catch (error) {
            console.error("Error al cargar estadísticas:", error)
            setError("Error al cargar los datos")
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = async () => {
        try {
            const params = new URLSearchParams()
            if (selectedColegio !== "all") params.append("colegio", selectedColegio)
            if (gestionActual) params.append("gestion", gestionActual.id_gestion.toString())

            const response = await fetch(`/api/admin/reportes/estadisticas-generales/export?${params}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `estadisticas-generales-${new Date().toISOString().split('T')[0]}.xlsx`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            }
        } catch (error) {
            console.error("Error al exportar:", error)
        }
    }

    const getPerformanceColor = (promedio: number) => {
        if (promedio >= 90) return "text-green-600"
        if (promedio >= 80) return "text-blue-600"
        if (promedio >= 70) return "text-yellow-600"
        if (promedio >= 60) return "text-orange-600"
        return "text-red-600"
    }

    const getPerformanceIcon = (promedio: number) => {
        if (promedio >= 90) return <Star className="h-4 w-4 text-green-600" />
        if (promedio >= 80) return <TrendingUp className="h-4 w-4 text-blue-600" />
        if (promedio >= 70) return <Target className="h-4 w-4 text-yellow-600" />
        if (promedio >= 60) return <AlertCircle className="h-4 w-4 text-orange-600" />
        return <XCircle className="h-4 w-4 text-red-600" />
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                        Estadísticas Generales del Colegio
                    </h1>
                    <p className="text-muted-foreground">
                        Resumen estadístico completo del sistema educativo
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
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Cargando estadísticas...</span>
                </div>
            ) : error ? (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : !estadisticas ? (
                <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
                    <p className="text-muted-foreground">
                        No se encontraron estadísticas con los filtros seleccionados
                    </p>
                </div>
            ) : (
                <>
                    {/* Estadísticas Principales */}
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
                                        <p className="text-sm font-medium text-muted-foreground">Total Profesores</p>
                                        <p className="text-2xl font-bold">{estadisticas.total_profesores}</p>
                                    </div>
                                    <GraduationCap className="h-8 w-8 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Aulas</p>
                                        <p className="text-2xl font-bold">{estadisticas.total_aulas}</p>
                                    </div>
                                    <BookOpen className="h-8 w-8 text-purple-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Materias</p>
                                        <p className="text-2xl font-bold">{estadisticas.total_materias}</p>
                                    </div>
                                    <BookMarked className="h-8 w-8 text-orange-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Indicadores de Rendimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Promedio General</p>
                                        <div className="flex items-center gap-2">
                                            {getPerformanceIcon(estadisticas.promedio_general_colegio)}
                                            <p className={`text-2xl font-bold ${getPerformanceColor(estadisticas.promedio_general_colegio)}`}>
                                                {Number(estadisticas.promedio_general_colegio || 0).toFixed(1)}
                                            </p>
                                        </div>
                                    </div>
                                    <BarChart3 className="h-8 w-8 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">% Aprobación</p>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <p className="text-2xl font-bold text-green-600">
                                                {Number(estadisticas.porcentaje_aprobacion_general || 0).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                    <Target className="h-8 w-8 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">% Asistencia</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-blue-600" />
                                            <p className="text-2xl font-bold text-blue-600">
                                                {Number(estadisticas.promedio_asistencia_general || 0).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                    <Clock className="h-8 w-8 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="niveles" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="niveles">Por Niveles</TabsTrigger>
                            <TabsTrigger value="colegios">Por Colegios</TabsTrigger>
                            <TabsTrigger value="materias">Materias Populares</TabsTrigger>
                            <TabsTrigger value="trimestres">Por Trimestres</TabsTrigger>
                        </TabsList>

                        <TabsContent value="niveles" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <School className="h-5 w-5" />
                                        Estadísticas por Niveles Educativos
                                    </CardTitle>
                                    <CardDescription>
                                        Distribución de estudiantes y rendimiento por nivel
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nivel</TableHead>
                                                    <TableHead className="text-center">Total Estudiantes</TableHead>
                                                    <TableHead className="text-center">Promedio General</TableHead>
                                                    <TableHead className="text-center">% Aprobación</TableHead>
                                                    <TableHead className="text-center">Rendimiento</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadisticas.estudiantes_por_nivel.map((nivel) => (
                                                    <TableRow key={nivel.nivel} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <School className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">{nivel.nivel}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline">{nivel.total_estudiantes}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getPerformanceIcon(nivel.promedio_general)}
                                                                <span className={`font-bold ${getPerformanceColor(nivel.promedio_general)}`}>
                                                                    {Number(nivel.promedio_general || 0).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Progress value={nivel.porcentaje_aprobacion} className="w-16" />
                                                                <span className="text-sm font-medium">{Number(nivel.porcentaje_aprobacion || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={
                                                                nivel.promedio_general >= 90 ? "bg-green-100 text-green-800" :
                                                                    nivel.promedio_general >= 80 ? "bg-blue-100 text-blue-800" :
                                                                        nivel.promedio_general >= 70 ? "bg-yellow-100 text-yellow-800" :
                                                                            nivel.promedio_general >= 60 ? "bg-orange-100 text-orange-800" :
                                                                                "bg-red-100 text-red-800"
                                                            }>
                                                                {nivel.promedio_general >= 90 ? "Excelente" :
                                                                    nivel.promedio_general >= 80 ? "Muy Bueno" :
                                                                        nivel.promedio_general >= 70 ? "Bueno" :
                                                                            nivel.promedio_general >= 60 ? "Regular" : "Deficiente"}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="colegios" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="h-5 w-5" />
                                        Estadísticas por Colegios
                                    </CardTitle>
                                    <CardDescription>
                                        Distribución de profesores y rendimiento por colegio
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Colegio</TableHead>
                                                    <TableHead className="text-center">Total Profesores</TableHead>
                                                    <TableHead className="text-center">Total Aulas</TableHead>
                                                    <TableHead className="text-center">Promedio General</TableHead>
                                                    <TableHead className="text-center">Rendimiento</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadisticas.profesores_por_colegio.map((colegio) => (
                                                    <TableRow key={colegio.colegio} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Building className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">{colegio.colegio}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <GraduationCap className="h-4 w-4 text-green-600" />
                                                                <span className="font-medium">{colegio.total_profesores}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <BookOpen className="h-4 w-4 text-purple-600" />
                                                                <span className="font-medium">{colegio.total_aulas}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getPerformanceIcon(colegio.promedio_general)}
                                                                <span className={`font-bold ${getPerformanceColor(colegio.promedio_general)}`}>
                                                                    {Number(colegio.promedio_general || 0).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={
                                                                colegio.promedio_general >= 90 ? "bg-green-100 text-green-800" :
                                                                    colegio.promedio_general >= 80 ? "bg-blue-100 text-blue-800" :
                                                                        colegio.promedio_general >= 70 ? "bg-yellow-100 text-yellow-800" :
                                                                            colegio.promedio_general >= 60 ? "bg-orange-100 text-orange-800" :
                                                                                "bg-red-100 text-red-800"
                                                            }>
                                                                {colegio.promedio_general >= 90 ? "Excelente" :
                                                                    colegio.promedio_general >= 80 ? "Muy Bueno" :
                                                                        colegio.promedio_general >= 70 ? "Bueno" :
                                                                            colegio.promedio_general >= 60 ? "Regular" : "Deficiente"}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="materias" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookMarked className="h-5 w-5" />
                                        Materias Más Demandadas
                                    </CardTitle>
                                    <CardDescription>
                                        Materias con mayor número de aulas y estudiantes
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Materia</TableHead>
                                                    <TableHead className="text-center">Total Aulas</TableHead>
                                                    <TableHead className="text-center">Total Estudiantes</TableHead>
                                                    <TableHead className="text-center">Promedio General</TableHead>
                                                    <TableHead className="text-center">Rendimiento</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadisticas.materias_mas_demandadas.map((materia) => (
                                                    <TableRow key={materia.materia} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <BookMarked className="h-4 w-4 text-orange-600" />
                                                                <span className="font-medium">{materia.materia}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline">{materia.total_aulas}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Users className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">{materia.total_estudiantes}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getPerformanceIcon(materia.promedio_general)}
                                                                <span className={`font-bold ${getPerformanceColor(materia.promedio_general)}`}>
                                                                    {Number(materia.promedio_general || 0).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={
                                                                materia.promedio_general >= 90 ? "bg-green-100 text-green-800" :
                                                                    materia.promedio_general >= 80 ? "bg-blue-100 text-blue-800" :
                                                                        materia.promedio_general >= 70 ? "bg-yellow-100 text-yellow-800" :
                                                                            materia.promedio_general >= 60 ? "bg-orange-100 text-orange-800" :
                                                                                "bg-red-100 text-red-800"
                                                            }>
                                                                {materia.promedio_general >= 90 ? "Excelente" :
                                                                    materia.promedio_general >= 80 ? "Muy Bueno" :
                                                                        materia.promedio_general >= 70 ? "Bueno" :
                                                                            materia.promedio_general >= 60 ? "Regular" : "Deficiente"}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="trimestres" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Rendimiento por Trimestres
                                    </CardTitle>
                                    <CardDescription>
                                        Evolución del rendimiento académico por trimestre
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Trimestre</TableHead>
                                                    <TableHead className="text-center">Total Estudiantes</TableHead>
                                                    <TableHead className="text-center">Promedio General</TableHead>
                                                    <TableHead className="text-center">% Aprobación</TableHead>
                                                    <TableHead className="text-center">Rendimiento</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadisticas.rendimiento_por_trimestre.map((trimestre) => (
                                                    <TableRow key={trimestre.trimestre} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">Trimestre {trimestre.trimestre}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline">{trimestre.total_estudiantes}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getPerformanceIcon(trimestre.promedio_general)}
                                                                <span className={`font-bold ${getPerformanceColor(trimestre.promedio_general)}`}>
                                                                    {Number(trimestre.promedio_general || 0).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Progress value={trimestre.porcentaje_aprobacion} className="w-16" />
                                                                <span className="text-sm font-medium">{Number(trimestre.porcentaje_aprobacion || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={
                                                                trimestre.promedio_general >= 90 ? "bg-green-100 text-green-800" :
                                                                    trimestre.promedio_general >= 80 ? "bg-blue-100 text-blue-800" :
                                                                        trimestre.promedio_general >= 70 ? "bg-yellow-100 text-yellow-800" :
                                                                            trimestre.promedio_general >= 60 ? "bg-orange-100 text-orange-800" :
                                                                                "bg-red-100 text-red-800"
                                                            }>
                                                                {trimestre.promedio_general >= 90 ? "Excelente" :
                                                                    trimestre.promedio_general >= 80 ? "Muy Bueno" :
                                                                        trimestre.promedio_general >= 70 ? "Bueno" :
                                                                            trimestre.promedio_general >= 60 ? "Regular" : "Deficiente"}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    )
}
