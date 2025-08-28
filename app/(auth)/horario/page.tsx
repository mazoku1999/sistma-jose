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
  const [selectedDay, setSelectedDay] = useState<string>("all")
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

  const filteredHorarios =
    selectedDay === "all" ? horarios : horarios.filter((h) => h.dia === Number.parseInt(selectedDay))

  const groupedByDay = filteredHorarios.reduce(
    (acc, horario) => {
      const day = horario.dia
      if (!acc[day]) {
        acc[day] = []
      }
      acc[day].push(horario)
      return acc
    },
    {} as Record<number, Horario[]>,
  )

  // Ordenar por día y hora
  Object.keys(groupedByDay).forEach((day) => {
    groupedByDay[Number.parseInt(day)].sort((a, b) => {
      return a.hora_inicio.localeCompare(b.hora_inicio)
    })
  })

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
                      <SelectItem value="0">Domingo</SelectItem>
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
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtrar horario</CardTitle>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar día" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los días</SelectItem>
                <SelectItem value="1">Lunes</SelectItem>
                <SelectItem value="2">Martes</SelectItem>
                <SelectItem value="3">Miércoles</SelectItem>
                <SelectItem value="4">Jueves</SelectItem>
                <SelectItem value="5">Viernes</SelectItem>
                <SelectItem value="6">Sábado</SelectItem>
                <SelectItem value="0">Domingo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            {selectedDay === "all"
              ? "Mostrando el horario completo de la semana"
              : `Mostrando el horario del ${getDayName(Number.parseInt(selectedDay))}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedByDay).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay clases programadas</h3>
              <p className="text-muted-foreground text-center mb-4">
                {selectedDay === "all"
                  ? "No tienes clases programadas en tu horario"
                  : `No tienes clases programadas para el ${getDayName(Number.parseInt(selectedDay))}`}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar clase
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedByDay)
                .map(Number)
                .sort((a, b) => a - b)
                .map((day) => (
                  <div key={day} className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center">
                      <Calendar className="mr-2 h-5 w-5 text-primary" />
                      {getDayName(day)}
                    </h3>
                    <div className="space-y-3">
                      {groupedByDay[day].map((horario) => (
                        <div
                          key={horario.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 rounded-full p-2 mt-1">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{horario.nombre_aula}</h4>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  {horario.hora_inicio} - {horario.hora_fin}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {horario.materia} - {horario.curso} {horario.paralelo}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:ml-auto">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(horario.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
