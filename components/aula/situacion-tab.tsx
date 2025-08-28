"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Save } from "lucide-react"

interface Estudiante {
  id: number
  nombre_completo: string
  situacion: string
}

interface SituacionTabProps {
  aulaId: number
}

export function SituacionTab({ aulaId }: SituacionTabProps) {
  const { toast } = useToast()
  const [trimestre, setTrimestre] = useState("1")
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (aulaId && trimestre) {
      fetchSituaciones()
    }
  }, [aulaId, trimestre])

  const fetchSituaciones = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/aulas/${aulaId}/situaciones?trimestre=${trimestre}`)
      if (response.ok) {
        const data = await response.json()
        setEstudiantes(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las situaciones",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching situaciones:", error)
      toast({
        title: "Error",
        description: "Error al cargar las situaciones",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSituacionChange = (id: number, value: string) => {
    setEstudiantes(estudiantes.map((est) => (est.id === id ? { ...est, situacion: value } : est)))
  }

  const handleSaveSituaciones = async () => {
    setIsSaving(true)
    try {
      const situacionesData = estudiantes.map((est) => ({
        id_estudiante: est.id,
        situacion: est.situacion,
      }))

      const response = await fetch(`/api/aulas/${aulaId}/situaciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trimestre: Number.parseInt(trimestre),
          situaciones: situacionesData,
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Situaciones guardadas correctamente",
        })
        fetchSituaciones()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al guardar las situaciones",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving situaciones:", error)
      toast({
        title: "Error",
        description: "Error al guardar las situaciones",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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
        </div>
        <Button onClick={handleSaveSituaciones} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Situaciones"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Cargando situaciones...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="academic-table">
            <thead>
              <tr>
                <th className="w-12">ID</th>
                <th>Estudiante</th>
                <th className="w-48">Situación</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-4">
                    No hay estudiantes inscritos en esta aula
                  </td>
                </tr>
              ) : (
                estudiantes.map((estudiante) => (
                  <tr key={estudiante.id}>
                    <td className="text-center">{estudiante.id}</td>
                    <td>{estudiante.nombre_completo}</td>
                    <td>
                      <Select
                        value={estudiante.situacion}
                        onValueChange={(value) => handleSituacionChange(estudiante.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar situación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="E">Efectivo</SelectItem>
                          <SelectItem value="R">Retirado</SelectItem>
                          <SelectItem value="NI">No Incorporado</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 text-green-800 flex items-center justify-center">E</div>
          <span>Efectivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 text-red-800 flex items-center justify-center">R</div>
          <span>Retirado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-yellow-100 text-yellow-800 flex items-center justify-center">NI</div>
          <span>No Incorporado</span>
        </div>
      </div>
    </div>
  )
}
