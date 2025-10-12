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
    TrendingUp,
    BookOpen,
    Users,
    Award,
    Target,
    BarChart3,
    Calendar,
    Download,
    Loader2,
    AlertCircle,
    GraduationCap,
    School,
    Star,
    TrendingDown,
    CheckCircle,
    XCircle
} from "lucide-react"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

interface RendimientoMateria {
    id_materia: number
    nombre_corto: string
    nombre_completo: string
    colegio: string
    nivel: string
    curso: string
    paralelo: string
    profesor: string
    total_estudiantes: number
    promedio_general: number
    estudiantes_aprobados: number
    estudiantes_reprobados: number
    porcentaje_aprobacion: number
    estudiantes_excelentes: number
    estudiantes_buenos: number
    estudiantes_regulares: number
    estudiantes_deficientes: number
}

interface RendimientoProfesor {
    id_profesor: number
    nombre_profesor: string
    total_materias: number
    total_estudiantes: number
    promedio_general: number
    porcentaje_aprobacion_general: number
    materias_excelentes: number
    materias_buenas: number
    materias_regulares: number
    materias_deficientes: number
}

interface EstadisticasGenerales {
    total_materias: number
    total_profesores: number
    promedio_general_colegio: number
    porcentaje_aprobacion_general: number
    materias_excelentes: number
    materias_buenas: number
    materias_regulares: number
    materias_deficientes: number
}

export default function RendimientoMateriasPage() {
    const { gestionActual } = useGestionGlobal()
    const [rendimientoMaterias, setRendimientoMaterias] = useState<RendimientoMateria[]>([])
    const [rendimientoProfesores, setRendimientoProfesores] = useState<RendimientoProfesor[]>([])
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null)
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

            const response = await fetch(`/api/admin/reportes/rendimiento-materias?${params}`)
            if (response.ok) {
                const data = await response.json()
                setRendimientoMaterias(data.rendimientoMaterias || [])
                setRendimientoProfesores(data.rendimientoProfesores || [])
                setEstadisticas(data.estadisticas || null)
            } else {
                setError("Error al cargar los datos")
            }
        } catch (error) {
            console.error("Error al cargar rendimiento:", error)
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

            const response = await fetch(`/api/admin/reportes/rendimiento-materias/export?${params}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `rendimiento-materias-${new Date().toISOString().split('T')[0]}.xlsx`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            }
        } catch (error) {
            console.error("Error al exportar:", error)
        }
    }

    const getRendimientoBadge = (promedio: number) => {
        if (promedio >= 90) return { label: "Excelente", color: "bg-green-100 text-green-800" }
        if (promedio >= 80) return { label: "Muy Bueno", color: "bg-blue-100 text-blue-800" }
        if (promedio >= 70) return { label: "Bueno", color: "bg-yellow-100 text-yellow-800" }
        if (promedio >= 60) return { label: "Regular", color: "bg-orange-100 text-orange-800" }
        return { label: "Deficiente", color: "bg-red-100 text-red-800" }
    }

    const getRendimientoIcon = (promedio: number) => {
        if (promedio >= 90) return <Star className="h-4 w-4 text-green-600" />
        if (promedio >= 80) return <TrendingUp className="h-4 w-4 text-blue-600" />
        if (promedio >= 70) return <Target className="h-4 w-4 text-yellow-600" />
        if (promedio >= 60) return <AlertCircle className="h-4 w-4 text-orange-600" />
        return <TrendingDown className="h-4 w-4 text-red-600" />
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        Rendimiento por Materias
                    </h1>
                    <p className="text-muted-foreground">
                        Análisis del rendimiento académico por materia y profesor
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
                                    <p className="text-sm font-medium text-muted-foreground">Total Materias</p>
                                    <p className="text-2xl font-bold">{estadisticas.total_materias}</p>
                                </div>
                                <BookOpen className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Promedio General</p>
                                    <p className="text-2xl font-bold">{Number(estadisticas.promedio_general_colegio || 0).toFixed(1)}</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">% Aprobación</p>
                                    <p className="text-2xl font-bold text-green-600">{Number(estadisticas.porcentaje_aprobacion_general || 0).toFixed(1)}%</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Materias Excelentes</p>
                                    <p className="text-2xl font-bold text-green-600">{estadisticas.materias_excelentes}</p>
                                </div>
                                <Star className="h-8 w-8 text-yellow-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="materias" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="materias">Por Materias</TabsTrigger>
                    <TabsTrigger value="profesores">Por Profesores</TabsTrigger>
                </TabsList>

                <TabsContent value="materias" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Rendimiento por Materias
                            </CardTitle>
                            <CardDescription>
                                Análisis detallado del rendimiento por materia
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
                            ) : rendimientoMaterias.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
                                    <p className="text-muted-foreground">
                                        No se encontraron datos de rendimiento con los filtros seleccionados
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Materia</TableHead>
                                                <TableHead>Profesor</TableHead>
                                                <TableHead>Colegio</TableHead>
                                                <TableHead>Nivel - Curso</TableHead>
                                                <TableHead className="text-center">Estudiantes</TableHead>
                                                <TableHead className="text-center">Promedio</TableHead>
                                                <TableHead className="text-center">Aprobados</TableHead>
                                                <TableHead className="text-center">% Aprobación</TableHead>
                                                <TableHead className="text-center">Rendimiento</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rendimientoMaterias.map((materia) => {
                                                const rendimiento = getRendimientoBadge(materia.promedio_general)
                                                return (
                                                    <TableRow key={`${materia.id_materia}-${materia.colegio}-${materia.nivel}-${materia.curso}-${materia.paralelo}`} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{materia.nombre_corto}</p>
                                                                <p className="text-sm text-muted-foreground">{materia.nombre_completo}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <GraduationCap className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">{materia.profesor}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{materia.colegio}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                <p>{materia.nivel}</p>
                                                                <p className="text-muted-foreground">{materia.curso} {materia.paralelo}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Users className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">{materia.total_estudiantes}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getRendimientoIcon(materia.promedio_general)}
                                                                <span className="text-lg font-bold">{Number(materia.promedio_general || 0).toFixed(1)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                                <span className="font-medium text-green-600">{materia.estudiantes_aprobados}</span>
                                                                <span className="text-muted-foreground">/</span>
                                                                <span className="text-muted-foreground">{materia.total_estudiantes}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Progress
                                                                    value={materia.porcentaje_aprobacion}
                                                                    className="w-16"
                                                                />
                                                                <span className="text-sm font-medium">{Number(materia.porcentaje_aprobacion || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={rendimiento.color}>
                                                                {rendimiento.label}
                                                            </Badge>
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

                <TabsContent value="profesores" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5" />
                                Rendimiento por Profesores
                            </CardTitle>
                            <CardDescription>
                                Análisis del rendimiento agrupado por profesor
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {rendimientoProfesores.length === 0 ? (
                                <div className="text-center py-12">
                                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
                                    <p className="text-muted-foreground">
                                        No se encontraron datos de rendimiento por profesores
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Profesor</TableHead>
                                                <TableHead className="text-center">Materias</TableHead>
                                                <TableHead className="text-center">Total Estudiantes</TableHead>
                                                <TableHead className="text-center">Promedio General</TableHead>
                                                <TableHead className="text-center">% Aprobación</TableHead>
                                                <TableHead className="text-center">Materias Excelentes</TableHead>
                                                <TableHead className="text-center">Materias Buenas</TableHead>
                                                <TableHead className="text-center">Materias Regulares</TableHead>
                                                <TableHead className="text-center">Materias Deficientes</TableHead>
                                                <TableHead className="text-center">Rendimiento</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rendimientoProfesores.map((profesor) => {
                                                const rendimiento = getRendimientoBadge(profesor.promedio_general)
                                                return (
                                                    <TableRow key={profesor.id_profesor} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <GraduationCap className="h-5 w-5 text-blue-600" />
                                                                <span className="font-medium">{profesor.nombre_profesor}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline">{profesor.total_materias}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Users className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">{profesor.total_estudiantes}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {getRendimientoIcon(profesor.promedio_general)}
                                                                <span className="text-lg font-bold">{Number(profesor.promedio_general || 0).toFixed(1)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Progress
                                                                    value={profesor.porcentaje_aprobacion_general}
                                                                    className="w-16"
                                                                />
                                                                <span className="text-sm font-medium">{Number(profesor.porcentaje_aprobacion_general || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className="bg-green-100 text-green-800">{profesor.materias_excelentes}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className="bg-blue-100 text-blue-800">{profesor.materias_buenas}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className="bg-yellow-100 text-yellow-800">{profesor.materias_regulares}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className="bg-red-100 text-red-800">{profesor.materias_deficientes}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={rendimiento.color}>
                                                                {rendimiento.label}
                                                            </Badge>
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
            </Tabs>
        </div>
    )
}
