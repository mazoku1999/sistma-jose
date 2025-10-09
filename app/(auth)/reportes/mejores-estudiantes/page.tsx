"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    Award,
    Download,
    Users,
    BookOpen,
    TrendingUp,
    Loader2,
    AlertCircle,
    Star
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MejoresEstudiantes {
    id: number
    estudiante: string
    promedio: number
    aula: string
    materia: string
}

export default function MejoresEstudiantesPage() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [mejoresEstudiantes, setMejoresEstudiantes] = useState<MejoresEstudiantes[]>([])
    const [selectedAula, setSelectedAula] = useState<string>("all")
    const [aulas, setAulas] = useState<{ id: number; nombre: string }[]>([])
    const [error, setError] = useState("")

    useEffect(() => {
        fetchMejoresEstudiantes()
        fetchAulas()
    }, [selectedAula])

    const fetchMejoresEstudiantes = async () => {
        setIsLoading(true)
        setError("")
        try {
            const response = await fetch(`/api/reportes/mejores-estudiantes?${selectedAula !== "all" ? `aula=${selectedAula}` : ""}`)
            if (response.ok) {
                const data = await response.json()
                setMejoresEstudiantes(data)
            } else {
                setError("Error al cargar mejores estudiantes")
            }
        } catch (error) {
            console.error("Error al cargar mejores estudiantes:", error)
            setError("Error al cargar mejores estudiantes")
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

    const getPromedioColor = (promedio: number) => {
        if (promedio >= 9) return "text-yellow-600"
        if (promedio >= 7) return "text-green-600"
        if (promedio >= 5) return "text-yellow-600"
        return "text-red-600"
    }

    const getRendimientoBadge = (promedio: number) => {
        if (promedio >= 9) return "bg-yellow-100 text-yellow-800"
        if (promedio >= 7) return "bg-green-100 text-green-800"
        if (promedio >= 5) return "bg-blue-100 text-blue-800"
        return "bg-red-100 text-red-800"
    }

    const getRendimientoText = (promedio: number) => {
        if (promedio >= 9) return "⭐ Excelente"
        if (promedio >= 7) return "🏆 Muy Bueno"
        if (promedio >= 5) return "👍 Bueno"
        return "⚠️ Necesita Mejora"
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
                    <p className="mt-4 text-muted-foreground">Cargando mejores estudiantes...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">🏆 Mejores Estudiantes</h1>
                    <p className="text-muted-foreground">Ranking de estudiantes con mejores promedios</p>
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

            {mejoresEstudiantes.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Award className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No hay datos de estudiantes</h3>
                        <p className="text-muted-foreground text-center">
                            No se encontraron datos para mostrar los mejores estudiantes
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-yellow-600" />
                                🏆 Ranking de Mejores Estudiantes
                            </CardTitle>
                            <CardDescription>
                                Top {mejoresEstudiantes.length} estudiantes con mejores promedios
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {mejoresEstudiantes.map((estudiante, index) => (
                                    <div key={estudiante.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold text-lg shadow-lg">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-lg">{estudiante.estudiante}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" />
                                                    {estudiante.aula} - {estudiante.materia}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${getPromedioColor(safeToNumber(estudiante.promedio))}`}>
                                                    {safeToNumber(estudiante.promedio).toFixed(1)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Promedio</div>
                                            </div>
                                            <Badge className={`${getRendimientoBadge(safeToNumber(estudiante.promedio))} text-sm font-medium px-3 py-1`}>
                                                {getRendimientoText(safeToNumber(estudiante.promedio))}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estadísticas del ranking */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-600" />
                                    <span className="text-sm font-medium">Excelentes (9.0+)</span>
                                </div>
                                <div className="text-2xl font-bold text-yellow-600 mt-1">
                                    {mejoresEstudiantes.filter(e => safeToNumber(e.promedio) >= 9).length}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium">Muy Buenos (7.0-8.9)</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600 mt-1">
                                    {mejoresEstudiantes.filter(e => safeToNumber(e.promedio) >= 7 && safeToNumber(e.promedio) < 9).length}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium">Total Estudiantes</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-600 mt-1">
                                    {mejoresEstudiantes.length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
