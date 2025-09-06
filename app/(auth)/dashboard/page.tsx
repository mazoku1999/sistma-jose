"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  Users,
  Clock,
  ChevronRight,
  Star,
  PlusCircle,
  FileText,
  BarChart3,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface DashboardStats {
  totalAulas: number
  totalEstudiantes: number
  totalNotas: number
  totalAsistencias: number
  pendientes: number
  proximasClases: {
    id: number
    nombre_aula: string
    hora_inicio: string
    hora_fin: string
    dia: number
  }[]
  rendimiento: {
    aula: string
    promedio: number
    estudiantes: number
  }[]
  aulasDestacadas: {
    id: number
    nombre: string
    estudiantes: number
    progreso: number
    pendientes: number
  }[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalAulas: 0,
    totalEstudiantes: 0,
    totalNotas: 0,
    totalAsistencias: 0,
    pendientes: 0,
    proximasClases: [],
    rendimiento: [],
    aulasDestacadas: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    fetchDashboardData(controller.signal)
    return () => controller.abort()
  }, [user])

  const fetchDashboardData = async (signal?: AbortSignal) => {
    setIsLoading(true)
    try {
      // Obtener estadísticas del dashboard
      const response = await fetch("/api/dashboard/stats", { signal })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error("Error al cargar estadísticas del dashboard")
      }
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') {
        console.error("Error al cargar datos del dashboard:", error)
      }
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
          <p className="mt-4 text-muted-foreground">Cargando información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.nombre_completo}</h1>
          <p className="text-muted-foreground">Aquí tienes un resumen de tu actividad académica y próximas tareas.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/aulas">
              <BookOpen className="mr-2 h-4 w-4" />
              Ir a mis aulas
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/horario">
              <Calendar className="mr-2 h-4 w-4" />
              Ver horario
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aulas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAulas}</div>
            <p className="text-xs text-muted-foreground">{stats.pendientes} aulas con tareas pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEstudiantes}</div>
            <p className="text-xs text-muted-foreground">En todas tus aulas asignadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas registradas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotas}</div>
            <p className="text-xs text-muted-foreground">Durante el trimestre actual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencias</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAsistencias}</div>
            <p className="text-xs text-muted-foreground">Registros de asistencia totales</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="aulas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="aulas">Mis Aulas</TabsTrigger>
          <TabsTrigger value="horario">Horario de Hoy</TabsTrigger>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="aulas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.aulasDestacadas.length > 0 ? (
              stats.aulasDestacadas.map((aula) => (
                <Card key={aula.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{aula.nombre}</CardTitle>
                    <CardDescription>{aula.estudiantes} estudiantes</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Progreso del trimestre</span>
                      <span className="text-sm font-medium">{aula.progreso}%</span>
                    </div>
                    <Progress value={aula.progreso} className="h-2" />

                    <div className="mt-4 flex items-center gap-2">
                      {aula.pendientes > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {aula.pendientes} pendientes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Al día
                        </Badge>
                      )}

                      {aula.progreso === 100 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Completado
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <Link href={`/aulas/${aula.id}`}>
                        Ver detalles
                        <ChevronRight className="ml-auto h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="md:col-span-3">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <h3 className="font-medium mb-1">No hay aulas disponibles</h3>
                  <p className="text-sm text-muted-foreground mb-4">No tienes aulas asignadas actualmente</p>
                  <Button asChild>
                    <Link href="/aulas/crear">Crear nueva aula</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {stats.aulasDestacadas.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center h-full py-8">
                  <div className="rounded-full bg-primary/10 p-3 mb-3">
                    <PlusCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium mb-1">Crear nueva aula</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Configura una nueva aula para tus estudiantes
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/aulas/crear">Crear aula</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {stats.aulasDestacadas.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href="/aulas">
                  Ver todas mis aulas
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="horario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Horario para hoy ({getDayName(today)})</CardTitle>
              <CardDescription>Tus clases programadas para el día de hoy</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.proximasClases.length > 0 ? (
                <div className="space-y-4">
                  {stats.proximasClases.map((clase) => (
                    <div key={clase.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="bg-primary/10 rounded-full p-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{clase.nombre_aula}</h4>
                        <p className="text-sm text-muted-foreground">
                          {clase.hora_inicio} - {clase.hora_fin}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/aulas/${clase.id}`}>Ver aula</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="font-medium mb-1">No hay clases programadas</h3>
                  <p className="text-sm text-muted-foreground">No tienes clases programadas para hoy</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/horario">
                  Ver horario completo
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="rendimiento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por aula</CardTitle>
              <CardDescription>Promedio de calificaciones por aula</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.rendimiento.length > 0 ? (
                <div className="space-y-4">
                  {stats.rendimiento.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              (item.promedio || 0) >= 8
                                ? "bg-green-500"
                                : (item.promedio || 0) >= 7
                                  ? "bg-blue-500"
                                  : (item.promedio || 0) >= 6
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                            }`}
                          />
                          <span className="font-medium">{item.aula}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {typeof item.promedio === 'number' ? item.promedio.toFixed(1) : '0.0'}
                          </span>
                          <span className="text-xs text-muted-foreground">/ 10</span>
                        </div>
                      </div>
                      <Progress
                        value={(item.promedio || 0) * 10}
                        className={`h-2 ${
                          (item.promedio || 0) >= 8
                            ? "bg-green-100"
                            : (item.promedio || 0) >= 7
                              ? "bg-blue-100"
                              : (item.promedio || 0) >= 6
                                ? "bg-amber-100"
                                : "bg-red-100"
                        }`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.estudiantes} estudiantes</span>
                        <span>
                          {(item.promedio || 0) >= 8
                            ? "Excelente"
                            : (item.promedio || 0) >= 7
                              ? "Bueno"
                              : (item.promedio || 0) >= 6
                                ? "Regular"
                                : "Necesita mejorar"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="font-medium mb-1">No hay datos de rendimiento</h3>
                  <p className="text-sm text-muted-foreground">
                    Aún no hay suficientes datos para mostrar estadísticas
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/estadisticas">
                  Ver estadísticas detalladas
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aulas destacadas</CardTitle>
            <CardDescription>Tus aulas con mejor rendimiento</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.aulasDestacadas.length > 0 ? (
              <div className="space-y-4">
                {stats.aulasDestacadas.slice(0, 3).map((aula, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">{i + 1}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{aula.nombre}</h4>
                      <div className="flex items-center gap-2">
                        <Progress value={aula.progreso} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{aula.progreso}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {i === 0 && <Star className="h-4 w-4 text-amber-500" />}
                      {i === 1 && <Star className="h-4 w-4 text-slate-400" />}
                      {i === 2 && <Star className="h-4 w-4 text-amber-700" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-1">No hay aulas destacadas</h3>
                <p className="text-sm text-muted-foreground">Aún no hay suficientes datos para destacar aulas</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/estadisticas/aulas">Ver análisis completo</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>Accede rápidamente a las funciones más utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-auto flex-col items-center justify-center py-4 gap-2" asChild>
                <Link href="/asistencia/registrar">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>Registrar asistencia</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-center justify-center py-4 gap-2" asChild>
                <Link href="/notas/ingresar">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span>Ingresar notas</span>
                </Link>
              </Button>
              {user?.roles.includes("ADMIN") && (
                <Button variant="outline" className="h-auto flex-col items-center justify-center py-4 gap-2" asChild>
                  <Link href="/admin/central">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <span>Centralizar notas</span>
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="h-auto flex-col items-center justify-center py-4 gap-2" asChild>
                <Link href="/reportes/generar">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Generar reportes</span>
                </Link>
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/configuracion/accesos-rapidos">Personalizar accesos</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
