"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Users,
    School,
    GraduationCap,
    BookOpen,
    BarChart3,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    FileSpreadsheet,
    Settings,
    UserPlus,
    BookMarked,
    Calendar,
    Loader2,
    ClipboardList,
} from "lucide-react"
import Link from "next/link"

interface AdminDashboardStats {
    totalUsuarios: number
    totalColegios: number
    totalAulas: number
    totalEstudiantes: number
    totalProfesores: number
    totalMaterias: number
    usuariosActivos: number
    usuariosInactivos: number
    aulasActivas: number
    aulasInactivas: number
    usuariosNuevosEsteMes: number
    aulasCreadasEsteMes: number
    profesoresSinAulas: number
    aulasSinEstudiantes: number
    ultimosUsuarios: {
        id: number
        nombre_completo: string
        usuario: string
        email: string
        fecha_registro: string
        activo: boolean
    }[]
    colegiosConMasAulas: {
        id: number
        nombre: string
        total_aulas: number
        total_estudiantes: number
    }[]
    profesoresMasActivos: {
        id: number
        nombre_completo: string
        total_aulas: number
        total_estudiantes: number
    }[]
    aulasConMasEstudiantes: {
        nombre: string
        total_estudiantes: number
        colegio: string
    }[]
}

export default function AdminDashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState<AdminDashboardStats>({
        totalUsuarios: 0,
        totalColegios: 0,
        totalAulas: 0,
        totalEstudiantes: 0,
        totalProfesores: 0,
        totalMaterias: 0,
        usuariosActivos: 0,
        usuariosInactivos: 0,
        aulasActivas: 0,
        aulasInactivas: 0,
        usuariosNuevosEsteMes: 0,
        aulasCreadasEsteMes: 0,
        profesoresSinAulas: 0,
        aulasSinEstudiantes: 0,
        ultimosUsuarios: [],
        colegiosConMasAulas: [],
        profesoresMasActivos: [],
        aulasConMasEstudiantes: [],
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        fetchAdminDashboardData()
    }, [user])

    const fetchAdminDashboardData = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/dashboard/admin")
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando panel de administración...</p>
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
                    <p className="text-muted-foreground">
                        Panel de Administración - Gestiona el sistema académico completo desde aquí.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/admin/profesores">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Nuevo Usuario
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/admin/central">
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Centralizar Notas
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {stats.usuariosActivos} activos
                            </Badge>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {stats.usuariosInactivos} inactivos
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Colegios</CardTitle>
                        <School className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalColegios}</div>
                        <p className="text-xs text-muted-foreground">Instituciones registradas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios Nuevos</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.usuariosNuevosEsteMes}</div>
                        <p className="text-xs text-muted-foreground">Este mes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aulas Creadas</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.aulasCreadasEsteMes}</div>
                        <p className="text-xs text-muted-foreground">Este mes</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alertas y Pendientes */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Alertas Administrativas
                        </CardTitle>
                        <CardDescription>Elementos que requieren atención</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats.profesoresSinAulas > 0 && (
                            <div key="profesores-sin-aulas" className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-amber-600" />
                                    <div>
                                        <p className="font-medium text-amber-800">Profesores sin aulas</p>
                                        <p className="text-sm text-amber-600">{stats.profesoresSinAulas} profesores</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href="/admin/profesores">Asignar</Link>
                                </Button>
                            </div>
                        )}

                        {stats.aulasSinEstudiantes > 0 && (
                            <div key="aulas-sin-estudiantes" className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium text-blue-800">Aulas sin estudiantes</p>
                                        <p className="text-sm text-blue-600">{stats.aulasSinEstudiantes} aulas</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href="/admin/aulas">Revisar</Link>
                                </Button>
                            </div>
                        )}

                        {stats.usuariosInactivos > 0 && (
                            <div key="usuarios-inactivos" className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-red-600" />
                                    <div>
                                        <p className="font-medium text-red-800">Usuarios inactivos</p>
                                        <p className="text-sm text-red-600">{stats.usuariosInactivos} cuentas</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href="/admin/profesores">Revisar</Link>
                                </Button>
                            </div>
                        )}

                        {stats.profesoresSinAulas === 0 && stats.aulasSinEstudiantes === 0 && stats.usuariosInactivos === 0 && (
                            <div key="todo-en-orden" className="text-center py-8">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <h3 className="font-medium mb-1">¡Todo en orden!</h3>
                                <p className="text-sm text-muted-foreground">No hay alertas pendientes</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Actividad Reciente
                        </CardTitle>
                        <CardDescription>Últimos usuarios registrados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.ultimosUsuarios.map((usuario, index) => (
                                <div key={`usuario-${usuario.id || index}`} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${usuario.activo ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div>
                                            <p className="font-medium">{usuario.nombre_completo}</p>
                                            <p className="text-sm text-muted-foreground">{usuario.usuario}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(usuario.fecha_registro).toLocaleDateString()}
                                        </p>
                                        <Badge variant={usuario.activo ? "default" : "secondary"}>
                                            {usuario.activo ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Colegios y Profesores */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Colegios con más aulas</CardTitle>
                        <CardDescription>Instituciones con mayor actividad</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.colegiosConMasAulas.map((colegio, index) => (
                                <div key={`colegio-${colegio.id || index}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-sm font-medium text-primary">{index + 1}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium">{colegio.nombre}</p>
                                            <p className="text-sm text-muted-foreground">{colegio.total_estudiantes} estudiantes</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{colegio.total_aulas}</p>
                                        <p className="text-xs text-muted-foreground">aulas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardContent className="pt-0">
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/admin/colegios">Ver todos los colegios</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Profesores más activos</CardTitle>
                        <CardDescription>Docentes con mayor carga académica</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.profesoresMasActivos.map((profesor, index) => (
                                <div key={`profesor-${profesor.id || index}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-sm font-medium text-primary">{index + 1}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium">{profesor.nombre_completo}</p>
                                            <p className="text-sm text-muted-foreground">{profesor.total_estudiantes} estudiantes</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{profesor.total_aulas}</p>
                                        <p className="text-xs text-muted-foreground">aulas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardContent className="pt-0">
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/admin/profesores">Ver todos los profesores</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Accesos Rápidos */}
            <Card>
                <CardHeader>
                    <CardTitle>Accesos Rápidos</CardTitle>
                    <CardDescription>Funciones administrativas más utilizadas</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button variant="outline" className="h-auto flex-col items-center justify-center py-6 gap-3" asChild>
                            <Link href="/admin/profesores">
                                <UserPlus className="h-6 w-6 text-primary" />
                                <span className="font-medium">Usuarios</span>
                                <span className="text-xs text-muted-foreground">Gestionar usuarios</span>
                            </Link>
                        </Button>

                        <Button variant="outline" className="h-auto flex-col items-center justify-center py-6 gap-3" asChild>
                            <Link href="/admin/colegios">
                                <School className="h-6 w-6 text-primary" />
                                <span className="font-medium">Colegios</span>
                                <span className="text-xs text-muted-foreground">Gestionar colegios</span>
                            </Link>
                        </Button>

                        <Button variant="outline" className="h-auto flex-col items-center justify-center py-6 gap-3" asChild>
                            <Link href="/admin/central">
                                <FileSpreadsheet className="h-6 w-6 text-primary" />
                                <span className="font-medium">Centralizar</span>
                                <span className="text-xs text-muted-foreground">Centralizar notas</span>
                            </Link>
                        </Button>

                        <Button variant="outline" className="h-auto flex-col items-center justify-center py-6 gap-3" asChild>
                            <Link href="/admin/materias">
                                <BookMarked className="h-6 w-6 text-primary" />
                                <span className="font-medium">Materias</span>
                                <span className="text-xs text-muted-foreground">Gestionar materias</span>
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
