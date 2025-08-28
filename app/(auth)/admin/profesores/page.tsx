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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, MoreVertical, Plus, Search, UserPlus, UserCheck, School } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  fecha_ingreso?: string
  aulas_activas: number
  // Los profesores siempre tienen rol PROFESOR en la nueva implementación
  roles: string[]
}



export default function ProfesoresPage() {
  const { toast } = useToast()
  const { gestionGlobal } = useGestionGlobal()
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProfesor, setEditingProfesor] = useState<Profesor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para el wizard de asignación de aulas
  const [showAssignWizard, setShowAssignWizard] = useState(false)
  const [selectedProfesorForAssign, setSelectedProfesorForAssign] = useState<Profesor | null>(null)

  // Estados para asignación de aulas durante el registro
  const [newlyCreatedProfesorId, setNewlyCreatedProfesorId] = useState<number | null>(null)
  const [showAssignAulaAfterCreate, setShowAssignAulaAfterCreate] = useState(false)
  const [newlyCreatedProfesorName, setNewlyCreatedProfesorName] = useState<string>("")

  // Form data - simplificado para la nueva API
  const [formData, setFormData] = useState({
    usuario: "",
    nombre_completo: "",
    email: "",
    telefono: "",
    password: "",
  })

  // Errores de validación del formulario
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Validaciones
  const validateNombreCompleto = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return "El nombre es obligatorio"
    if (trimmed.length < 3) return "Debe tener al menos 3 caracteres"
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+$/.test(trimmed)) {
      return "Escribe nombre y apellido válidos"
    }
    return ""
  }

  const validateEmail = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return "El email es obligatorio"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return "Email inválido"
    return ""
  }

  const validateUsuario = (value: string, isEdit: boolean) => {
    const trimmed = value.trim()
    if (!isEdit && !trimmed) return "El usuario es obligatorio"
    if (!isEdit) {
      if (trimmed.length < 3) return "Mínimo 3 caracteres"
      if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) return "Solo letras, números, punto, guion y guion bajo"
    }
    return ""
  }

  const validatePassword = (value: string, isEdit: boolean) => {
    const val = value
    if (!isEdit && !val) return "La contraseña es obligatoria"
    if (val) {
      if (val.length < 6) return "Mínimo 6 caracteres"
    }
    return ""
  }

  const validateTelefonoBolivia = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return "" // opcional
    const digits = trimmed.replace(/[^\d+]/g, "")
    let nsn = digits
    if (nsn.startsWith("+591")) nsn = nsn.slice(4)
    else if (nsn.startsWith("591")) nsn = nsn.slice(3)
    // Móviles Bolivia: 8 dígitos iniciando en 6 o 7. Fijos: 7 dígitos iniciando 2-4 (aprox.)
    if (/^[67]\d{7}$/.test(nsn)) return ""
    if (/^[2-4]\d{6}$/.test(nsn)) return ""
    return "Teléfono boliviano inválido (ej: +591 7xxxxxxx o 7/8 dígitos)"
  }

  const validateField = (name: string, value: string, isEdit: boolean) => {
    switch (name) {
      case "nombre_completo":
        return validateNombreCompleto(value)
      case "email":
        return validateEmail(value)
      case "usuario":
        return validateUsuario(value, isEdit)
      case "password":
        return validatePassword(value, isEdit)
      case "telefono":
        return validateTelefonoBolivia(value)
      default:
        return ""
    }
  }

  useEffect(() => {
    fetchProfesores()
  }, [])

  const fetchProfesores = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/profesores")
      if (!response.ok) {
        throw new Error("No se pudo obtener la lista de profesores")
      }
      const data = await response.json()
      const profesoresConRoles = (Array.isArray(data) ? data : []).map((profesor: any) => ({
        ...profesor,
        roles: profesor?.roles && Array.isArray(profesor.roles) && profesor.roles.length > 0 ? profesor.roles : ["PROFESOR"],
      }))
      setProfesores(profesoresConRoles)
    } catch (error) {
      console.error("Error fetching profesores:", error)
      setProfesores([])
    } finally {
      setIsLoading(false)
    }
  }



  const resetForm = () => {
    setFormData({
      usuario: "",
      nombre_completo: "",
      email: "",
      telefono: "",
      password: "",
    })
    setEditingProfesor(null)
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
        password: "", // No mostrar contraseña existente
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
    // Validación en tiempo real
    const errorMsg = validateField(name, value, !!editingProfesor)
    setErrors(prev => ({ ...prev, [name]: errorMsg }))
  }





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validación completa antes de enviar
      const newErrors: { [key: string]: string } = {}
      newErrors["nombre_completo"] = validateField("nombre_completo", formData.nombre_completo, !!editingProfesor)
      newErrors["email"] = validateField("email", formData.email, !!editingProfesor)
      newErrors["telefono"] = validateField("telefono", formData.telefono, !!editingProfesor)
      newErrors["usuario"] = validateField("usuario", formData.usuario, !!editingProfesor)
      newErrors["password"] = validateField("password", formData.password, !!editingProfesor)

      // En edición, si password está vacío no es error
      if (editingProfesor && !formData.password) {
        newErrors["password"] = ""
      }

      // En edición, usuario no se edita, así que no lo exigimos
      if (editingProfesor) {
        newErrors["usuario"] = ""
      }

      // Limpiar errores vacíos
      Object.keys(newErrors).forEach((k) => { if (!newErrors[k]) delete newErrors[k] })
      setErrors(newErrors)

      if (Object.keys(newErrors).length > 0) {
        toast({
          title: "Revisa el formulario",
          description: "Hay campos con errores. Corrígelos para continuar.",
          variant: "destructive",
        })
        return
      }

      let response
      if (editingProfesor) {
        // Para editar, usar PUT con la nueva API simplificada
        response = await fetch(`/api/profesores/${editingProfesor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre_completo: formData.nombre_completo,
            email: formData.email,
            telefono: formData.telefono,
            ...(formData.password && { password: formData.password }) // Solo incluir si hay nueva contraseña
          }),
        })

        if (response.ok) {
          toast({
            title: "Éxito",
            description: "Profesor actualizado correctamente",
          })
          handleCloseDialog()
          fetchProfesores()
        }
      } else {
        // Para crear, usar POST con la nueva API simplificada
        response = await fetch("/api/profesores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario: formData.usuario,
            nombre_completo: formData.nombre_completo,
            email: formData.email,
            telefono: formData.telefono,
            password: formData.password
          }),
        })

        if (response.ok) {
          const result = await response.json()

          // Para nuevos profesores, mostrar opción de asignar aula
          setNewlyCreatedProfesorId(result.id)
          setNewlyCreatedProfesorName(formData.nombre_completo)
          setShowAssignAulaAfterCreate(true)

          toast({
            title: "¡Profesor creado exitosamente!",
            description: "El profesor ha sido registrado. ¿Deseas asignarle un aula ahora?",
          })
        }
      }

      if (!response.ok) {
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
                  {profesores.filter(p => (p.aulas_activas || 0) > 0).length}
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
                  {profesores.reduce((total, p) => total + (p.aulas_activas || 0), 0)}
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

      {/* Dialog Simplificado */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProfesor ? "Editar Profesor" : "Nuevo Profesor"}
            </DialogTitle>
            <DialogDescription>
              {editingProfesor
                ? "Actualiza la información básica del profesor"
                : "Crea un nuevo profesor con información básica. Las asignaciones de cursos y aulas se harán posteriormente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_completo">Nombre completo *</Label>
                  <Input
                    id="nombre_completo"
                    name="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={handleInputChange}
                    placeholder="Juan Pérez García"
                    required
                  />
                  {errors["nombre_completo"] && (
                    <p className="text-xs text-red-600">{errors["nombre_completo"]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="juan.perez@colegio.edu"
                    required
                  />
                  {errors["email"] && (
                    <p className="text-xs text-red-600">{errors["email"]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="555-1234"
                  />
                  {errors["telefono"] && (
                    <p className="text-xs text-red-600">{errors["telefono"]}</p>
                  )}
                </div>
                {!editingProfesor && (
                  <div className="space-y-2">
                    <Label htmlFor="usuario">Usuario *</Label>
                    <Input
                      id="usuario"
                      name="usuario"
                      value={formData.usuario}
                      onChange={handleInputChange}
                      placeholder="jperez"
                      required
                    />
                    {errors["usuario"] && (
                      <p className="text-xs text-red-600">{errors["usuario"]}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">
                    {editingProfesor ? "Nueva contraseña (opcional)" : "Contraseña *"}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingProfesor ? "Dejar vacío para mantener actual" : "Contraseña segura"}
                    required={!editingProfesor}
                  />
                  {errors["password"] && (
                    <p className="text-xs text-red-600">{errors["password"]}</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">Información importante</h4>
                    <p className="text-sm text-blue-700">
                      {editingProfesor
                        ? "Los cambios se aplicarán inmediatamente al profesor."
                        : "Después de crear el profesor, podrás asignarle aulas específicas con materias, cursos y paralelos para que pueda comenzar a trabajar."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProfesor ? "Actualizar" : "Crear"} Profesor
              </Button>
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


}