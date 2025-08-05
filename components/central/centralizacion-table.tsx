"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Save } from "lucide-react"

interface Estudiante {
  id: number
  nombre_completo: string
}

interface Materia {
  id: number
  nombre_corto: string
  nombre_completo: string
}

interface NotaCentralizada {
  id_estudiante: number
  id_materia: number
  nota: number | null
}

interface CentralizacionTableProps {
  colegioId: number
  nivelId: number
  cursoId: number
  paraleloId: number
  trimestre: number
}

export function CentralizacionTable({ colegioId, nivelId, cursoId, paraleloId, trimestre }: CentralizacionTableProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [notas, setNotas] = useState<NotaCentralizada[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editableMateriaId, setEditableMateriaId] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [colegioId, nivelId, cursoId, paraleloId, trimestre])

  useEffect(() => {
    // Check if user is a profesor and has a materia assigned to this curso
    if (user?.roles.includes("PROFESOR")) {
      checkProfesorMateria()
    }
  }, [user, materias, colegioId, nivelId, cursoId, paraleloId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch estudiantes
      const estudiantesResponse = await fetch(
        `/api/central/estudiantes?colegioId=${colegioId}&nivelId=${nivelId}&cursoId=${cursoId}&paraleloId=${paraleloId}`,
      )
      if (estudiantesResponse.ok) {
        const estudiantesData = await estudiantesResponse.json()
        setEstudiantes(estudiantesData)
      }

      // Fetch materias
      const materiasResponse = await fetch("/api/materias")
      if (materiasResponse.ok) {
        const materiasData = await materiasResponse.json()
        setMaterias(materiasData)
      }

      // Fetch notas centralizadas
      const notasResponse = await fetch(
        `/api/central/notas?colegioId=${colegioId}&nivelId=${nivelId}&cursoId=${cursoId}&paraleloId=${paraleloId}&trimestre=${trimestre}`,
      )
      if (notasResponse.ok) {
        const notasData = await notasResponse.json()
        setNotas(notasData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkProfesorMateria = async () => {
    try {
      const response = await fetch(
        `/api/central/profesor-materia?colegioId=${colegioId}&nivelId=${nivelId}&cursoId=${cursoId}&paraleloId=${paraleloId}`,
      )
      if (response.ok) {
        const data = await response.json()
        if (data.id_materia) {
          setEditableMateriaId(data.id_materia)
        }
      }
    } catch (error) {
      console.error("Error checking profesor materia:", error)
    }
  }

  const handleNotaChange = (estudianteId: number, materiaId: number, value: string) => {
    // Check if user can edit this materia
    if (editableMateriaId !== null && editableMateriaId !== materiaId && !user?.roles.includes("ADMIN")) {
      return
    }

    // Validate input: only numbers between 0 and 100 with up to 2 decimal places
    const regex = /^([0-9]{1,2}(\.[0-9]{0,2})?|100(\.0{0,2})?)$/
    if (value === "" || regex.test(value)) {
      const numValue = value === "" ? null : Number.parseFloat(value)

      // Check if nota already exists
      const existingNotaIndex = notas.findIndex((n) => n.id_estudiante === estudianteId && n.id_materia === materiaId)

      if (existingNotaIndex >= 0) {
        // Update existing nota
        const updatedNotas = [...notas]
        updatedNotas[existingNotaIndex].nota = numValue
        setNotas(updatedNotas)
      } else {
        // Add new nota
        setNotas([
          ...notas,
          {
            id_estudiante: estudianteId,
            id_materia: materiaId,
            nota: numValue,
          },
        ])
      }
    }
  }

  const getNota = (estudianteId: number, materiaId: number): number | null => {
    const nota = notas.find((n) => n.id_estudiante === estudianteId && n.id_materia === materiaId)
    return nota ? nota.nota : null
  }

  const handleSaveNotas = async () => {
    setIsSaving(true)
    try {
      // Filter notas by editable materia if not admin
      let notasToSave = notas
      if (editableMateriaId !== null && !user?.roles.includes("ADMIN")) {
        notasToSave = notas.filter((n) => n.id_materia === editableMateriaId)
      }

      const response = await fetch("/api/central/notas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          colegioId,
          nivelId,
          cursoId,
          paraleloId,
          trimestre,
          notas: notasToSave,
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Notas guardadas correctamente",
        })
        fetchData()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al guardar las notas",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving notas:", error)
      toast({
        title: "Error",
        description: "Error al guardar las notas",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const canEditMateria = (materiaId: number) => {
    return user?.roles.includes("ADMIN") || editableMateriaId === null || editableMateriaId === materiaId
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p>Cargando datos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSaveNotas} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Notas"}
        </Button>
      </div>

      <div className="table-container">
        <table className="academic-table">
          <thead>
            <tr>
              <th className="w-12">ID</th>
              <th>Estudiante</th>
              {materias.map((materia) => (
                <th key={materia.id} className="w-24">
                  {materia.nombre_corto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {estudiantes.length === 0 ? (
              <tr>
                <td colSpan={materias.length + 2} className="text-center py-4">
                  No hay estudiantes registrados
                </td>
              </tr>
            ) : (
              estudiantes.map((estudiante) => (
                <tr key={estudiante.id}>
                  <td className="text-center">{estudiante.id}</td>
                  <td>{estudiante.nombre_completo}</td>
                  {materias.map((materia) => {
                    const nota = getNota(estudiante.id, materia.id)
                    const isEditable = canEditMateria(materia.id)
                    return (
                      <td key={`${estudiante.id}-${materia.id}`}>
                        <Input
                          type="text"
                          value={nota !== null ? nota.toString() : ""}
                          onChange={(e) => handleNotaChange(estudiante.id, materia.id, e.target.value)}
                          className="text-center"
                          placeholder="0-100"
                          disabled={!isEditable}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
