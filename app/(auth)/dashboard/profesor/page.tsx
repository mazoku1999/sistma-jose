"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    BookOpen,
    Users,
    ClipboardList,
    Clock,
    Calendar,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Star,
    BarChart3,
    FileText,
    Loader2,
} from "lucide-react"
import Link from "next/link"

interface ProfesorDashboardStats {
    totalAulas: number
    totalEstudiantes: number
    totalNotas: number
    totalAsistencias: number
    aulasActivas: number
    estudiantesConNotasPendientes: number
    asistenciasPendientesHoy: number
    promedioNotas: number
    proximasClases: {
        id: number
        nombre_aula: string
        hora_inicio: string
        hora_fin: string
        dia: number
        materia: string
    }[]
    rendimientoAulas: {
        id: number
        nombre: string
        promedio: number
        estudiantes: number
        progreso: number
    }[]
    estudiantesDestacados: {
        id: number
        nombre: string
        aula: string
        promedio: number
    }[]
    alertas: {
        tipo: 'notas' | 'asistencia' | 'tarea'
        mensaje: string
        cantidad: number
        aula: string
    }[]
}

export default function ProfesorDashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState<ProfesorDashboardStats>({
        totalAulas: 0,
        totalEstudiantes: 0,
        totalNotas: 0,
        totalAsistencias: 0,
        aulasActivas: 0,
        estudiantesConNotasPendientes: 0,
        asistenciasPendientesHoy: 0,
        promedioNotas: 0,
        proximasClases: [],
        rendimientoAulas: [],
        estudiantesDestacados: [],
        alertas: [],
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        fetchProfesorDashboardData()
    }, [user])

    const fetchProfesorDashboardData = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/dashboard/profesor")
            if (response.ok) {
                const data = await response.json()
                setStats(data)
            } else {
                const error = await response.json()
                console.error("Error al cargar datos del dashboard:", error.error)
            }
        } catch (error) {
            console.error("Error al cargar datos del dashboard:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const getDayName = (day: number) => {
        const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
        return days[day]
    }

    const today = new Date().getDay()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando tu panel de trabajo...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.nombre_completo}</h1>
                    <p className="text-muted-foreground">Tu panel de trabajo académico y próximas actividades.</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/aulas">
                            <BookOpen className="mr-2 h-4 w-4" />
                            Mis Aulas
                        </Link>
                    </Button>
                    {/* <Button variant="outline" asChild>
                        <Link href="/horario">
                            <Calendar className="mr-2 h-4 w-4" />
                            Mi Horario
                        </Link>
                    </Button> */}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mis Aulas</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalAulas}</div>
                        <p className="text-xs text-muted-foreground">{stats.aulasActivas} activas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEstudiantes}</div>
                        <p className="text-xs text-muted-foreground">En todas mis aulas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notas Pendientes</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.estudiantesConNotasPendientes}</div>
                        <p className="text-xs text-muted-foreground">Estudiantes sin notas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Asistencias Pendientes</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.asistenciasPendientesHoy}</div>
                        <p className="text-xs text-muted-foreground">Hoy</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alertas y Próximas Clases */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Tareas Pendientes
                        </CardTitle>
                        <CardDescription>Elementos que requieren tu atención</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {stats.alertas.map((alerta, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${alerta.tipo === 'notas' ? 'bg-blue-500' :
                                        alerta.tipo === 'asistencia' ? 'bg-green-500' : 'bg-purple-500'
                                        }`} />
                                    <div>
                                        <p className="font-medium">{alerta.mensaje}</p>
                                        <p className="text-sm text-muted-foreground">{alerta.aula}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    {alerta.cantidad}
                                </Badge>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full mt-4" asChild>
                            <Link href="/aulas">Revisar todas las tareas</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            Próximas Clases
                        </CardTitle>
                        <CardDescription>Tu horario para hoy</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.proximasClases.length > 0 ? (
                            <div className="space-y-3">
                                {stats.proximasClases.map((clase) => (
                                    <div key={clase.id} className="flex items-center gap-3 p-3 rounded-lg border">
                                        <div className="bg-primary/10 rounded-full p-2">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium">{clase.nombre_aula}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {clase.hora_inicio} - {clase.hora_fin}
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/aulas/${clase.id}`}>Ver</Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                <h3 className="font-medium mb-1">No hay clases programadas</h3>
                                <p className="text-sm text-muted-foreground">No tienes clases para hoy</p>
                            </div>
                        )}
                        <Button variant="outline" className="w-full mt-4" asChild>
                            <Link href="/horario">Ver horario completo</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Rendimiento de Aulas */}
            <Card>
                <CardHeader>
                    <CardTitle>Rendimiento por Aula</CardTitle>
                    <CardDescription>Promedio de calificaciones en tus aulas</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.rendimientoAulas.map((aula) => {
                            const promedio = typeof aula.promedio === 'number' ? aula.promedio : parseFloat(aula.promedio) || 0;
                            return (
                                <div key={aula.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${promedio >= 8 ? "bg-green-500" :
                                                promedio >= 7 ? "bg-blue-500" :
                                                    promedio >= 6 ? "bg-amber-500" : "bg-red-500"
                                                }`} />
                                            <span className="font-medium">{aula.nombre}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{promedio.toFixed(1)}</span>
                                            <span className="text-xs text-muted-foreground">/ 10</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            value={promedio * 10}
                                            className="flex-1 h-2"
                                        />
                                        <span className="text-xs text-muted-foreground">{aula.estudiantes} estudiantes</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
                <CardContent className="pt-0">
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/estadisticas">Ver estadísticas detalladas</Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Estudiantes Destacados */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        Estudiantes Destacados
                    </CardTitle>
                    <CardDescription>Alumnos con mejor rendimiento</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {stats.estudiantesDestacados.map((estudiante, index) => {
                            const promedio = typeof estudiante.promedio === 'number' ? estudiante.promedio : parseFloat(estudiante.promedio) || 0;
                            return (
                                <div key={estudiante.id} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                                            <Star className="h-4 w-4 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{estudiante.nombre}</p>
                                            <p className="text-sm text-muted-foreground">{estudiante.aula}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{promedio.toFixed(1)}</p>
                                        <p className="text-xs text-muted-foreground">promedio</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
                <CardContent className="pt-0">
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/aulas">Ver todos los estudiantes</Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Accesos Rápidos */}
            <Card>
                <CardHeader>
                    <CardTitle>Accesos Rápidos</CardTitle>
                    <CardDescription>Funciones más utilizadas en tu trabajo diario</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Button variant="outline" className="h-auto flex-col items-center justify-center py-6 gap-3" asChild>
                            <Link href="/aulas">
                                <BookOpen className="h-6 w-6 text-primary" />
                                <span className="font-medium">Mis Aulas</span>
                                <span className="text-xs text-muted-foreground">Gestionar aulas</span>
                            </Link>
                        </Button>

                        <Button variant="outline" className="h-auto flex-col items-center justify-center py-6 gap-3" asChild>
                            <Link href="/horario">
                                <Calendar className="h-6 w-6 text-primary" />
                                <span className="font-medium">Horario</span>
                                <span className="text-xs text-muted-foreground">Ver horario</span>
                            </Link>
                        </Button>



                        <Button variant="outline" className="h-auto flex-col items-center justify-center py-6 gap-3" asChild>
                            <Link href="/reportes">
                                <FileText className="h-6 w-6 text-primary" />
                                <span className="font-medium">Reportes</span>
                                <span className="text-xs text-muted-foreground">Generar reportes</span>
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
