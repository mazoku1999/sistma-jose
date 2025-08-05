"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  ClipboardList, 
  Calendar,
  Settings,
  Loader2,
  Plus
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Aula {
  id: number
  nombre_aula: string
  colegio: string
  nivel: string
  curso: string
  paralelo: string
  materia: string
  estudiantes: number
  max_estudiantes: number
}

export default function AulaPage() {
  const params = useParams()
  const router = useRouter()
  const aulaId = params?.id
  const { toast } = useToast()
  
  const [aula, setAula] = useState<Aula | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!aulaId || aulaId === 'undefined') {
      router.push('/aulas')
      return
    }
    fetchAula()
  }, [aulaId, router])

  const fetchAula = async () => {
    if (!aulaId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/aulas/${aulaId}`)
      if (response.ok) {
        const data = await response.json()
        setAula(data)
      } else if (response.status === 404) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder a esta aula o no existe",
          variant: "destructive",
        })
        router.push('/aulas')
      } else if (response.status === 401) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para acceder a esta aula",
          variant: "destructive",
        })
        router.push('/login')
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar la información del aula",
          variant: "destructive",
        })
        router.push('/aulas')
      }
    } catch (error) {
      console.error("Error al cargar aula:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar la información del aula",
        variant: "destructive",
      })
      router.push('/aulas')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Cargando aula...</p>
        </div>
      </div>
    )
  }

  if (!aula) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aula no encontrada</h2>
          <p className="text-muted-foreground mb-4">No se pudo encontrar la información del aula solicitada.</p>
          <Button asChild>
            <Link href="/aulas">Volver a Mis Aulas</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/aulas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{aula.nombre_aula}</h1>
          <p className="text-muted-foreground">
            {aula.materia} - {aula.curso} {aula.paralelo} | {aula.colegio}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aula.estudiantes}</div>
            <p className="text-xs text-muted-foreground">
              de {aula.max_estudiantes} máximo
            </p>
            <Progress 
              value={(aula.estudiantes / aula.max_estudiantes) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nivel</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aula.nivel}</div>
            <p className="text-xs text-muted-foreground">
              {aula.curso} {aula.paralelo}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materia</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aula.materia}</div>
            <p className="text-xs text-muted-foreground">
              Materia principal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              Activo
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              En curso actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href={`/aulas/${aulaId}/estudiantes`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestionar Estudiantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Agregar, editar o eliminar estudiantes del aula
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/aulas/${aulaId}/notas`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Ingresar Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Registrar y gestionar las calificaciones
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/aulas/${aulaId}/asistencias`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Registrar Asistencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Marcar asistencia, faltas y retrasos
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/aulas/${aulaId}/configuracion`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Editar información del aula
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Últimas acciones realizadas en esta aula
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Estudiante agregado</p>
                <p className="text-xs text-muted-foreground">Hace 2 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Notas actualizadas</p>
                <p className="text-xs text-muted-foreground">Hace 1 día</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Asistencia registrada</p>
                <p className="text-xs text-muted-foreground">Hace 2 días</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}