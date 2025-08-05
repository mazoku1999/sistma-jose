"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

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
  nota: number
}

interface MisNotasTableProps {
  colegioId: number
  nivelId: number
  cursoId: number
  paraleloId: number
  trimestre: number
}

export function MisNotasTable({ colegioId, nivelId, cursoId, paraleloId, trimestre }: MisNotasTableProps) {
  const { toast } = useToast()
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [notas, setNotas] = useState<NotaCentralizada[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [colegioId, nivelId, cursoId, paraleloId, trimestre])

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

  const getNota = (estudianteId: number, materiaId: number): number | null => {
    const nota = notas.find((n) => n.id_estudiante === estudianteId && n.id_materia === materiaId)
    return nota ? nota.nota : null
  }

  const getPromedio = (estudianteId: number): number => {
    const notasEstudiante = notas.filter((n) => n.id_estudiante === estudianteId)
    if (notasEstudiante.length === 0) return 0

    const sum = notasEstudiante.reduce((acc, n) => acc + n.nota, 0)
    return Number.parseFloat((sum / notasEstudiante.length).toFixed(2))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p>Cargando datos...</p>
      </div>
    )
  }

  return (
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
            <th className="w-24 bg-blue-50">Promedio</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.length === 0 ? (
            <tr>
              <td colSpan={materias.length + 3} className="text-center py-4">
                No hay estudiantes registrados
              </td>
            </tr>
          ) : (
            estudiantes.map((estudiante) => {
              const promedio = getPromedio(estudiante.id)
              return (
                <tr key={estudiante.id}>
                  <td className="text-center">{estudiante.id}</td>
                  <td>{estudiante.nombre_completo}</td>
                  {materias.map((materia) => {
                    const nota = getNota(estudiante.id, materia.id)
                    return (
                      <td key={`${estudiante.id}-${materia.id}`} className="text-center">
                        {nota !== null ? nota : "-"}
                      </td>
                    )
                  })}
                  <td className={`text-center font-bold ${promedio >= 70 ? "bg-green-50" : "bg-red-50"}`}>
                    {promedio}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
