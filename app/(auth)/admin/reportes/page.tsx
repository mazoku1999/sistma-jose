"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    BarChart3,
    Award,
    Clock,
    TrendingUp,
    Users,
    BookOpen,
    Calendar,
    Download,
    FileText,
    Target,
    Star
} from "lucide-react"
import Link from "next/link"

export default function AdminReportesPage() {
    const reportes = [
        {
            id: "mejores-estudiantes",
            title: "Mejores Estudiantes",
            description: "Ranking de estudiantes con mejor rendimiento académico del colegio",
            icon: Award,
            href: "/admin/reportes/mejores-estudiantes",
            color: "text-yellow-600",
            bgColor: "bg-yellow-50",
            borderColor: "border-yellow-200"
        },
        {
            id: "asistencia-general",
            title: "Asistencia General",
            description: "Reporte de asistencia de todos los estudiantes por nivel y curso",
            icon: Clock,
            href: "/admin/reportes/asistencia-general",
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200"
        },
        {
            id: "rendimiento-materias",
            title: "Rendimiento por Materias",
            description: "Análisis del rendimiento académico por materia y profesor",
            icon: TrendingUp,
            href: "/admin/reportes/rendimiento-materias",
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-200"
        },
        {
            id: "estadisticas-generales",
            title: "Estadísticas Generales",
            description: "Estadísticas generales del colegio, profesores y estudiantes",
            icon: BarChart3,
            href: "/admin/reportes/estadisticas-generales",
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            borderColor: "border-purple-200"
        }
    ]

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reportes Administrativos</h1>
                    <p className="text-muted-foreground">
                        Análisis y reportes detallados del rendimiento académico del colegio
                    </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Gestión 2025
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {reportes.map((reporte) => {
                    const IconComponent = reporte.icon
                    return (
                        <Card key={reporte.id} className={`hover:shadow-lg transition-all duration-200 ${reporte.borderColor} hover:scale-105`}>
                            <CardHeader className={`${reporte.bgColor} rounded-t-lg`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${reporte.bgColor} ${reporte.color}`}>
                                            <IconComponent className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{reporte.title}</CardTitle>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <CardDescription className="mb-4 text-sm leading-relaxed">
                                    {reporte.description}
                                </CardDescription>
                                <Button asChild className="w-full">
                                    <Link href={reporte.href}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Ver Reporte
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Información General
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                            <p className="text-sm text-muted-foreground">Total Estudiantes</p>
                            <p className="text-2xl font-bold text-blue-600">-</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-600" />
                            <p className="text-sm text-muted-foreground">Total Aulas</p>
                            <p className="text-2xl font-bold text-green-600">-</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <Star className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                            <p className="text-sm text-muted-foreground">Promedio General</p>
                            <p className="text-2xl font-bold text-purple-600">-</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
