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
    porcentaje_reprobacion_general: number
    promedio_asistencia_general: number
    estudiantes_por_nivel: Array<{
        nivel: string
        total_estudiantes: number
        promedio_general: number
        porcentaje_aprobacion: number
        porcentaje_reprobacion: number
    }>
    profesores_por_colegio: Array<{
        colegio: string
        total_profesores: number
        total_aulas: number
        promedio_general: number
    }>
    materias_mas_demandadas: Array<{
        materia: string
        nivel: string
        total_aulas: number
        total_estudiantes: number
        promedio_general: number
    }>
    rendimiento_por_trimestre: Array<{
        trimestre: number
        nivel: string
        promedio_general: number
        porcentaje_aprobacion: number
        porcentaje_reprobacion: number
        total_estudiantes: number
    }>
    rendimiento_curso_materia: Array<{
        curso: string
        materia: string
        total_estudiantes: number
        promedio_general: number
        porcentaje_aprobacion: number
        porcentaje_reprobacion: number
    }>
}

export default function EstadisticasGeneralesPage() {
    const { gestionActual } = useGestionGlobal()
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedColegio, setSelectedColegio] = useState("all")
    const [selectedNivel, setSelectedNivel] = useState("all")
    const [selectedProfesor, setSelectedProfesor] = useState("all")
    const [selectedCurso, setSelectedCurso] = useState("all")
    const [selectedMateria, setSelectedMateria] = useState("all")
    const [colegios, setColegios] = useState<{ id: number; nombre: string }[]>([])
    const [niveles, setNiveles] = useState<{ id: number; nombre: string }[]>([])
    const [profesores, setProfesores] = useState<{ id: number; nombre_completo: string }[]>([])
    const [cursos, setCursos] = useState<{ id: number; nombre: string }[]>([])
    const [materias, setMaterias] = useState<{ id: number; nombre_corto: string }[]>([])

    useEffect(() => {
        fetchData()
        fetchSelectOptions()
    }, [selectedColegio, selectedNivel, selectedProfesor, selectedCurso, selectedMateria, gestionActual])

    const fetchSelectOptions = async () => {
        try {
            const [colegiosRes, nivelesRes, profesoresRes, cursosRes, materiasRes] = await Promise.all([
                fetch("/api/colegios"),
                fetch("/api/niveles"),
                fetch("/api/profesores"),
                fetch("/api/cursos"),
                fetch("/api/materias")
            ])
            if (colegiosRes.ok) setColegios(await colegiosRes.json())
            if (nivelesRes.ok) setNiveles(await nivelesRes.json())
            if (profesoresRes.ok) setProfesores(await profesoresRes.json())
            if (cursosRes.ok) setCursos(await cursosRes.json())
            if (materiasRes.ok) setMaterias(await materiasRes.json())
        } catch (error) {
            console.error("Error al cargar opciones:", error)
        }
    }

    const fetchData = async () => {
        setIsLoading(true)
        setError("")
        try {
            const params = new URLSearchParams()
            if (selectedColegio !== "all") params.append("colegio", selectedColegio)
            if (selectedNivel !== "all") params.append("nivel", selectedNivel)
            if (selectedProfesor !== "all") params.append("profesor", selectedProfesor)
            if (selectedCurso !== "all") params.append("curso", selectedCurso)
            if (selectedMateria !== "all") params.append("materia", selectedMateria)
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
            if (selectedNivel !== "all") params.append("nivel", selectedNivel)
            if (selectedProfesor !== "all") params.append("profesor", selectedProfesor)
            if (selectedCurso !== "all") params.append("curso", selectedCurso)
            if (selectedMateria !== "all") params.append("materia", selectedMateria)
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
                        Estadísticas Generales
                    </h1>
                    <p className="text-muted-foreground">
                        Total de estudiantes, rendimiento por curso y materia
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
                    <CardDescription>Filtra las estadísticas por diferentes criterios</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Colegio</label>
                            <Select value={selectedColegio} onValueChange={setSelectedColegio}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
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
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
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
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {cursos.map((curso) => (
                                        <SelectItem key={curso.id} value={curso.id.toString()}>
                                            {curso.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Profesor</label>
                            <Select value={selectedProfesor} onValueChange={setSelectedProfesor}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {profesores.map((profesor) => (
                                        <SelectItem key={profesor.id} value={profesor.id.toString()}>
                                            {profesor.nombre_completo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Materia</label>
                            <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {materias.map((materia) => (
                                        <SelectItem key={materia.id} value={materia.id.toString()}>
                                            {materia.nombre_corto}
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
                                        <p className="text-sm font-medium text-muted-foreground">Estudiantes Totales</p>
                                        <p className="text-3xl font-bold">{estadisticas.total_estudiantes}</p>
                                        <p className="text-xs text-muted-foreground mt-1">en el colegio</p>
                                    </div>
                                    <Users className="h-10 w-10 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Promedio General</p>
                                        <div className="flex items-center gap-2">
                                            {getPerformanceIcon(estadisticas.promedio_general_colegio)}
                                            <p className={`text-3xl font-bold ${getPerformanceColor(estadisticas.promedio_general_colegio)}`}>
                                                {Number(estadisticas.promedio_general_colegio || 0).toFixed(1)}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">del colegio</p>
                                    </div>
                                    <BarChart3 className="h-10 w-10 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Aprobados</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {Number(estadisticas.porcentaje_aprobacion_general || 0).toFixed(0)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">de estudiantes</p>
                                    </div>
                                    <CheckCircle className="h-10 w-10 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Reprobados</p>
                                        <p className="text-3xl font-bold text-red-600">
                                            {Number(estadisticas.porcentaje_reprobacion_general || 0).toFixed(0)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">de estudiantes</p>
                                    </div>
                                    <XCircle className="h-10 w-10 text-red-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>


                    <Tabs defaultValue="curso-materia" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="curso-materia">Rendimiento por Curso y Materia</TabsTrigger>
                            <TabsTrigger value="niveles">Por Niveles</TabsTrigger>
                            <TabsTrigger value="trimestres">Por Trimestres</TabsTrigger>
                        </TabsList>

                        <TabsContent value="curso-materia" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5" />
                                        Rendimiento por Curso y Materia
                                    </CardTitle>
                                    <CardDescription>
                                        Desempeño académico detallado por curso y materia
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Curso</TableHead>
                                                    <TableHead>Materia</TableHead>
                                                    <TableHead className="text-center">Estudiantes</TableHead>
                                                    <TableHead className="text-center">Promedio</TableHead>
                                                    <TableHead className="text-center">Aprobados</TableHead>
                                                    <TableHead className="text-center">Reprobados</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadisticas.rendimiento_curso_materia.map((item, idx) => (
                                                    <TableRow key={`${item.curso}-${item.materia}-${idx}`} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <span className="font-semibold text-base">{item.curso}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{item.materia}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold">{item.total_estudiantes}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getPerformanceIcon(item.promedio_general)}
                                                                <span className={`text-lg font-bold ${getPerformanceColor(item.promedio_general)}`}>
                                                                    {Number(item.promedio_general || 0).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold text-green-600">
                                                                {Number(item.porcentaje_aprobacion || 0).toFixed(0)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold text-red-600">
                                                                {Number(item.porcentaje_reprobacion || 0).toFixed(0)}%
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="niveles" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <School className="h-5 w-5" />
                                        Rendimiento por Niveles
                                    </CardTitle>
                                    <CardDescription>
                                        Comparación de rendimiento académico entre niveles
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nivel</TableHead>
                                                    <TableHead className="text-center">Estudiantes</TableHead>
                                                    <TableHead className="text-center">Promedio</TableHead>
                                                    <TableHead className="text-center">Aprobados</TableHead>
                                                    <TableHead className="text-center">Reprobados</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadisticas.estudiantes_por_nivel.map((nivel) => (
                                                    <TableRow key={nivel.nivel} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <span className="font-semibold text-base">{nivel.nivel}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold">{nivel.total_estudiantes}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getPerformanceIcon(nivel.promedio_general)}
                                                                <span className={`text-lg font-bold ${getPerformanceColor(nivel.promedio_general)}`}>
                                                                    {Number(nivel.promedio_general || 0).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold text-green-600">
                                                                {Number(nivel.porcentaje_aprobacion || 0).toFixed(0)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold text-red-600">
                                                                {Number(nivel.porcentaje_reprobacion || 0).toFixed(0)}%
                                                            </span>
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
                                        Evolución por Trimestres
                                    </CardTitle>
                                    <CardDescription>
                                        Comparación del rendimiento entre trimestres por nivel
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Trimestre</TableHead>
                                                    <TableHead className="text-center">Nivel</TableHead>
                                                    <TableHead className="text-center">Promedio</TableHead>
                                                    <TableHead className="text-center">Aprobados</TableHead>
                                                    <TableHead className="text-center">Reprobados</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadisticas.rendimiento_por_trimestre.map((trimestre, idx) => (
                                                    <TableRow key={`${trimestre.trimestre}-${trimestre.nivel}-${idx}`} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <span className="font-semibold text-base">Trimestre {trimestre.trimestre}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline">{trimestre.nivel}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getPerformanceIcon(trimestre.promedio_general)}
                                                                <span className={`text-lg font-bold ${getPerformanceColor(trimestre.promedio_general)}`}>
                                                                    {Number(trimestre.promedio_general || 0).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold text-green-600">
                                                                {Number(trimestre.porcentaje_aprobacion || 0).toFixed(0)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-lg font-bold text-red-600">
                                                                {Number(trimestre.porcentaje_reprobacion || 0).toFixed(0)}%
                                                            </span>
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
