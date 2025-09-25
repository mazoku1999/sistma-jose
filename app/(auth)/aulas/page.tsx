"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { useGestionGlobal } from "@/hooks/use-gestion-global"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Filter, SortAsc, SortDesc, Loader2, Lock } from "lucide-react"
// import CreateAulaWizard from "./create-aula-wizard" // Removido: Los profesores ya no crean aulas
import dynamic from "next/dynamic"
import { Suspense } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const AulasListWithActions = dynamic(() => import("@/components/aula/aulas-list-with-actions"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="h-40 bg-muted rounded" />
      <div className="h-40 bg-muted rounded" />
      <div className="h-40 bg-muted rounded" />
    </div>
  )
})

interface Aula {
  id: number
  nombre_aula: string
  colegio: string
  nivel: string
  curso: string
  paralelo: string
  materia: string
  estudiantes: number
  progreso?: number
  pendientes?: number
  activa?: boolean
  fecha_eliminacion?: string
  gestion_nombre?: string
  gestion_activa?: boolean
}



export default function AulasPage() {
  const { user } = useAuth()
  const { gestionGlobal, isGestionActiva } = useGestionGlobal()
  const [aulas, setAulas] = useState<Aula[]>([])
  const [filteredAulas, setFilteredAulas] = useState<Aula[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [nivelFilter, setNivelFilter] = useState("todos")
  const [colegioFilter, setColegioFilter] = useState("todos")
  const [sortBy, setSortBy] = useState("nombre_aula")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    // Cargar aulas inmediatamente, sin esperar gestión
    fetchAulas()
  }, [])

  useEffect(() => {
    if (gestionGlobal) {
      fetchAulas()
    }
  }, [gestionGlobal])

  useEffect(() => {
    fetchAulas()
  }, [showDeleted])

  useEffect(() => {
    filterAulas()
  }, [searchTerm, nivelFilter, colegioFilter, sortBy, sortOrder, aulas])

  const fetchAulas = async () => {
    setIsLoading(true)
    try {
      // Construir URL con parámetros
      const params = new URLSearchParams()
      if (gestionGlobal) params.append('gestion', gestionGlobal.toString())
      if (showDeleted) params.append('includeDeleted', 'true')

      const url = `/api/aulas${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setAulas(Array.isArray(data) ? data : [])
        setFilteredAulas(Array.isArray(data) ? data : [])
      } else {
        // Si falla con gestión, intentar sin gestión
        if (gestionGlobal) {
          try {
            const fallbackResponse = await fetch('/api/aulas')
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json()
              setAulas(Array.isArray(fallbackData) ? fallbackData : [])
              setFilteredAulas(Array.isArray(fallbackData) ? fallbackData : [])
            } else {
              // Si ambas fallan, establecer array vacío
              setAulas([])
              setFilteredAulas([])
            }
          } catch (fallbackError) {
            console.warn("Error en fallback al cargar aulas:", fallbackError)
            setAulas([])
            setFilteredAulas([])
          }
        } else {
          // Si no hay gestión y falla, establecer array vacío
          setAulas([])
          setFilteredAulas([])
        }
      }
    } catch (error) {
      console.warn("Error al cargar aulas:", error)
      // En caso de error, establecer arrays vacíos para evitar crashes
      setAulas([])
      setFilteredAulas([])
    } finally {
      setIsLoading(false)
    }
  }





  const filterAulas = () => {
    let filtered = [...aulas]

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (aula) =>
          aula.nombre_aula.toLowerCase().includes(searchTerm.toLowerCase()) ||
          aula.materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
          aula.curso.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Aplicar filtro de nivel
    if (nivelFilter !== "todos") {
      filtered = filtered.filter((aula) => aula.nivel === nivelFilter)
    }

    // Aplicar filtro de colegio
    if (colegioFilter !== "todos") {
      filtered = filtered.filter((aula) => aula.colegio === colegioFilter)
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Aula]
      const bValue = b[sortBy as keyof Aula]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    setFilteredAulas(filtered)
  }





  const getNiveles = () => {
    const uniqueNiveles = Array.from(new Set(aulas.map((aula) => aula.nivel)))
    return uniqueNiveles
  }

  const getColegios = () => {
    const uniqueColegios = Array.from(new Set(aulas.map((aula) => aula.colegio)))
    return uniqueColegios
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Cargando aulas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Aulas</h1>
          <p className="text-muted-foreground">Gestiona tus aulas y estudiantes</p>
        </div>
        {user?.roles.includes("ADMIN") ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Aula
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                La creación de aulas se realiza desde la gestión de profesores
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">
                Las aulas son asignadas por el administrador
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Contacta al administrador si necesitas una nueva aula
            </p>
          </div>
        )}
      </div>



      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar aulas..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={nivelFilter} onValueChange={setNivelFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Nivel</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los niveles</SelectItem>
              {getNiveles().map((nivel, index) => (
                <SelectItem key={index} value={nivel}>
                  {nivel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={colegioFilter} onValueChange={setColegioFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Colegio</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los colegios</SelectItem>
              {getColegios().map((colegio, index) => (
                <SelectItem key={index} value={colegio}>
                  {colegio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                <span className="hidden sm:inline">Ordenar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("nombre_aula")}>Nombre</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("materia")}>Materia</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("estudiantes")}>Estudiantes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                {sortOrder === "asc" ? "Descendente" : "Ascendente"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Componente de lista de aulas con acciones CRUD */}
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><div className="h-40 bg-muted rounded" /><div className="h-40 bg-muted rounded" /><div className="h-40 bg-muted rounded" /></div>}>
        <AulasListWithActions
          aulas={filteredAulas}
          onUpdate={fetchAulas}
          showDeleted={showDeleted}
          onToggleDeleted={setShowDeleted}
          isAdmin={user?.roles?.includes("ADMIN") || false}
        />
      </Suspense>

      {/* Wizard removido: Los profesores ya no crean aulas directamente */}
    </div>
  )
}
