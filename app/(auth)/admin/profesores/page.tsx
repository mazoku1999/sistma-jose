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
import { Loader2, MoreVertical, Plus, Search, UserPlus, School, BookOpen, Users, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import AssignAulaWizard from "./assign-aula-wizard"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

interface Profesor {
  id: number
  usuario: string
  nombre_completo: string
  email: string
  telefono: string
  estado: "activo" | "inactivo"
  fecha_registro: string
  roles: string[]
  asignaciones: number
  aulas_asignadas?: number
  profesor_area?: boolean
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

export default function ProfesoresPage() {
  const { toast } = useToast()
  const { gestionGlobal } = useGestionGlobal()
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [colegios, setColegios] = useState<Colegio[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProfesor, setEditingProfesor] = useState<Profesor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Estados para el wizard de asignación de aulas
  const [showAssignWizard, setShowAssignWizard] = useState(false)
  const [selectedProfesorForAssign, setSelectedProfesorForAssign] = useState<Profesor | null>(null)

  // Estados para asignación de aulas durante el registro
  const [newlyCreatedProfesorId, setNewlyCreatedProfesorId] = useState<number | null>(null)
  const [showAssignAulaAfterCreate, setShowAssignAulaAfterCreate] = useState(false)
  const [newlyCreatedProfesorName, setNewlyCreatedProfesorName] = useState<string>("")

  // Form data
  const [formData, setFormData] = useState({
    usuario: "",
    nombre_completo: "",
    email: "",
    telefono: "",
    password: "",
    estado: "activo",
    roles: ["PROFESOR"] as string[],
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
      nombre_completo: "",
      email: "",
      telefono: "",
      password: "",
      estado: "activo",
      roles: ["PROFESOR"],
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
        nombre_completo: profesor.nombre_completo,
        email: profesor.email,
        telefono: profesor.telefono || "",
        password: "",
        estado: profesor.estado,
        roles: profesor.roles,
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

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }))
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

    // Validar campos requeridos según el paso actual
    if (currentStep === 1) {
      if (!formData.nombre_completo || !formData.email) {
        toast({
          title: "Campos requeridos",
          description: "Por favor completa todos los campos obligatorios",
          variant: "destructive",
        })
        return
      }
    }

    if (currentStep === 2) {
      if (!formData.usuario || !formData.password) {
        toast({
          title: "Campos requeridos",
          description: "Por favor completa el usuario y contraseña",
          variant: "destructive",
        })
        return
      }
    }

    console.log("Avanzando al paso:", currentStep + 1)
    console.log("FormData actual:", formData)
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
        ...formData,
        asignaciones
      }

      console.log("Datos a enviar:", dataToSend)

      let response
      if (editingProfesor) {
        response = await fetch(`/api/profesores/${editingProfesor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        })
      } else {
        response = await fetch("/api/profesores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        })
      }

      if (response.ok) {
        const result = await response.json()

        if (editingProfesor) {
          toast({
            title: "Éxito",
            description: "Profesor actualizado correctamente",
          })
          handleCloseDialog()
          fetchProfesores()
        } else {
          // Para nuevos profesores, mostrar opción de asignar aula
          setNewlyCreatedProfesorId(result.id)
          setNewlyCreatedProfesorName(formData.nombre_completo)
          setShowAssignAulaAfterCreate(true)

          console.log("Profesor creado - ID recibido:", result.id, "Nombre:", formData.nombre_completo)
          console.log("Result completo:", result)

          toast({
            title: "¡Profesor creado exitosamente!",
            description: "El profesor ha sido registrado. ¿Deseas asignarle un aula ahora para que pueda comenzar a trabajar?",
          })
        }
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

  const handleAssignAula = (profesor: Profesor) => {
    setSelectedProfesorForAssign(profesor)
    setShowAssignWizard(true)
  }

  const handleAssignAulaAfterCreate = () => {
    setShowAssignAulaAfterCreate(false)
    setShowAssignWizard(true)
  }

  const handleSkipAssignAula = () => {
    setShowAssignAulaAfterCreate(false)
    setNewlyCreatedProfesorId(null)
    setNewlyCreatedProfesorName("")
    handleCloseDialog()
    fetchProfesores()
  }

  const handleAssignSuccess = () => {
    fetchProfesores() // Refrescar la lista de profesores
    setShowAssignWizard(false)
    setSelectedProfesorForAssign(null)
    setNewlyCreatedProfesorId(null)
    setNewlyCreatedProfesorName("")
    handleCloseDialog()
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra cuentas y roles. La asignación de aulas se realiza en "Asignación de docentes".</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Profesores</p>
                <p className="text-2xl font-bold">{profesores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Con Aulas</p>
                <p className="text-2xl font-bold">
                  {profesores.filter(p => (p.aulas_asignadas || 0) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <School className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Aulas</p>
                <p className="text-2xl font-bold">
                  {profesores.reduce((total, p) => total + (p.aulas_asignadas || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
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
                    <TableCell>{profesor.telefono || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profesor.roles.map((rol) => (
                          <Badge
                            key={rol}
                            variant="outline"
                            className={
                              rol === "ADMIN"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }
                          >
                            {rol === "ADMIN" ? "Admin" : "Profesor"}
                          </Badge>
                        ))}
                      </div>
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
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
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
                      </div>
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
                    <Label htmlFor="nombre_completo">Nombre completo *</Label>
                    <Input
                      id="nombre_completo"
                      name="nombre_completo"
                      value={formData.nombre_completo}
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
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Roles</Label>
                    <div className="flex gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="role-profesor"
                          checked={formData.roles.includes("PROFESOR")}
                          onCheckedChange={(checked) => handleRoleChange("PROFESOR", checked as boolean)}
                        />
                        <Label htmlFor="role-profesor">Profesor</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="role-admin"
                          checked={formData.roles.includes("ADMIN")}
                          onCheckedChange={(checked) => handleRoleChange("ADMIN", checked as boolean)}
                        />
                        <Label htmlFor="role-admin">Administrador</Label>
                      </div>
                    </div>
                  </div>
                </div>
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

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">Próximo paso: Asignación de Aulas</h4>
                      <p className="text-sm text-blue-700">
                        Después de crear el profesor, podrás asignarle aulas específicas con materias, cursos y paralelos.
                        Esto le permitirá gestionar estudiantes y calificaciones.
                      </p>
                    </div>
                  </div>
                </div>

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

      {/* Dialog para asignar aula después de crear usuario */}
      <Dialog open={showAssignAulaAfterCreate} onOpenChange={setShowAssignAulaAfterCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              ¿Asignar aula ahora?
            </DialogTitle>
            <DialogDescription className="text-left">
              <div className="space-y-3">
                <p>
                  El usuario <strong>{newlyCreatedProfesorName}</strong> ha sido creado exitosamente.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Beneficios de asignar un aula ahora:
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Podrá gestionar estudiantes inmediatamente si es docente</li>
                    <li>• Podrá registrar calificaciones y asistencias</li>
                    <li>• Tendrá acceso completo a las herramientas de enseñanza</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleAssignAulaAfterCreate}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Sí, asignar aula ahora
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipAssignAula}
            >
              No, hacerlo más tarde
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wizard para asignar aula */}
      {selectedProfesorForAssign && (
        <AssignAulaWizard
          isOpen={showAssignWizard}
          onClose={() => {
            setShowAssignWizard(false)
            setSelectedProfesorForAssign(null)
          }}
          onSuccess={handleAssignSuccess}
          currentGestionId={gestionGlobal}
          profesorId={selectedProfesorForAssign.id}
          profesorName={selectedProfesorForAssign.nombre_completo}
        />
      )}

      {/* Wizard para asignar aula al profesor recién creado */}
      {newlyCreatedProfesorId && (
        <AssignAulaWizard
          isOpen={showAssignWizard}
          onClose={() => {
            setShowAssignWizard(false)
            setNewlyCreatedProfesorId(null)
            setNewlyCreatedProfesorName("")
          }}
          onSuccess={handleAssignSuccess}
          currentGestionId={gestionGlobal}
          profesorId={newlyCreatedProfesorId}
          profesorName={newlyCreatedProfesorName}
        />
      )}
    </div>
  )

  // Debug log
  console.log("Render - newlyCreatedProfesorId:", newlyCreatedProfesorId, "showAssignWizard:", showAssignWizard)
}