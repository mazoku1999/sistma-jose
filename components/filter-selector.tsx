"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-provider"
import { useTrimestreGlobal } from "@/hooks/use-trimestre-global"

interface FilterOption {
  id: number
  nombre: string
}

interface FilterSelectorProps {
  onFilterChange: (filters: {
    colegioId?: number
    nivelId?: number
    cursoId?: number
    paraleloId?: number
    materiaId?: number
    trimestreId?: number
  }) => void
  showMateria?: boolean
  showTrimestre?: boolean
}

export function FilterSelector({ onFilterChange, showMateria = true, showTrimestre = true }: FilterSelectorProps) {
  const { user } = useAuth()
  const { trimestreGlobal, trimestres } = useTrimestreGlobal()
  const [colegios, setColegios] = useState<FilterOption[]>([])
  const [niveles, setNiveles] = useState<FilterOption[]>([])
  const [cursos, setCursos] = useState<FilterOption[]>([])
  const [paralelos, setParalelos] = useState<FilterOption[]>([])
  const [materias, setMaterias] = useState<FilterOption[]>([])

  const [selectedColegio, setSelectedColegio] = useState<string>("")
  const [selectedNivel, setSelectedNivel] = useState<string>("")
  const [selectedCurso, setSelectedCurso] = useState<string>("")
  const [selectedParalelo, setSelectedParalelo] = useState<string>("")
  const [selectedMateria, setSelectedMateria] = useState<string>("")
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>(trimestreGlobal || "1")
  
  const isAdmin = user?.roles.includes("ADMIN")

  useEffect(() => {
    // Fetch colegios
    fetch("/api/colegios")
      .then((res) => res.json())
      .then((data) => setColegios(data))
      .catch((error) => console.error("Error fetching colegios:", error))

    // Fetch niveles
    fetch("/api/niveles")
      .then((res) => res.json())
      .then((data) => setNiveles(data))
      .catch((error) => console.error("Error fetching niveles:", error))

    // Fetch cursos
    fetch("/api/cursos")
      .then((res) => res.json())
      .then((data) => setCursos(data))
      .catch((error) => console.error("Error fetching cursos:", error))

    // Fetch paralelos
    fetch("/api/paralelos")
      .then((res) => res.json())
      .then((data) => setParalelos(data))
      .catch((error) => console.error("Error fetching paralelos:", error))

    // Fetch materias
    fetch("/api/materias")
      .then((res) => res.json())
      .then((data) => setMaterias(data))
      .catch((error) => console.error("Error fetching materias:", error))
  }, [])

  // Actualizar trimestre cuando cambie el global (para no administradores)
  useEffect(() => {
    if (!isAdmin && trimestreGlobal) {
      setSelectedTrimestre(trimestreGlobal)
    }
  }, [trimestreGlobal, isAdmin])

  useEffect(() => {
    if (selectedColegio && selectedNivel && selectedCurso && selectedParalelo && (selectedMateria || !showMateria)) {
      onFilterChange({
        colegioId: Number.parseInt(selectedColegio),
        nivelId: Number.parseInt(selectedNivel),
        cursoId: Number.parseInt(selectedCurso),
        paraleloId: Number.parseInt(selectedParalelo),
        ...(showMateria && { materiaId: Number.parseInt(selectedMateria) }),
        ...(showTrimestre && { trimestreId: Number.parseInt(selectedTrimestre) }),
      })
    }
  }, [
    selectedColegio,
    selectedNivel,
    selectedCurso,
    selectedParalelo,
    selectedMateria,
    selectedTrimestre,
    onFilterChange,
    showMateria,
    showTrimestre,
  ])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label htmlFor="colegio">Colegio</Label>
            <Select value={selectedColegio} onValueChange={setSelectedColegio}>
              <SelectTrigger id="colegio">
                <SelectValue placeholder="Seleccionar colegio" />
              </SelectTrigger>
              <SelectContent>
                {colegios.map((colegio) => (
                  <SelectItem key={colegio.id} value={colegio.id.toString()}>
                    {colegio.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nivel">Nivel</Label>
            <Select value={selectedNivel} onValueChange={setSelectedNivel}>
              <SelectTrigger id="nivel">
                <SelectValue placeholder="Seleccionar nivel" />
              </SelectTrigger>
              <SelectContent>
                {niveles.map((nivel) => (
                  <SelectItem key={nivel.id} value={nivel.id.toString()}>
                    {nivel.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="curso">Curso</Label>
            <Select value={selectedCurso} onValueChange={setSelectedCurso}>
              <SelectTrigger id="curso">
                <SelectValue placeholder="Seleccionar curso" />
              </SelectTrigger>
              <SelectContent>
                {cursos.map((curso) => (
                  <SelectItem key={curso.id} value={curso.id.toString()}>
                    {curso.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paralelo">Paralelo</Label>
            <Select value={selectedParalelo} onValueChange={setSelectedParalelo}>
              <SelectTrigger id="paralelo">
                <SelectValue placeholder="Seleccionar paralelo" />
              </SelectTrigger>
              <SelectContent>
                {paralelos.map((paralelo) => (
                  <SelectItem key={paralelo.id} value={paralelo.id.toString()}>
                    {paralelo.letra}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showMateria && (
            <div className="space-y-2">
              <Label htmlFor="materia">Materia</Label>
              <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                <SelectTrigger id="materia">
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {materias.map((materia) => (
                    <SelectItem key={materia.id} value={materia.id.toString()}>
                      {materia.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showTrimestre && (
            <div className="space-y-2">
              <Label htmlFor="trimestre">Trimestre</Label>
              {isAdmin ? (
                <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                  <SelectTrigger id="trimestre">
                    <SelectValue placeholder="Seleccionar trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Primer Trimestre</SelectItem>
                    <SelectItem value="2">Segundo Trimestre</SelectItem>
                    <SelectItem value="3">Tercer Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center h-10 px-3 py-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{trimestres[selectedTrimestre]?.icon}</span>
                    <span className="font-medium">{trimestres[selectedTrimestre]?.label}</span>
                    <span className="text-xs">(Sistema)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
