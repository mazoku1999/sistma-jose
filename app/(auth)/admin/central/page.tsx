"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Users,
    Loader2,
    Save,
    Calculator,
    TrendingUp,
    AlertTriangle,
    BookOpen,
    Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"

interface Estudiante {
    id_estudiante: number
    nombres?: string
    apellido_paterno?: string
    apellido_materno?: string
    nombre_completo: string
}

interface NotaCentralizada {
    id_estudiante: number
    id_materia: number
    materia_nombre: string
    materia_corto: string
    nota_final: number
}

interface SelectOption {
    id: number
    nombre: string
    nombre_corto?: string
}

export default function CentralPage() {
    const { toast } = useToast()
    const { user, isLoading: isAuthLoading } = useAuth()

    const [colegios, setColegios] = useState<SelectOption[]>([])
    const [niveles, setNiveles] = useState<SelectOption[]>([])
    const [cursos, setCursos] = useState<SelectOption[]>([])
    const [paralelos, setParalelos] = useState<SelectOption[]>([])
    const [materias, setMaterias] = useState<SelectOption[]>([])

    const [selectedColegio, setSelectedColegio] = useState("")
    const [selectedNivel, setSelectedNivel] = useState("")
    const [selectedCurso, setSelectedCurso] = useState("")
    const [selectedParalelo, setSelectedParalelo] = useState("")
    const [selectedTrimestre, setSelectedTrimestre] = useState("1")

    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
    const [notasCentralizadas, setNotasCentralizadas] = useState<Record<string, NotaCentralizada>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    // Derivar permisos directamente del usuario autenticado
    const canCentralize = !!user?.roles?.includes("ADMIN") || !!user?.roles?.includes("ADMINISTRATIVO")

    useEffect(() => {
        fetchSelectOptions()
    }, [])

    useEffect(() => {
        if (selectedColegio && selectedNivel && selectedCurso && selectedParalelo) {
            fetchEstudiantesYNotas()
        }
    }, [selectedColegio, selectedNivel, selectedCurso, selectedParalelo, selectedTrimestre])

    const fetchSelectOptions = async () => {
        try {
            // Cargar opciones básicas (sin materias, se cargan por curso)
            const [colegiosRes, nivelesRes, cursosRes, paralelosRes] = await Promise.all([
                fetch("/api/colegios"),
                fetch("/api/niveles"),
                fetch("/api/cursos"),
                fetch("/api/paralelos")
            ])

            if (colegiosRes.ok) setColegios(await colegiosRes.json())
            if (nivelesRes.ok) setNiveles(await nivelesRes.json())
            if (cursosRes.ok) setCursos(await cursosRes.json())
            if (paralelosRes.ok) setParalelos(await paralelosRes.json())
        } catch (error) {
            console.error("Error al cargar opciones:", error)
        }
    }

    // Eliminado: verificación de permisos por API. Middleware + useAuth cubren esto.

    const fetchEstudiantesYNotas = async () => {
        if (!selectedColegio || !selectedNivel || !selectedCurso || !selectedParalelo) return

        setIsLoading(true)
        try {
            const response = await fetch(
                `/api/central/notas?colegio=${selectedColegio}&nivel=${selectedNivel}&curso=${selectedCurso}&paralelo=${selectedParalelo}&trimestre=${selectedTrimestre}`
            )

            if (response.ok) {
                const data = await response.json()
                setEstudiantes(data.estudiantes || [])

                // Establecer las materias del curso/paralelo
                const materiasDelCurso = (data.materias || []).map((materia: any) => ({
                    id: materia.id_materia,
                    nombre: materia.nombre_completo,
                    // nombre_corto opcional, solo para visual
                    nombre_corto: materia.nombre_corto as string | undefined
                }))
                setMaterias(materiasDelCurso)

                // Organizar notas por estudiante y materia
                const notasMap: Record<string, NotaCentralizada> = {}

                // Primero, crear entradas con 0 para todas las combinaciones estudiante-materia
                data.estudiantes?.forEach((estudiante: Estudiante) => {
                    materiasDelCurso.forEach((materia: any) => {
                        const key = `${estudiante.id_estudiante}-${materia.id}`
                        notasMap[key] = {
                            id_estudiante: estudiante.id_estudiante,
                            id_materia: materia.id,
                            materia_nombre: materia.nombre,
                            materia_corto: materia.nombre_corto,
                            nota_final: 0
                        }
                    })
                })

                // Luego, actualizar con las notas reales que existen
                if (data.notas) {
                    data.notas.forEach((nota: any) => {
                        const key = `${nota.id_estudiante}-${nota.id_materia}`
                        if (notasMap[key]) {
                            notasMap[key].nota_final = nota.nota_final || 0
                        }
                    })
                }

                setNotasCentralizadas(notasMap)
            } else {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los datos",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al cargar datos:", error)
            toast({
                title: "Error",
                description: "Error al cargar los datos",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleNotaChange = (estudianteId: number, materiaId: number, valor: string) => {
        const nota = parseFloat(valor)
        if (isNaN(nota) || nota < 0 || nota > 100) {
            return
        }

        const key = `${estudianteId}-${materiaId}`
        const materia = materias.find(m => m.id === materiaId)

        setNotasCentralizadas(prev => ({
            ...prev,
            [key]: {
                id_estudiante: estudianteId,
                id_materia: materiaId,
                materia_nombre: materia?.nombre || "",
                materia_corto: materia?.nombre || "",
                nota_final: nota
            }
        }))
        setHasChanges(true)
    }

    const rellenarAleatorio = () => {
        if (estudiantes.length === 0 || materias.length === 0) {
            toast({ title: "Sin datos", description: "Selecciona curso, paralelo y trimestre.", variant: "destructive" })
            return
        }
        const nuevo: Record<string, NotaCentralizada> = { ...notasCentralizadas }
        for (const est of estudiantes) {
            for (const mat of materias) {
                const key = `${est.id_estudiante}-${mat.id}`
                // Asignar siempre una nota entre 50 y 100 (nunca 0)
                const valor = Math.round(50 + Math.random() * 50)
                nuevo[key] = {
                    id_estudiante: est.id_estudiante,
                    id_materia: mat.id,
                    materia_nombre: mat.nombre,
                    materia_corto: mat.nombre_corto || mat.nombre,
                    nota_final: valor
                }
            }
        }
        setNotasCentralizadas(nuevo)
        setHasChanges(true)
        toast({ title: "Notas generadas", description: "Se rellenaron notas aleatorias para las materias visibles." })
    }

    const handleCentralizarNotas = async () => {
        if (!canCentralize) {
            toast({
                title: "Sin permisos",
                description: "No tienes permisos para centralizar notas",
                variant: "destructive",
            })
            return
        }

        if (!hasChanges) return

        setIsSaving(true)
        try {
            const notasArray = Object.values(notasCentralizadas).filter(nota => nota.nota_final > 0)

            const response = await fetch("/api/central/notas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    colegio: parseInt(selectedColegio),
                    nivel: parseInt(selectedNivel),
                    curso: parseInt(selectedCurso),
                    paralelo: parseInt(selectedParalelo),
                    trimestre: parseInt(selectedTrimestre),
                    notas: notasArray
                })
            })

            if (response.ok) {
                toast({
                    title: "Éxito",
                    description: "Notas centralizadas correctamente",
                })
                setHasChanges(false)
                fetchEstudiantesYNotas()
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
            setIsSaving(false)
        }
    }

    const normalizeValue = (value: string | undefined | null) => (value ?? '').toString().trim()

    const deriveNames = (est: Estudiante) => {
        const nombres = normalizeValue(est.nombres)
        const apellido_paterno = normalizeValue(est.apellido_paterno)
        const apellido_materno = normalizeValue(est.apellido_materno)

        if (nombres || apellido_paterno || apellido_materno) {
            return { nombres, apellido_paterno, apellido_materno }
        }

        const nombreCompleto = normalizeValue(est.nombre_completo)
        const parts = nombreCompleto.split(/\s+/).filter(Boolean)

        if (parts.length >= 3) {
            return {
                nombres: parts.slice(0, parts.length - 2).join(' '),
                apellido_paterno: parts[parts.length - 2] || '',
                apellido_materno: parts[parts.length - 1] || '',
            }
        }

        if (parts.length === 2) {
            return {
                nombres: parts[0],
                apellido_paterno: '',
                apellido_materno: parts[1],
            }
        }

        if (parts.length === 1) {
            return {
                nombres: nombreCompleto,
                apellido_paterno: '',
                apellido_materno: '',
            }
        }

        return {
            nombres: '',
            apellido_paterno: '',
            apellido_materno: '',
        }
    }

    const compareEstudiantes = (a: Estudiante, b: Estudiante) => {
        const da = deriveNames(a)
        const db = deriveNames(b)

        const grupoA = da.apellido_paterno ? 1 : 0
        const grupoB = db.apellido_paterno ? 1 : 0
        if (grupoA !== grupoB) return grupoA - grupoB

        const fieldOrder: Array<keyof typeof da> = grupoA === 0
            ? ['apellido_materno', 'nombres']
            : ['apellido_paterno', 'apellido_materno', 'nombres']

        for (const field of fieldOrder) {
            const va = normalizeValue(da[field]).toLocaleLowerCase()
            const vb = normalizeValue(db[field]).toLocaleLowerCase()
            const cmp = va.localeCompare(vb, 'es', { sensitivity: 'base' })
            if (cmp !== 0) return cmp
        }
        return 0
    }

    const sortedEstudiantes = [...estudiantes].sort(compareEstudiantes)

    const getNotaColor = (nota: number) => {
        if (nota >= 90) return "text-green-600 bg-green-50"
        if (nota >= 80) return "text-blue-600 bg-blue-50"
        if (nota >= 70) return "text-yellow-600 bg-yellow-50"
        if (nota >= 60) return "text-orange-600 bg-orange-50"
        return "text-red-600 bg-red-50"
    }

    const getPromedioEstudiante = (estudianteId: number) => {
        // Obtener notas de todas las materias para este estudiante
        const notasEstudiante = materias.map(materia => {
            const key = `${estudianteId}-${materia.id}`
            const nota = notasCentralizadas[key]
            const notaFinal = nota ? parseFloat(nota.nota_final.toString()) : 0
            return isNaN(notaFinal) ? 0 : notaFinal
        })

        if (notasEstudiante.length === 0) return 0

        const suma = notasEstudiante.reduce((acc, nota) => acc + nota, 0)
        return suma / notasEstudiante.length
    }

    const getEstadisticas = () => {
        const totalEstudiantes = estudiantes.length
        
        // Calcular promedios por estudiante
        const promediosPorEstudiante = estudiantes.map(est => {
            const notasEstudiante = materias
                .map(mat => {
                    const key = `${est.id_estudiante}-${mat.id}`
                    const nota = notasCentralizadas[key]
                    return nota && nota.nota_final > 0 ? nota.nota_final : 0
                })
                .filter(n => n > 0)
            
            const promedio = notasEstudiante.length > 0 
                ? notasEstudiante.reduce((a, b) => a + b, 0) / notasEstudiante.length 
                : 0
            
            return { estudiante: est, promedio, cantidadNotas: notasEstudiante.length }
        })
        
        // Promedio general del curso (todos los estudiantes, incluso sin notas)
        const promedioGeneral = totalEstudiantes > 0
            ? promediosPorEstudiante.reduce((sum, p) => sum + p.promedio, 0) / totalEstudiantes
            : 0
        
        // Estudiantes aprobados (promedio >= 51)
        const aprobados = promediosPorEstudiante.filter(p => p.promedio >= 51).length
        
        // Estudiantes reprobados (promedio < 51 y promedio > 0)
        const reprobados = promediosPorEstudiante.filter(p => p.promedio > 0 && p.promedio < 51).length
        
        // Estudiantes destacados (promedio >= 85)
        const destacados = promediosPorEstudiante.filter(p => p.promedio >= 85).length
        
        return { 
            totalEstudiantes,
            promedioGeneral, 
            aprobados,
            reprobados,
            destacados
        }
    }

    const stats = getEstadisticas()

    // Mostrar loader mientras se resuelve la sesión para evitar parpadeo
    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center h-full py-12">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Verificando permisos…</p>
                </div>
            </div>
        )
    }

    if (!canCentralize) {
        return (
            <div className="flex items-center justify-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                        <CardTitle>Acceso Restringido</CardTitle>
                        <CardDescription>
                            La centralización de notas está disponible únicamente para administradores del sistema.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Centralización de Notas</h1>
                    <p className="text-muted-foreground">
                        Centraliza las notas de todas las materias por curso y paralelo
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={rellenarAleatorio} disabled={isLoading}>
                        <Calculator className="mr-2 h-4 w-4" />
                        Rellenar aleatorio
                    </Button>
                    {hasChanges && (
                        <Button onClick={handleCentralizarNotas} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Centralizar Notas
                        </Button>
                    )}
                </div>
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Seleccionar Curso
                    </CardTitle>
                    <CardDescription>
                        Selecciona el curso y paralelo para centralizar las notas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Colegio</label>
                            <Select value={selectedColegio} onValueChange={(value) => {
                                setSelectedColegio(value)
                                setMaterias([]) // Limpiar materias al cambiar colegio
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {colegios.map((colegio) => (
                                        <SelectItem key={colegio.id} value={colegio.id.toString()}>
                                            {colegio.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nivel</label>
                            <Select value={selectedNivel} onValueChange={(value) => {
                                setSelectedNivel(value)
                                setMaterias([]) // Limpiar materias al cambiar nivel
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {niveles.map((nivel) => (
                                        <SelectItem key={nivel.id} value={nivel.id.toString()}>
                                            {nivel.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Curso</label>
                            <Select value={selectedCurso} onValueChange={(value) => {
                                setSelectedCurso(value)
                                setMaterias([]) // Limpiar materias al cambiar curso
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cursos.map((curso) => (
                                        <SelectItem key={curso.id} value={curso.id.toString()}>
                                            {curso.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Paralelo</label>
                            <Select value={selectedParalelo} onValueChange={(value) => {
                                setSelectedParalelo(value)
                                setMaterias([]) // Limpiar materias al cambiar paralelo
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paralelos.map((paralelo) => (
                                        <SelectItem key={paralelo.id} value={paralelo.id.toString()}>
                                            {paralelo.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Trimestre</label>
                            <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1er Trimestre</SelectItem>
                                    <SelectItem value="2">2do Trimestre</SelectItem>
                                    <SelectItem value="3">3er Trimestre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estadísticas */}
            {estudiantes.length > 0 && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
                            <Calculator className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {stats.promedioGeneral > 0 ? stats.promedioGeneral.toFixed(1) : '-'}
                            </div>
                            <p className="text-xs text-muted-foreground">del curso</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.aprobados}</div>
                            <p className="text-xs text-muted-foreground">de {stats.totalEstudiantes} estudiantes</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Reprobados</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.reprobados}</div>
                            <p className="text-xs text-muted-foreground">promedio &lt; 51</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Destacados</CardTitle>
                            <Users className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{stats.destacados}</div>
                            <p className="text-xs text-muted-foreground">promedio ≥ 85</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabla de Notas */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <p className="mt-4 text-muted-foreground">Cargando datos...</p>
                    </div>
                </div>
            ) : estudiantes.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Matriz de Notas Centralizadas</CardTitle>
                        <CardDescription>
                            Ingresa las notas finales de cada materia por estudiante
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center min-w-[50px]">N°</TableHead>
                                        <TableHead className="min-w-[200px]">Estudiante</TableHead>
                                        {materias.map((materia) => (
                                            <TableHead key={materia.id} className="text-center min-w-[100px]">
                                                {materia.nombre}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center min-w-[100px]">Promedio</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedEstudiantes.map((estudiante, index) => {
                                        const promedio = getPromedioEstudiante(estudiante.id_estudiante)
                                        const { apellido_paterno, apellido_materno, nombres } = deriveNames(estudiante)

                                        return (
                                            <TableRow key={estudiante.id_estudiante}>
                                                <TableCell className="text-center font-medium">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-muted-foreground">{apellido_paterno || <span className="italic text-muted-foreground">(sin paterno)</span>}</span>
                                                        <span className="text-sm text-muted-foreground">{apellido_materno}</span>
                                                        <span className="text-base font-semibold">{nombres}</span>
                                                    </div>
                                                </TableCell>
                                                {materias.map((materia) => {
                                                    const key = `${estudiante.id_estudiante}-${materia.id}`
                                                    const nota = notasCentralizadas[key]?.nota_final || 0

                                                    return (
                                                        <TableCell key={materia.id} className="text-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.1"
                                                                placeholder="0"
                                                                value={nota.toString()}
                                                                onChange={(e) => handleNotaChange(
                                                                    estudiante.id_estudiante,
                                                                    materia.id,
                                                                    e.target.value
                                                                )}
                                                                className={cn(
                                                                    "w-16 text-center mx-auto",
                                                                    nota === 0 ? "text-gray-400" : ""
                                                                )}
                                                            />
                                                        </TableCell>
                                                    )
                                                })}
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("min-w-[60px]", getNotaColor(promedio))}
                                                    >
                                                        {promedio.toFixed(1)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                selectedColegio && selectedNivel && selectedCurso && selectedParalelo && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No hay estudiantes</h3>
                            <p className="text-muted-foreground text-center">
                                No se encontraron estudiantes para el curso seleccionado
                            </p>
                        </CardContent>
                    </Card>
                )
            )}

            {/* Indicador de cambios no guardados */}
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
