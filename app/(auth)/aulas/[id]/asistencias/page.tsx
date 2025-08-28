"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  X,
  Clock,
  FileText,
  Users,
  Loader2,
  Save,
  Settings,
  BookOpen,
  Trash2
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Estudiante {
  id: number
  inscripcion_id: number
  nombres: string
  apellidos: string
  nombre_completo: string
}

interface Asistencia {
  id_inscripcion: number
  fecha: string
  tipo_asistencia: 'A' | 'F' | 'R' | 'L'
}

interface Aula {
  id: number
  nombre_aula: string
  colegio: string
  nivel: string
  curso: string
  paralelo: string
  materia: string
}

const tiposAsistencia = {
  'A': { label: 'Presente', color: 'bg-green-100 text-green-800 border-green-200', icon: Check },
  'F': { label: 'Falta', color: 'bg-red-100 text-red-800 border-red-200', icon: X },
  'R': { label: 'Retraso', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  'L': { label: 'Licencia', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FileText }
}



export default function AsistenciasPage() {
  const params = useParams()
  const router = useRouter()
  const aulaId = params?.id
  const { toast } = useToast()

  const [aula, setAula] = useState<Aula | null>(null)
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [asistencias, setAsistencias] = useState<Record<number, Asistencia>>({})
  const [asistenciasAll, setAsistenciasAll] = useState<Asistencia[]>([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Eliminado selector de trimestre; mostraremos todas las fechas/bimestres

  // Helper: agrupar asistencias por fecha
  const groupByDate = (items: Asistencia[]) => {
    const map: Record<string, Record<number, Asistencia>> = {}
    items.forEach(a => {
      if (!map[a.fecha]) map[a.fecha] = {}
      map[a.fecha][a.id_inscripcion] = a
    })
    return map
  }

  // Cargar aula y data inicial
  useEffect(() => {
    if (!aulaId || aulaId === 'undefined') {
      router.push('/aulas')
      return
    }
    fetchAula()
  }, [aulaId, router])

  // Cargar estudiantes
  useEffect(() => {
    fetchEstudiantes()
  }, [])

  // Cargar asistencias cuando hay estudiantes
  useEffect(() => {
    if (estudiantes.length > 0) {
      fetchAsistenciasTodas()
    }
  }, [estudiantes])

  const fetchAula = async () => {
    if (!aulaId) return

    try {
      const response = await fetch(`/api/aulas/${aulaId}`)
      if (response.ok) {
        const data = await response.json()
        setAula(data)
      }
    } catch (error) {
      console.error("Error al cargar aula:", error)
    }
  }

  const fetchEstudiantes = async () => {
    if (!aulaId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/aulas/${aulaId}/estudiantes`)
      if (response.ok) {
        const data = await response.json()
        setEstudiantes(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los estudiantes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al cargar estudiantes:", error)
      toast({
        title: "Error",
        description: "Error al cargar los estudiantes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAsistenciasTodas = async () => {
    if (!aulaId) return
    try {
      const response = await fetch(`/api/aulas/${aulaId}/asistencias/all`)
      if (response.ok) {
        const data = await response.json()
        setAsistenciasAll(data)
      }
    } catch (error) {
      console.error("Error al cargar asistencias (all):", error)
    }
  }

  // Eliminadas funciones de selección de trimestre

  const handleAsistenciaChange = (inscripcionId: number, tipo: 'A' | 'F' | 'R' | 'L') => {
    setAsistencias(prev => ({
      ...prev,
      [inscripcionId]: {
        id_inscripcion: inscripcionId,
        fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
        tipo_asistencia: tipo
      }
    }))
    setHasChanges(true)
  }

  const handleGuardarAsistencias = async () => {
    if (!aulaId || !hasChanges) return

    setIsSaving(true)
    try {
      const porFecha = groupByDate(asistenciasAll)
      const fechas = Object.keys(porFecha)

      for (const f of fechas) {
        const registros = Object.values(porFecha[f]).map(a => ({
          id_inscripcion: a.id_inscripcion,
          tipo_asistencia: a.tipo_asistencia,
        }))
        const trimestre = getTrimestreByDate(new Date(f))
        const response = await fetch(`/api/aulas/${aulaId}/asistencias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha: f, trimestre, asistencias: registros })
        })
        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.error || `Error al guardar asistencias para ${f}`)
        }
      }

      toast({ title: "Éxito", description: "Asistencias guardadas correctamente" })
      setHasChanges(false)
      fetchAsistenciasTodas()
    } catch (error) {
      console.error("Error al guardar asistencias:", error)
      toast({
        title: "Error",
        description: "Error al guardar las asistencias",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const marcarTodosPresentes = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const filas = estudiantes.map(est => ({ id_inscripcion: est.inscripcion_id, fecha: today, tipo_asistencia: 'A' as const }))
    // Reemplazar asistencias de hoy
    setAsistenciasAll(prev => {
      const otros = prev.filter(a => a.fecha !== today)
      return [...otros, ...filas]
    })
    setHasChanges(true)
  }

  const getEstadisticasAsistencia = () => {
    const total = estudiantes.length
    const presentes = Object.values(asistencias).filter(a => a.tipo_asistencia === 'A').length
    const faltas = Object.values(asistencias).filter(a => a.tipo_asistencia === 'F').length
    const retrasos = Object.values(asistencias).filter(a => a.tipo_asistencia === 'R').length
    const licencias = Object.values(asistencias).filter(a => a.tipo_asistencia === 'L').length

    return { total, presentes, faltas, retrasos, licencias }
  }

  const stats = getEstadisticasAsistencia()

  // Trimestre por fecha (1: Feb-May, 2: Jun-Sep, 3: Oct-Jan)
  const getTrimestreByDate = (d: Date) => {
    const m = d.getMonth() + 1
    if (m >= 2 && m <= 5) return 1
    if (m >= 6 && m <= 9) return 2
    return 3
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Cargando asistencias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quitado selector de trimestre */}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/aulas/${aulaId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Registro de Asistencia</h1>
          <p className="text-muted-foreground">
            {aula?.nombre_aula} - {aula?.curso} {aula?.paralelo}
          </p>
        </div>

      </div>

      {/* Tabla de asistencias de todos los bimestres/fechas */}
      <>
        {/* Controles básicos */}
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => {
            const today = format(new Date(), 'yyyy-MM-dd')
            if (!asistenciasAll.find(a => a.fecha === today)) {
              setAsistenciasAll(prev => [...prev, ...estudiantes.map(s => ({ id_inscripcion: s.inscripcion_id, fecha: today, tipo_asistencia: 'A' as const }))])
              setHasChanges(true)
            }
          }}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Agregar fecha (hoy)
          </Button>
          <Button variant="outline" onClick={marcarTodosPresentes}>
            <Check className="mr-2 h-4 w-4" />
            Marcar Todos Presentes (hoy)
          </Button>
          <Button onClick={handleGuardarAsistencias} disabled={!hasChanges || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Asistencias
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">estudiantes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presentes</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.presentes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faltas</CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.faltas}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.faltas / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retrasos</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.retrasos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.retrasos / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Licencias</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.licencias}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.licencias / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla (tipo Excel) con columnas por fecha */}
        <Card>
          <CardHeader>
            <CardTitle>Asistencias por fecha</CardTitle>
            <CardDescription>Se muestran todas las fechas registradas. Edita la fecha de hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Estudiante</TableHead>
                    {Array.from(new Set(asistenciasAll.map(a => a.fecha))).map((f) => (
                      <TableHead key={f} className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{format(new Date(f), 'dd/MM/yyyy')}</span>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setAsistenciasAll(prev => prev.filter(a => a.fecha !== f))
                            setHasChanges(true)
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantes.map((e, idx) => {
                    const porFecha = groupByDate(asistenciasAll)
                    const fechas = Object.keys(porFecha)
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{e.nombre_completo}</span>
                            <span className="text-xs text-muted-foreground">ID: {e.id}</span>
                          </div>
                        </TableCell>
                        {fechas.map((f) => {
                          const a = porFecha[f]?.[e.inscripcion_id]
                          const hoy = format(new Date(), 'yyyy-MM-dd') === f
                          const trimestreCol = getTrimestreByDate(new Date(f))
                          const editable = hoy || (trimestreCol === getTrimestreByDate(new Date()))
                          const valor = a?.tipo_asistencia || ''
                          return (
                            <TableCell key={f} className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {(['A', 'R', 'L', 'F'] as const).map((tipo) => {
                                  const active = valor === tipo
                                  return (
                                    <Button
                                      key={tipo}
                                      variant={active ? 'default' : 'outline'}
                                      size="sm"
                                      className={cn('px-2', active && tiposAsistencia[tipo].color)}
                                      onClick={() => {
                                        if (!editable) return
                                        // actualizar estado in-memory
                                        setAsistenciasAll(prev => {
                                          const next = prev.filter(x => !(x.id_inscripcion === e.inscripcion_id && x.fecha === f))
                                          next.push({ id_inscripcion: e.inscripcion_id, fecha: f, tipo_asistencia: tipo })
                                          return next
                                        })
                                        setHasChanges(true)
                                      }}
                                      disabled={!editable}
                                      title={!editable ? 'Solo editable en el bimestre actual' : ''}
                                    >
                                      {tipo}
                                    </Button>
                                  )
                                })}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </>
      )

      {/* Indicador de cambios no guardados */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Tienes cambios sin guardar</span>
          </div>
        </div>
      )}
    </div>
  )
}