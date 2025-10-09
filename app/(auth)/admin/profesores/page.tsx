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
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import AssignAulaWizard from "./assign-aula-wizard"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

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
  aulas_asignadas?: number
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
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
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
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    estado: "activo" as "activo" | "inactivo",
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

      setEditingUserId((profesor as any).id_usuario ?? profesor.id)
      setFormData({
        usuario: profesor.usuario,
        nombres: profesor.nombres || "",
        apellido_paterno: profesor.apellido_paterno || "",
        apellido_materno: profesor.apellido_materno || "",
        email: profesor.email || "",
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
    setEditingProfesor(null)
    setEditingUserId(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRoleSelect = (value: string) => {
    setFormData(prev => ({ ...prev, role: (value === "ADMIN" ? "ADMIN" : "PROFESOR") }))
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let response
      if (editingProfesor) {
        const payload: any = {
          nombres: formData.nombres.trim(),
          apellido_paterno: formData.apellido_paterno.trim(),
          apellido_materno: formData.apellido_materno.trim(),
          email: formData.email.trim(),
          activo: formData.estado === "activo",
          roles: [formData.role],
          es_tutor: formData.es_tutor,
          puede_centralizar_notas: formData.puede_centralizar_notas,
        }
        const targetId = editingUserId ?? (editingProfesor as any).id_usuario ?? editingProfesor.id
        response = await fetch(`/api/profesores/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        // Validación mínima en creación
        if (!formData.usuario.trim() || !formData.nombres.trim() || !formData.apellido_paterno.trim() || !formData.apellido_materno.trim() || !formData.email.trim()) {
          toast({ title: "Campos requeridos", description: "Nombres, apellidos, usuario y email son obligatorios", variant: "destructive" })
          setIsSubmitting(false)
          return
        }
        response = await fetch("/api/profesores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario: formData.usuario.trim(),
            nombres: formData.nombres.trim(),
            apellido_paterno: formData.apellido_paterno.trim(),
            apellido_materno: formData.apellido_materno.trim(),
            email: formData.email.trim(),
            estado: formData.estado,
            roles: [formData.role],
            es_tutor: formData.es_tutor,
            puede_centralizar_notas: formData.puede_centralizar_notas,
          }),
        })
      }

      if (response.ok) {
        // Leer la respuesta para obtener información del email
        let responseData = null
        try {
          if (response.headers.get("content-type")?.includes("application/json")) {
            responseData = await response.json()
          }
        } catch { }

        // Mostrar mensaje según el estado del email
        if (responseData?.emailEnviado) {
          toast({
            title: "Usuario creado exitosamente",
            description: `Las credenciales han sido enviadas a ${formData.email}`,
          })
        } else if (responseData?.emailError) {
          toast({
            title: "Usuario creado",
            description: `Usuario creado pero error al enviar email: ${responseData.emailError}`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Éxito",
            description: editingProfesor ? "Usuario actualizado" : "Usuario creado",
          })
        }

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
    (profesor.email ? profesor.email.toLowerCase() : "").includes(searchTerm.toLowerCase())
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

      {/* Stats Panel removido por simplificación de UI */}

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
                  <TableHead>Roles</TableHead>
                  <TableHead>Tutor</TableHead>
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
                            <DropdownMenuItem onClick={() => handleResetPassword((profesor as any).id_usuario ?? profesor.id)}>
                              Restablecer contraseña
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteProfesor((profesor as any).id_usuario ?? profesor.id)}
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
              {editingProfesor ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              Completa los datos principales del docente, define su acceso y otorga permisos claves.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-lg border p-4 md:p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Información personal</h3>
                <p className="text-sm text-muted-foreground">Completa los datos básicos del docente.</p>
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
              </div>
            </section>

            <section className="rounded-lg border p-4 md:p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Acceso a la plataforma</h3>
                <p className="text-sm text-muted-foreground">Define el usuario y controla el estado de la cuenta.</p>
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="correo@ejemplo.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Las credenciales se enviarán automáticamente a este email
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-dashed px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Cuenta activa</p>
                  <p className="text-xs text-muted-foreground">Desactiva para bloquear el acceso del usuario.</p>
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
                <h3 className="text-base font-semibold">Rol y permisos</h3>
                <p className="text-sm text-muted-foreground">Asigna el rol principal y habilita funciones adicionales.</p>
              </div>
              <div className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">Responsable directo del curso y su seguimiento.</p>
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
                      <p className="text-xs text-muted-foreground">Autoriza cargar la centralización de notas del curso.</p>
                    </div>
                    <Switch
                      id="puede_centralizar_notas"
                      checked={formData.puede_centralizar_notas}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, puede_centralizar_notas: checked }))}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProfesor ? "Actualizar" : "Crear"} Usuario
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

  // Debug log
  console.log("Render - newlyCreatedProfesorId:", newlyCreatedProfesorId, "showAssignWizard:", showAssignWizard)
}
