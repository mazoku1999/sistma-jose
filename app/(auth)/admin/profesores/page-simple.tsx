"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, MoreVertical, Plus, Search, UserPlus, School, BookOpen, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

interface Profesor {
  id: number
  usuario: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  nombre_completo: string
  email: string
  estado: "activo" | "inactivo"
  fecha_registro: string
  roles: string[]
  asignaciones: number
  profesor_area?: boolean
  es_tutor?: boolean
  puede_centralizar_notas?: boolean
}

interface Colegio {
  id: number
  nombre: string
}

interface Materia {
  id: number
  nombre_completo: string
}

interface ColegioAsignacion {
  colegioId: number
  materias: number[]
}

export default function ProfesoresPageSimple() {
  const { toast } = useToast()
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [colegios, setColegios] = useState<Colegio[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProfesor, setEditingProfesor] = useState<Profesor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Form data
  const [formData, setFormData] = useState({
    usuario: "",
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    password: "",
    estado: "activo",
    role: "PROFESOR" as "PROFESOR" | "ADMIN",
    es_tutor: false,
    puede_centralizar_notas: true,
  })

  // Asignaciones por colegio (simplificadas)
  const [asignaciones, setAsignaciones] = useState<ColegioAsignacion[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchProfesores(),
        fetchColegios(),
        fetchMaterias()
      ])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProfesores = async () => {
    try {
      const response = await fetch("/api/profesores")
      if (response.ok) {
        const data = await response.json()
        setProfesores(data)
      }
    } catch (error) {
      console.error("Error fetching profesores:", error)
    }
  }

  const fetchColegios = async () => {
    try {
      const response = await fetch("/api/colegios")
      if (response.ok) {
        const data = await response.json()
        setColegios(data)
      }
    } catch (error) {
      console.error("Error fetching colegios:", error)
    }
  }

  const fetchMaterias = async () => {
    try {
      const response = await fetch("/api/materias")
      if (response.ok) {
        const data = await response.json()
        setMaterias(data)
      }
    } catch (error) {
      console.error("Error fetching materias:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      usuario: "",
      nombres: "",
      apellido_paterno: "",
      apellido_materno: "",
      email: "",
      password: "",
      estado: "activo",
      role: "PROFESOR",
      es_tutor: false,
      puede_centralizar_notas: true,
    })
    setAsignaciones([])
    setEditingProfesor(null)
    setCurrentStep(1)
  }

  const handleOpenDialog = (profesor?: Profesor) => {
    resetForm()
    if (profesor) {
      setEditingProfesor(profesor)
      setFormData({
        usuario: profesor.usuario,
        nombres: profesor.nombres || "",
        apellido_paterno: profesor.apellido_paterno || "",
        apellido_materno: profesor.apellido_materno || "",
        email: profesor.email,
        password: "",
        estado: profesor.estado,
        role: (profesor.roles && profesor.roles.includes("ADMIN")) ? "ADMIN" : "PROFESOR",
        es_tutor: !!profesor.es_tutor,
        puede_centralizar_notas: profesor.puede_centralizar_notas !== undefined ? !!profesor.puede_centralizar_notas : true,
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    resetForm()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRoleSelect = (value: string) => {
    setFormData(prev => ({ ...prev, role: (value === "ADMIN" ? "ADMIN" : "PROFESOR") }))
  }

  const handleColegioToggle = (colegioId: number) => {
    setAsignaciones(prev => {
      const exists = prev.find(a => a.colegioId === colegioId)
      if (exists) {
        return prev.filter(a => a.colegioId !== colegioId)
      } else {
        return [...prev, { colegioId, materias: [] }]
      }
    })
  }

  const handleMateriaToggle = (colegioId: number, materiaId: number) => {
    setAsignaciones(prev =>
      prev.map(asignacion => {
        if (asignacion.colegioId === colegioId) {
          const materias = asignacion.materias.includes(materiaId)
            ? asignacion.materias.filter(id => id !== materiaId)
            : [...asignacion.materias, materiaId]
          return { ...asignacion, materias }
        }
        return asignacion
      })
    )
  }

  const handleSelectAllMaterias = (colegioId: number) => {
    const allMateriaIds = materias.map(m => m.id)
    setAsignaciones(prev =>
      prev.map(asignacion =>
        asignacion.colegioId === colegioId
          ? { ...asignacion, materias: allMateriaIds }
          : asignacion
      )
    )
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault()
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const dataToSend = {
        usuario: formData.usuario,
        nombres: formData.nombres,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno,
        email: formData.email,
        password: formData.password,
        estado: formData.estado,
        roles: [formData.role],
        asignaciones,
        es_tutor: formData.es_tutor,
        puede_centralizar_notas: formData.puede_centralizar_notas,
      }

      let response
      if (editingProfesor) {
        response = await fetch(`/api/profesores/${editingProfesor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...dataToSend, es_tutor: formData.es_tutor }),
        })
      } else {
        response = await fetch("/api/profesores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        })
      }

      if (response.ok) {
        toast({
          title: "Éxito",
          description: editingProfesor ? "Profesor actualizado correctamente" : "Profesor creado correctamente",
        })
        handleCloseDialog()
        fetchProfesores()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Ocurrió un error al guardar los datos",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving profesor:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar los datos",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProfesor = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este profesor?")) return

    try {
      const response = await fetch(`/api/profesores/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Profesor eliminado correctamente",
        })
        fetchProfesores()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo eliminar el profesor",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting profesor:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el profesor",
        variant: "destructive",
      })
    }
  }

  const handleResetPassword = async (id: number) => {
    if (!confirm("¿Está seguro de restablecer la contraseña de este profesor?")) return

    try {
      const response = await fetch(`/api/profesores/${id}/reset-password`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Contraseña restablecida",
          description: `Nueva contraseña: ${data.password}`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo restablecer la contraseña",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al restablecer la contraseña",
        variant: "destructive",
      })
    }
  }

  const filteredProfesores = profesores.filter(profesor =>
    profesor.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profesor.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Cargando profesores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Profesores</h1>
          <p className="text-muted-foreground">Administra los profesores y sus asignaciones por colegio</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Profesor
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar profesores..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredProfesores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfesores.map((profesor) => (
                  <TableRow key={profesor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {profesor.nombre_completo.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profesor.nombre_completo}</p>
                          <p className="text-xs text-muted-foreground">@{profesor.usuario}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{profesor.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          (profesor.roles || []).includes("ADMIN")
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }
                      >
                        {(profesor.roles || []).includes("ADMIN") ? "Admin" : "Profesor"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          profesor.es_tutor
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }
                      >
                        {profesor.es_tutor ? "Tutor" : "No tutor"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={profesor.estado === "activo" ? "default" : "secondary"}
                        className={
                          profesor.estado === "activo"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {profesor.estado === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{profesor.asignaciones || 0}</span>
                        <span className="text-muted-foreground"> colegios</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenDialog(profesor)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(profesor.id)}>
                            Restablecer contraseña
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteProfesor(profesor.id)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-1">No hay profesores</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No se encontraron profesores con los criterios de búsqueda
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Profesor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfesor ? "Editar Profesor" : "Nuevo Profesor"}
            </DialogTitle>
            <DialogDescription>
              {editingProfesor
                ? "Actualiza la información del profesor y sus asignaciones"
                : "Completa la información del profesor y asigna colegios y materias"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Información Personal */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <h3 className="text-lg font-medium">Información Personal</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombres">Nombres *</Label>
                    <Input
                      id="nombres"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido_paterno">Apellido paterno *</Label>
                    <Input
                      id="apellido_paterno"
                      name="apellido_paterno"
                      value={formData.apellido_paterno}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido_materno">Apellido materno *</Label>
                    <Input
                      id="apellido_materno"
                      name="apellido_materno"
                      value={formData.apellido_materno}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Acceso y Roles */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <h3 className="text-lg font-medium">Acceso y Roles</h3>
                </div>

                <section className="rounded-lg border p-4 md:p-6 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold">Credenciales de acceso</h4>
                    <p className="text-sm text-muted-foreground">Configura usuario y contraseña para el ingreso al sistema.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="usuario">Usuario *</Label>
                      <Input
                        id="usuario"
                        name="usuario"
                        value={formData.usuario}
                        onChange={handleInputChange}
                        required
                        disabled={!!editingProfesor}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        {editingProfesor ? "Nueva contraseña (opcional)" : "Contraseña *"}
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!editingProfesor}
                        placeholder={editingProfesor ? "Dejar vacío para mantener" : "Contraseña temporal"}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-dashed px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Cuenta activa</p>
                      <p className="text-xs text-muted-foreground">Desactiva para impedir el acceso del usuario.</p>
                    </div>
                    <Switch
                      id="estado"
                      checked={formData.estado === "activo"}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, estado: checked ? "activo" : "inactivo" }))}
                    />
                  </div>
                </section>

                <section className="rounded-lg border p-4 md:p-6 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold">Rol y permisos</h4>
                    <p className="text-sm text-muted-foreground">Asigna el rol principal y habilita permisos adicionales.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rol principal</Label>
                      <Select value={formData.role} onValueChange={handleRoleSelect}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROFESOR">Profesor</SelectItem>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-md border border-dashed px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">Profesor tutor</p>
                        <p className="text-xs text-muted-foreground">Responsable directo de estudiantes y curso.</p>
                      </div>
                      <Switch
                        id="es_tutor"
                        checked={formData.es_tutor}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, es_tutor: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-dashed px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">Puede centralizar notas</p>
                        <p className="text-xs text-muted-foreground">Autoriza subir la centralización institucional.</p>
                      </div>
                      <Switch
                        id="puede_centralizar_notas"
                        checked={formData.puede_centralizar_notas}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, puede_centralizar_notas: checked }))}
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Step 3: Asignaciones por Colegio (Simplificado) */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <h3 className="text-lg font-medium">Asignaciones por Colegio</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Selecciona los colegios donde trabajará el profesor y las materias que puede enseñar en cada uno.
                  <br />
                  <strong>Nota:</strong> Los niveles, cursos y paralelos específicos se asignarán cuando el profesor cree sus aulas.
                </p>

                <div className="space-y-6">
                  {colegios.map((colegio) => {
                    const asignacion = asignaciones.find(a => a.colegioId === colegio.id)
                    const isSelected = !!asignacion

                    return (
                      <Card key={colegio.id} className={isSelected ? "border-primary/50 bg-primary/5" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`colegio-${colegio.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleColegioToggle(colegio.id)}
                            />
                            <div className="flex items-center gap-2">
                              <School className="h-5 w-5 text-primary" />
                              <Label htmlFor={`colegio-${colegio.id}`} className="text-base font-medium cursor-pointer">
                                {colegio.nombre}
                              </Label>
                            </div>
                          </div>
                        </CardHeader>

                        {isSelected && (
                          <CardContent className="pt-0">
                            <Separator className="mb-4" />
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  <Label className="text-sm font-medium">
                                    Materias que puede enseñar:
                                  </Label>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSelectAllMaterias(colegio.id)}
                                >
                                  Seleccionar todas
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg max-h-48 overflow-y-auto">
                                {materias.map((materia) => (
                                  <div key={materia.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`colegio-${colegio.id}-materia-${materia.id}`}
                                      checked={asignacion?.materias.includes(materia.id) || false}
                                      onCheckedChange={() => handleMateriaToggle(colegio.id, materia.id)}
                                    />
                                    <Label
                                      htmlFor={`colegio-${colegio.id}-materia-${materia.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {materia.nombre_completo}
                                    </Label>
                                  </div>
                                ))}
                              </div>

                              {asignacion && asignacion.materias.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>{asignacion.materias.length} materia(s) seleccionada(s)</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>

                {asignaciones.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <School className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selecciona al menos un colegio para continuar</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Paso {currentStep} de 3
              </div>
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    Anterior
                  </Button>
                )}
                {currentStep < 3 ? (
                  <Button type="button" onClick={handleNext}>
                    Siguiente
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProfesor ? "Actualizar" : "Crear"} Profesor
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}