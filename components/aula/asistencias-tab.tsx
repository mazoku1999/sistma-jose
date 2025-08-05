"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, Plus, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Estudiante {
  id: number
  nombre_completo: string
}

interface Asistencia {
  fecha: string
  asistencias: {
    [estudianteId: number]: string
  }
}

interface AsistenciasTabProps {
  aulaId: number
}

export function AsistenciasTab({ aulaId }: AsistenciasTabProps) {
  const { toast } = useToast()
  const [trimestre, setTrimestre] = useState("1")
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [fechasAsistencia, setFechasAsistencia] = useState<string[]>([])
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [nuevaFecha, setNuevaFecha] = useState("")

  useEffect(() => {
    if (aulaId && trimestre) {
      fetchAsistencias()
    }
  }, [aulaId, trimestre])

  const fetchAsistencias = async () => {
    setIsLoading(true)
    try {
      // Fetch estudiantes
      const estudiantesResponse = await fetch(`/api/aulas/${aulaId}/estudiantes`)
      if (estudiantesResponse.ok) {
        const estudiantesData = await estudiantesResponse.json()
        setEstudiantes(estudiantesData)
      }

      // Fetch asistencias
      const asistenciasResponse = await fetch(`/api/aulas/${aulaId}/asistencias?trimestre=${trimestre}`)
      if (asistenciasResponse.ok) {
        const asistenciasData = await asistenciasResponse.json()
        setFechasAsistencia(asistenciasData.fechas || [])
        setAsistencias(asistenciasData.asistencias || [])
      }
    } catch (error) {
      console.error("Error fetching asistencias:", error)
      toast({
        title: "Error",
        description: "Error al cargar las asistencias",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAsistenciaChange = (fecha: string, estudianteId: number, valor: string) => {
    setAsistencias(
      asistencias.map((a) => {
        if (a.fecha === fecha) {
          return {
            ...a,
            asistencias: {
              ...a.asistencias,
              [estudianteId]: valor,
            },
          }
        }
        return a
      }),
    )
  }

  const handleSaveAsistencias = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/aulas/${aulaId}/asistencias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trimestre: Number.parseInt(trimestre),
          asistencias,
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Asistencias guardadas correctamente",
        })
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
      console.error("Error saving asistencias:", error)
      toast({
        title: "Error",
        description: "Error al guardar las asistencias",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddFecha = () => {
    if (!nuevaFecha) {
      toast({
        title: "Error",
        description: "Debe seleccionar una fecha",
        variant: "destructive",
      })
      return
    }

    // Check if fecha already exists
    if (fechasAsistencia.includes(nuevaFecha)) {
      toast({
        title: "Error",
        description: "Esta fecha ya existe",
        variant: "destructive",
      })
      return
    }

    // Add new fecha
    setFechasAsistencia([...fechasAsistencia, nuevaFecha])

    // Add new asistencia
    const newAsistencia: Asistencia = {
      fecha: nuevaFecha,
      asistencias: {},
    }

    // Initialize with "A" (Asistencia) for all estudiantes
    estudiantes.forEach((est) => {
      newAsistencia.asistencias[est.id] = "A"
    })

    setAsistencias([...asistencias, newAsistencia])
    setNuevaFecha("")
    setIsDialogOpen(false)
  }

  const getAsistenciaClass = (tipo: string) => {
    switch (tipo) {
      case "A":
        return "attendance-A"
      case "R":
        return "attendance-R"
      case "L":
        return "attendance-L"
      case "F":
        return "attendance-F"
      default:
        return ""
    }
  }

  const getNextAsistenciaValue = (current: string) => {
    const values = ["A", "R", "L", "F"]
    const currentIndex = values.indexOf(current)
    return values[(currentIndex + 1) % values.length]
  }

  const formatFechaHeader = (fecha: string) => {
    try {
      const date = new Date(fecha)
      return format(date, "dd/MM", { locale: es })
    } catch (error) {
      return fecha
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={trimestre} onValueChange={setTrimestre}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Primer Trimestre</SelectItem>
              <SelectItem value="2">Segundo Trimestre</SelectItem>
              <SelectItem value="3">Tercer Trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Fecha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nueva Fecha</DialogTitle>
                <DialogDescription>Seleccione la fecha para registrar asistencia.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input id="fecha" type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddFecha}>Agregar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Button onClick={handleSaveAsistencias} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Asistencias"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Cargando asistencias...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="academic-table">
            <thead>
              <tr>
                <th className="w-12">ID</th>
                <th>Estudiante</th>
                {fechasAsistencia.map((fecha) => (
                  <th key={fecha} className="attendance-cell">
                    <div className="flex flex-col items-center">
                      <Calendar className="h-4 w-4 mb-1" />
                      {formatFechaHeader(fecha)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estudiantes.length === 0 ? (
                <tr>
                  <td colSpan={fechasAsistencia.length + 2} className="text-center py-4">
                    No hay estudiantes inscritos en esta aula
                  </td>
                </tr>
              ) : (
                estudiantes.map((estudiante) => (
                  <tr key={estudiante.id}>
                    <td className="text-center">{estudiante.id}</td>
                    <td>{estudiante.nombre_completo}</td>
                    {fechasAsistencia.map((fecha) => {
                      const asistencia = asistencias.find((a) => a.fecha === fecha)
                      const valor = asistencia?.asistencias[estudiante.id] || "A"
                      return (
                        <td
                          key={`${estudiante.id}-${fecha}`}
                          className={`attendance-cell ${getAsistenciaClass(valor)}`}
                          onClick={() => handleAsistenciaChange(fecha, estudiante.id, getNextAsistenciaValue(valor))}
                        >
                          {valor}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 attendance-A flex items-center justify-center">A</div>
          <span>Asistencia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 attendance-R flex items-center justify-center">R</div>
          <span>Retraso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 attendance-L flex items-center justify-center">L</div>
          <span>Licencia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 attendance-F flex items-center justify-center">F</div>
          <span>Falta</span>
        </div>
      </div>
    </div>
  )
}
