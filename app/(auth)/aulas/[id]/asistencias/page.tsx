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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  BookOpen
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

const trimestres = {
  '1': { 
    label: '1er Trimestre', 
    periodo: 'Febrero - Mayo',
    color: 'bg-green-50 border-green-200',
    icon: '🌱'
  },
  '2': { 
    label: '2do Trimestre', 
    periodo: 'Junio - Septiembre',
    color: 'bg-blue-50 border-blue-200',
    icon: '☀️'
  },
  '3': { 
    label: '3er Trimestre', 
    periodo: 'Octubre - Enero',
    color: 'bg-orange-50 border-orange-200',
    icon: '🍂'
  }
}

export default function AsistenciasPage() {
  const params = useParams()
  const router = useRouter()
  const aulaId = params?.id
  const { toast } = useToast()
  
  const [aula, setAula] = useState<Aula | null>(null)
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [asistencias, setAsistencias] = useState<Record<number, Asistencia>>({})
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Estados para el modal de trimestre
  const [trimestre, setTrimestre] = useState("")
  const [showTrimestreModal, setShowTrimestreModal] = useState(false)
  const [recordarTrimestre, setRecordarTrimestre] = useState(false)
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState("")

  // Función para determinar el trimestre por defecto basado en la fecha actual
  const getTrimestreDefault = () => {
    const mes = new Date().getMonth() + 1
    if (mes >= 2 && mes <= 5) return "1"
    if (mes >= 6 && mes <= 9) return "2"
    return "3"
  }

  // Cargar trimestre guardado o mostrar modal
  useEffect(() => {
    if (!aulaId || aulaId === 'undefined') {
      router.push('/aulas')
      return
    }

    // Verificar si hay un trimestre guardado en localStorage
    const trimestreGuardado = localStorage.getItem(`trimestre_${aulaId}`)
    
    if (trimestreGuardado) {
      setTrimestre(trimestreGuardado)
      setTrimestreSeleccionado(trimestreGuardado)
    } else {
      // Mostrar modal para seleccionar trimestre
      setTrimestreSeleccionado(getTrimestreDefault())
      setShowTrimestreModal(true)
    }

    fetchAula()
  }, [aulaId, router])

  // Cargar estudiantes cuando se selecciona trimestre
  useEffect(() => {
    if (trimestre) {
      fetchEstudiantes()
    }
  }, [trimestre])

  // Cargar asistencias cuando cambian estudiantes o fecha
  useEffect(() => {
    if (estudiantes.length > 0 && trimestre) {
      fetchAsistencias()
    }
  }, [fechaSeleccionada, estudiantes, trimestre])

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

  const fetchAsistencias = async () => {
    if (!aulaId || !fechaSeleccionada || !trimestre) return

    try {
      const fechaStr = format(fechaSeleccionada, 'yyyy-MM-dd')
      const response = await fetch(`/api/aulas/${aulaId}/asistencias?fecha=${fechaStr}&trimestre=${trimestre}`)
      
      if (response.ok) {
        const data = await response.json()
        const asistenciasMap: Record<number, Asistencia> = {}
        
        data.forEach((asistencia: Asistencia) => {
          asistenciasMap[asistencia.id_inscripcion] = asistencia
        })
        
        setAsistencias(asistenciasMap)
      }
    } catch (error) {
      console.error("Error al cargar asistencias:", error)
    }
  }

  const handleConfirmarTrimestre = () => {
    setTrimestre(trimestreSeleccionado)
    
    if (recordarTrimestre) {
      localStorage.setItem(`trimestre_${aulaId}`, trimestreSeleccionado)
    }
    
    setShowTrimestreModal(false)
  }

  const handleCambiarTrimestre = () => {
    setShowTrimestreModal(true)
  }

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
      const asistenciasArray = Object.values(asistencias)
      
      const response = await fetch(`/api/aulas/${aulaId}/asistencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
          trimestre: parseInt(trimestre),
          asistencias: asistenciasArray
        })
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Asistencias guardadas correctamente",
        })
        setHasChanges(false)
        fetchAsistencias()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al guardar las asistencias",
          variant: "destructive",
        })
      }
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
    const nuevasAsistencias: Record<number, Asistencia> = {}
    estudiantes.forEach(estudiante => {
      nuevasAsistencias[estudiante.inscripcion_id] = {
        id_inscripcion: estudiante.inscripcion_id,
        fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
        tipo_asistencia: 'A'
      }
    })
    setAsistencias(nuevasAsistencias)
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

  if (isLoading && trimestre) {
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
      {/* Modal de Selección de Trimestre */}
      <Dialog open={showTrimestreModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Seleccionar Período Académico
            </DialogTitle>
            <DialogDescription>
              Elige el trimestre para registrar las asistencias
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {Object.entries(trimestres).map(([key, trimestre]) => (
              <Card 
                key={key}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  trimestre.color,
                  trimestreSeleccionado === key && "ring-2 ring-primary"
                )}
                onClick={() => setTrimestreSeleccionado(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{trimestre.icon}</span>
                      <div>
                        <h3 className="font-semibold">{trimestre.label}</h3>
                        <p className="text-sm text-muted-foreground">{trimestre.periodo}</p>
                      </div>
                    </div>
                    {trimestreSeleccionado === key && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex items-center space-x-2 pt-4">
              <Checkbox 
                id="recordar" 
                checked={recordarTrimestre}
                onCheckedChange={(checked) => setRecordarTrimestre(checked as boolean)}
              />
              <label 
                htmlFor="recordar" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Recordar mi selección para esta aula
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button onClick={handleConfirmarTrimestre} disabled={!trimestreSeleccionado}>
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        {trimestre && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {trimestres[trimestre as keyof typeof trimestres]?.label}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleCambiarTrimestre}>
              <Settings className="h-4 w-4 mr-1" />
              Cambiar
            </Button>
          </div>
        )}
      </div>

      {trimestre && (
        <>
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Selector de Fecha */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !fechaSeleccionada && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaSeleccionada ? (
                      format(fechaSeleccionada, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaSeleccionada}
                    onSelect={(date) => date && setFechaSeleccionada(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={marcarTodosPresentes}>
                <Check className="mr-2 h-4 w-4" />
                Marcar Todos Presentes
              </Button>
              <Button 
                onClick={handleGuardarAsistencias} 
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar Asistencias
              </Button>
            </div>
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

          {/* Lista de Estudiantes */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Asistencia</CardTitle>
              <CardDescription>
                {format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {estudiantes.map((estudiante, index) => {
                  const asistenciaActual = asistencias[estudiante.inscripcion_id]
                  
                  return (
                    <div 
                      key={estudiante.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{estudiante.nombre_completo}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {estudiante.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {Object.entries(tiposAsistencia).map(([tipo, config]) => {
                          const Icon = config.icon
                          const isSelected = asistenciaActual?.tipo_asistencia === tipo
                          
                          return (
                            <Button
                              key={tipo}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "min-w-[100px]",
                                isSelected && config.color
                              )}
                              onClick={() => handleAsistenciaChange(estudiante.inscripcion_id, tipo as 'A' | 'F' | 'R' | 'L')}
                            >
                              <Icon className="mr-2 h-4 w-4" />
                              {config.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {estudiantes.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay estudiantes registrados en esta aula</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

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