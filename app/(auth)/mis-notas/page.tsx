"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { FilterSelector } from "@/components/filter-selector"
import { MisNotasTable } from "@/components/mis-notas/mis-notas-table"
import { Button } from "@/components/ui/button"
import { Loader2, Download, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  promedios: Record<string, number>
  promedio_general: number
}

interface Materia {
  id: number
  nombre: string
}

export default function MisNotasPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [selectedFilters, setSelectedFilters] = useState({
    colegio: "",
    nivel: "",
    curso: "",
    paralelo: "",
  })
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    if (selectedFilters.colegio && selectedFilters.nivel && selectedFilters.curso && selectedFilters.paralelo) {
      fetchData()
    } else {
      setEstudiantes([])
      setMaterias([])
      setIsLoading(false)
    }
  }, [selectedFilters])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Simular carga de datos
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Aquí se cargarían los datos reales desde la API
      // Por ahora usamos datos de ejemplo
      const materiasData = [
        { id: 1, nombre: "Matemáticas" },
        { id: 2, nombre: "Lenguaje" },
        { id: 3, nombre: "Ciencias" },
        { id: 4, nombre: "Historia" },
        { id: 5, nombre: "Inglés" },
      ]

      const estudiantesData = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        nombre: `Estudiante ${i + 1}`,
        apellido: `Apellido ${i + 1}`,
        promedios: materiasData.reduce(
          (acc, materia) => {
            acc[materia.id] = Number.parseFloat((Math.random() * 3 + 7).toFixed(2))
            return acc
          },
          {} as Record<number, number>,
        ),
        promedio_general: Number.parseFloat((Math.random() * 2 + 8).toFixed(2)),
      }))

      setEstudiantes(estudiantesData)
      setMaterias(materiasData)

      // Actualizar fecha de última actualización
      const now = new Date()
      setLastUpdate(
        `${now.toLocaleDateString()} ${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
      )
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (filters: any) => {
    setSelectedFilters(filters)
  }

  const handleExportarExcel = () => {
    // Implementar exportación a Excel
    console.log("Exportando a Excel...")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promedios</h1>
          <p className="text-muted-foreground">Visualiza los promedios de los estudiantes por materia</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={handleExportarExcel} disabled={estudiantes.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar curso</CardTitle>
          <CardDescription>Selecciona el curso para ver los promedios</CardDescription>
        </CardHeader>
        <CardContent>
          <FilterSelector onChange={handleFilterChange} />
        </CardContent>
        <CardFooter>
          {lastUpdate && <p className="text-sm text-muted-foreground">Última actualización: {lastUpdate}</p>}
        </CardFooter>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando datos...</span>
        </div>
      ) : estudiantes.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Promedios por materia</CardTitle>
              <Badge variant="outline">{estudiantes.length} estudiantes</Badge>
            </div>
            <CardDescription>Promedios calculados en base a las notas centralizadas de cada estudiante</CardDescription>
          </CardHeader>
          <CardContent>
            <MisNotasTable estudiantes={estudiantes} materias={materias} />
          </CardContent>
        </Card>
      ) : selectedFilters.colegio && selectedFilters.nivel && selectedFilters.curso && selectedFilters.paralelo ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
            <p className="text-muted-foreground text-center mb-4">
              No se encontraron estudiantes o promedios para el curso seleccionado
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Selecciona un curso</h3>
            <p className="text-muted-foreground text-center mb-4">
              Selecciona un colegio, nivel, curso y paralelo para ver los promedios
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
