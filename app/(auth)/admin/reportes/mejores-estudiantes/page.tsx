"use client"

import { useState, useEffect, Fragment } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Award,
    Trophy,
    Medal,
    Star,
    Download,
    Loader2,
    AlertCircle,
    TrendingUp,
    Users,
    BookOpen,
    Calendar,
    Target,
    ChevronUp,
    ChevronDown
} from "lucide-react"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

interface MejorEstudiante {
    id_estudiante: number
    nombres: string
    apellido_paterno: string
    apellido_materno: string
    nombre_completo: string
    promedio_general: number
    total_materias: number
    materias_aprobadas: number
    materias_reprobadas: number
    porcentaje_aprobacion: number
    nivel: string
    curso: string
    paralelo: string
    colegio: string
    ranking: number
}

interface EstadisticasGenerales {
    total_estudiantes: number
    promedio_colegio: number
    estudiantes_excelentes: number
    estudiantes_buenos: number
    estudiantes_regulares: number
    estudiantes_deficientes: number
}

export default function MejoresEstudiantesPage() {
    const { gestionActual } = useGestionGlobal()
    const [estudiantes, setEstudiantes] = useState<MejorEstudiante[]>([])
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedNivel, setSelectedNivel] = useState("all")
    const [selectedCurso, setSelectedCurso] = useState("all")
    const [selectedParalelo, setSelectedParalelo] = useState("all")
    const [selectedColegio, setSelectedColegio] = useState("all")
    
    // Función para manejar cambio de colegio y resetear dependientes
    const handleColegioChange = (value: string) => {
        setSelectedColegio(value)
        setSelectedNivel("all")
        setSelectedCurso("all")
        setSelectedParalelo("all")
    }
    
    // Función para manejar cambio de nivel y resetear dependientes
    const handleNivelChange = (value: string) => {
        setSelectedNivel(value)
        setSelectedCurso("all")
        setSelectedParalelo("all")
    }
    
    // Función para manejar cambio de curso y resetear dependientes
    const handleCursoChange = (value: string) => {
        setSelectedCurso(value)
        setSelectedParalelo("all")
    }
    const [cantidadTop, setCantidadTop] = useState(3)
    const [niveles, setNiveles] = useState<{ id: number; nombre: string }[]>([])
    const [cursos, setCursos] = useState<{ id: number; nombre: string }[]>([])
    const [paralelos, setParalelos] = useState<{ id: number; nombre: string }[]>([])
    const [colegios, setColegios] = useState<{ id: number; nombre: string }[]>([])

    useEffect(() => {
        fetchData()
        fetchSelectOptions()
    }, [selectedNivel, selectedCurso, selectedParalelo, selectedColegio, cantidadTop, gestionActual])

    const fetchSelectOptions = async () => {
        try {
            const [nivelesRes, cursosRes, paralelosRes, colegiosRes] = await Promise.all([
                fetch("/api/niveles"),
                fetch("/api/cursos"),
                fetch("/api/paralelos"),
                fetch("/api/colegios")
            ])

            if (nivelesRes.ok) setNiveles(await nivelesRes.json())
            if (cursosRes.ok) setCursos(await cursosRes.json())
            if (paralelosRes.ok) setParalelos(await paralelosRes.json())
            if (colegiosRes.ok) setColegios(await colegiosRes.json())
        } catch (error) {
            console.error("Error al cargar opciones:", error)
        }
    }

    // Determinar el tipo de reporte según los filtros seleccionados
    const getTipoReporte = () => {
        if (selectedParalelo !== "all") return "paralelo"
        if (selectedCurso !== "all" || selectedNivel !== "all") return "curso"
        return "colegio"
    }

    const fetchData = async () => {
        setIsLoading(true)
        setError("")
        try {
            const params = new URLSearchParams()
            if (selectedNivel !== "all") params.append("nivel", selectedNivel)
            if (selectedCurso !== "all") params.append("curso", selectedCurso)
            if (selectedParalelo !== "all") params.append("paralelo", selectedParalelo)
            if (selectedColegio !== "all") params.append("colegio", selectedColegio)
            params.append("cantidad", cantidadTop.toString())
            params.append("tipo", getTipoReporte())
            if (gestionActual) params.append("gestion", gestionActual.id_gestion.toString())

            const response = await fetch(`/api/admin/reportes/mejores-estudiantes?${params}`)
            if (response.ok) {
                const data = await response.json()
                setEstudiantes(data.estudiantes || [])
                setEstadisticas(data.estadisticas || null)
            } else {
                setError("Error al cargar los datos")
            }
        } catch (error) {
            console.error("Error al cargar mejores estudiantes:", error)
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
            if (selectedParalelo !== "all") params.append("paralelo", selectedParalelo)
            if (selectedColegio !== "all") params.append("colegio", selectedColegio)
            params.append("cantidad", cantidadTop.toString())
            params.append("tipo", getTipoReporte())
            if (gestionActual) params.append("gestion", gestionActual.id_gestion.toString())

            const response = await fetch(`/api/admin/reportes/mejores-estudiantes/export?${params}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `mejores-estudiantes-${new Date().toISOString().split('T')[0]}.xlsx`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            }
        } catch (error) {
            console.error("Error al exportar:", error)
        }
    }

    const getRankingIcon = (ranking: number) => {
        if (ranking === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
        if (ranking === 2) return <Medal className="h-5 w-5 text-gray-400" />
        if (ranking === 3) return <Medal className="h-5 w-5 text-amber-600" />
        return <Award className="h-5 w-5 text-blue-500" />
    }

    const getRankingColor = (ranking: number) => {
        if (ranking === 1) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        if (ranking === 2) return "bg-gray-100 text-gray-800 border-gray-200"
        if (ranking === 3) return "bg-amber-100 text-amber-800 border-amber-200"
        return "bg-blue-100 text-blue-800 border-blue-200"
    }

    const getPerformanceBadge = (promedio: number) => {
        if (promedio >= 90) return { label: "Excelente", color: "bg-green-100 text-green-800" }
        if (promedio >= 80) return { label: "Muy Bueno", color: "bg-blue-100 text-blue-800" }
        if (promedio >= 70) return { label: "Bueno", color: "bg-yellow-100 text-yellow-800" }
        if (promedio >= 60) return { label: "Regular", color: "bg-orange-100 text-orange-800" }
        return { label: "Deficiente", color: "bg-red-100 text-red-800" }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Award className="h-8 w-8 text-yellow-600" />
                        Mejores Estudiantes
                    </h1>
                    <p className="text-muted-foreground">
                        Top {cantidadTop} estudiantes con mejor rendimiento académico
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
                    <CardTitle className="text-lg">Configuración del Reporte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Cantidad */}
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Cantidad de Mejores Estudiantes</label>
                            <Input
                                type="number"
                                min="1"
                                max="50"
                                value={cantidadTop}
                                onChange={(e) => setCantidadTop(Number(e.target.value))}
                                placeholder="Ej: 3"
                                className="max-w-xs"
                            />
                        </div>
                    </div>

                    {/* Filtros - Siempre visibles */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Colegio</label>
                            <Select value={selectedColegio} onValueChange={handleColegioChange}>
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
                            <Select 
                                value={selectedNivel} 
                                onValueChange={handleNivelChange}
                                disabled={selectedColegio === "all"}
                            >
                                <SelectTrigger disabled={selectedColegio === "all"}>
                                    <SelectValue placeholder={selectedColegio === "all" ? "Primero selecciona colegio" : "Seleccionar nivel"} />
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
                            <Select 
                                value={selectedCurso} 
                                onValueChange={handleCursoChange}
                                disabled={selectedNivel === "all"}
                            >
                                <SelectTrigger disabled={selectedNivel === "all"}>
                                    <SelectValue placeholder={selectedNivel === "all" ? "Primero selecciona nivel" : "Seleccionar curso"} />
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

                        <div>
                            <label className="text-sm font-medium mb-2 block">Paralelo</label>
                            <Select 
                                value={selectedParalelo} 
                                onValueChange={setSelectedParalelo}
                                disabled={selectedCurso === "all"}
                            >
                                <SelectTrigger disabled={selectedCurso === "all"}>
                                    <SelectValue placeholder={selectedCurso === "all" ? "Primero selecciona curso" : "Seleccionar paralelo"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los paralelos</SelectItem>
                                    {paralelos.map((paralelo) => (
                                        <SelectItem key={paralelo.id} value={paralelo.id.toString()}>
                                            {paralelo.nombre}
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
                                    <p className="text-sm font-medium text-muted-foreground">Promedio del Colegio</p>
                                    <p className="text-2xl font-bold">{Number(estadisticas.promedio_colegio || 0).toFixed(1)}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Excelentes (90+)</p>
                                    <p className="text-2xl font-bold text-green-600">{estadisticas.estudiantes_excelentes}</p>
                                </div>
                                <Star className="h-8 w-8 text-yellow-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Buenos (80-89)</p>
                                    <p className="text-2xl font-bold text-blue-600">{estadisticas.estudiantes_buenos}</p>
                                </div>
                                <Target className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabla de Mejores Estudiantes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Ranking de Estudiantes
                    </CardTitle>
                    <CardDescription>
                        Lista ordenada por promedio general de mayor a menor
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
                    ) : estudiantes.length === 0 ? (
                        <div className="text-center py-12">
                            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
                            <p className="text-muted-foreground">
                                No se encontraron estudiantes con los filtros seleccionados
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Ranking</TableHead>
                                        <TableHead>Estudiante</TableHead>
                                        <TableHead>Colegio</TableHead>
                                        <TableHead>Nivel - Curso</TableHead>
                                        <TableHead className="text-center">Promedio</TableHead>
                                        <TableHead className="text-center">Materias</TableHead>
                                        <TableHead className="text-center">% Aprobación</TableHead>
                                        <TableHead className="text-center">Rendimiento</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {estudiantes.map((estudiante, index) => {
                                        const performance = getPerformanceBadge(estudiante.promedio_general)
                                        const tipoActual = getTipoReporte()
                                        const showCursoSeparator = tipoActual === "curso" && index > 0 && estudiantes[index - 1].curso !== estudiante.curso
                                        const showParaleloSeparator = tipoActual === "paralelo" && index > 0 && 
                                            (estudiantes[index - 1].curso !== estudiante.curso || estudiantes[index - 1].paralelo !== estudiante.paralelo)
                                        
                                        return (
                                            <Fragment key={`estudiante-${estudiante.id_estudiante}-${index}`}>
                                                {showCursoSeparator && (
                                                    <TableRow className="bg-muted/30">
                                                        <TableCell colSpan={8} className="text-center font-semibold py-2">
                                                            📚 {estudiante.curso}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {showParaleloSeparator && (
                                                    <TableRow className="bg-muted/30">
                                                        <TableCell colSpan={8} className="text-center font-semibold py-2">
                                                            📚 {estudiante.curso} - Paralelo {estudiante.paralelo}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                <TableRow className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getRankingIcon(estudiante.ranking || (index + 1))}
                                                            <span className="font-bold">#{estudiante.ranking || (index + 1)}</span>
                                                        </div>
                                                    </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{estudiante.nombre_completo}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{estudiante.colegio}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <p>{estudiante.nivel}</p>
                                                        <p className="text-muted-foreground">
                                                            {estudiante.curso}{estudiante.paralelo ? ` - ${estudiante.paralelo}` : ''}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-lg font-bold">{Number(estudiante.promedio_general || 0).toFixed(1)}</span>
                                                        {estudiante.promedio_general >= 90 && <ChevronUp className="h-4 w-4 text-green-600" />}
                                                        {estudiante.promedio_general < 60 && <ChevronDown className="h-4 w-4 text-red-600" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="text-sm">
                                                        <p>{estudiante.materias_aprobadas}/{estudiante.total_materias}</p>
                                                        <p className="text-muted-foreground">aprobadas</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center">
                                                        <Progress
                                                            value={estudiante.porcentaje_aprobacion}
                                                            className="w-16 mr-2"
                                                        />
                                                        <span className="text-sm font-medium">{Number(estudiante.porcentaje_aprobacion || 0).toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={performance.color}>
                                                        {performance.label}
                                                    </Badge>
                                                </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
