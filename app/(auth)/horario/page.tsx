"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Calendar, Clock, Plus, Edit, Trash2, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Horario {
  id: number
  dia: number
  hora_inicio: string
  hora_fin: string
  id_aula: number
  nombre_aula: string
  materia: string
  curso: string
  paralelo: string
}

export default function HorarioPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [aulas, setAulas] = useState<{ id: number; nombre: string }[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    dia: "1",
    hora_inicio: "07:00",
    hora_fin: "08:30",
    id_aula: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchHorarios()
    fetchAulas()
  }, [])

  const fetchHorarios = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/horario")
      if (response.ok) {
        const data = await response.json()
        setHorarios(data)
      } else {
        console.error("Error al cargar horarios")
      }
    } catch (error) {
      console.error("Error al cargar horarios:", error)
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
      } else {
        console.error("Error al cargar aulas")
      }
    } catch (error) {
      console.error("Error al cargar aulas:", error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/horario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsDialogOpen(false)
        fetchHorarios()
        setFormData({
          dia: "1",
          hora_inicio: "07:00",
          hora_fin: "08:30",
          id_aula: "",
        })
      } else {
        const data = await response.json()
        setError(data.error || "Error al crear el horario")
      }
    } catch (error) {
      console.error("Error al crear horario:", error)
      setError("Error al crear el horario")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta clase del horario?")) {
      return
    }

    try {
      const response = await fetch(`/api/horario/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchHorarios()
      } else {
        console.error("Error al eliminar horario")
      }
    } catch (error) {
      console.error("Error al eliminar horario:", error)
    }
  }

  const getDayName = (day: number) => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    return days[day]
  }

  // Función helper para formatear horas (quitar segundos)
  const formatTime = (time: string) => {
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':')
      return `${hours}:${minutes}`
    }
    return time
  }

  // Función para generar la tabla de horario dinámicamente
  const generateScheduleTable = () => {
    const days = [1, 2, 3, 4, 5, 6] // Lunes a Sábado
    const dayNames = ["", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"]

    // Obtener todos los horarios únicos ordenados por hora
    const allHorarios = horarios.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

    // Crear slots de tiempo basados en los horarios reales
    const timeSlots = []
    const processedTimes = new Set()

    allHorarios.forEach(horario => {
      const startFormatted = formatTime(horario.hora_inicio)
      const endFormatted = formatTime(horario.hora_fin)
      const timeKey = `${startFormatted}-${endFormatted}`

      if (!processedTimes.has(timeKey)) {
        processedTimes.add(timeKey)
        timeSlots.push({
          start: startFormatted,
          end: endFormatted,
          period: `${startFormatted} - ${endFormatted}`
        })
      }
    })


    // Ordenar slots por hora
    timeSlots.sort((a, b) => a.start.localeCompare(b.start))

    return (
      <div className="w-full">
        <table className="w-full border-collapse border border-gray-300 table-fixed">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-1 text-center font-medium text-xs w-20">DÍA</th>
              {dayNames.slice(1).map((dayName, index) => (
                <th key={index} className="border border-gray-300 p-1 text-center font-medium text-xs">
                  {dayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, index) => {
              return (
                <tr key={index}>
                  <td className="border border-gray-300 p-1 text-center font-medium bg-gray-50 text-xs w-20">
                    <div className="flex flex-col items-center">
                      <div className="text-xs font-bold">{slot.start}</div>
                      <div className="text-xs">{String.fromCharCode(65 + index)}</div>
                      <div className="text-xs font-bold">{slot.end}</div>
                    </div>
                  </td>
                  {days.map((day) => {
                    const dayHorarios = horarios.filter(h => h.dia === day)
                    const matchingHorario = dayHorarios.find(h => {
                      const hStart = formatTime(h.hora_inicio)
                      const hEnd = formatTime(h.hora_fin)
                      return hStart === slot.start && hEnd === slot.end
                    })

                    return (
                      <td key={day} className="border border-gray-300 p-0.5 text-center">
                        {matchingHorario ? (
                          <div className="p-1 rounded bg-blue-100 border border-blue-200 relative group">
                            <div className="font-medium text-xs text-blue-800 line-clamp-2" title={matchingHorario.nombre_aula}>
                              {matchingHorario.nombre_aula}
                            </div>
                            <div className="text-xs text-blue-600">
                              {formatTime(matchingHorario.hora_inicio)}-{formatTime(matchingHorario.hora_fin)}
                            </div>
                            {matchingHorario.materia && (
                              <div className="text-xs text-blue-500 font-medium line-clamp-2" title={matchingHorario.materia}>
                                {matchingHorario.materia}
                              </div>
                            )}
                            {/* Botón de eliminar */}
                            <button
                              onClick={() => handleDelete(matchingHorario.id)}
                              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar clase"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="text-gray-300 text-xs">
                            Libre
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

      </div>
    )
  }

  // Función para exportar horario a Excel
  const handleExport = async () => {
    try {
      const response = await fetch('/api/exportar-horario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `horario-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        console.error('Error al exportar horario:', errorData)
        alert(`Error al exportar horario: ${errorData.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error al exportar horario:', error)
      alert('Error al exportar horario. Por favor, inténtalo de nuevo.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Cargando horario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Horario</h1>
          <p className="text-muted-foreground">Gestiona tu horario de clases semanal</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agregar clase
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Agregar clase al horario</DialogTitle>
                <DialogDescription>Completa los datos para agregar una nueva clase a tu horario</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dia">Día</Label>
                  <Select
                    name="dia"
                    value={formData.dia}
                    onValueChange={(value) => handleSelectChange("dia", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar día" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Lunes</SelectItem>
                      <SelectItem value="2">Martes</SelectItem>
                      <SelectItem value="3">Miércoles</SelectItem>
                      <SelectItem value="4">Jueves</SelectItem>
                      <SelectItem value="5">Viernes</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hora_inicio">Hora de inicio</Label>
                    <Input
                      id="hora_inicio"
                      name="hora_inicio"
                      type="time"
                      value={formData.hora_inicio}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora_fin">Hora de fin</Label>
                    <Input
                      id="hora_fin"
                      name="hora_fin"
                      type="time"
                      value={formData.hora_fin}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_aula">Aula</Label>
                  <Select
                    name="id_aula"
                    value={formData.id_aula}
                    onValueChange={(value) => handleSelectChange("id_aula", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar aula" />
                    </SelectTrigger>
                    <SelectContent>
                      {aulas.map((aula) => (
                        <SelectItem key={aula.id} value={aula.id.toString()}>
                          {aula.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mi Horario Semanal</CardTitle>
          <CardDescription>
            Horario completo de clases de lunes a sábado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {horarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay clases programadas</h3>
              <p className="text-muted-foreground text-center mb-4">
                No tienes clases programadas en tu horario
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar clase
              </Button>
            </div>
          ) : (
            generateScheduleTable()
          )}
        </CardContent>
      </Card>
    </div>
  )
}
