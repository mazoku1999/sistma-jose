"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, UserCheck, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import AssignAulaWizard from "../profesores/assign-aula-wizard"
import EditAsignacionModal from "./edit-asignacion-modal"
import { useGestionGlobal } from "@/hooks/use-gestion-global"
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Profesor {
    id: number
    nombre_completo: string
    usuario: string
    email: string
    aulas_asignadas?: number
    roles?: string[]
}

interface Asignacion {
    id: number
    nombre_aula: string
    materia: string
    materia_corta: string
    colegio: string
    nivel: string
    curso: string
    paralelo: string
    estudiantes_inscritos: number
    max_estudiantes: number
    activa: boolean
    id_profesor: number
    id_materia: number
    id_colegio: number
    id_nivel: number
    id_curso: number
    id_paralelo: number
    gestion_nombre: string
}

export default function AsignacionDocentesPage() {
    const { gestionGlobal } = useGestionGlobal()
    const { toast } = useToast()
    const [profesores, setProfesores] = useState<Profesor[]>([])
    const [filtered, setFiltered] = useState<Profesor[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    const [selectedProfesor, setSelectedProfesor] = useState<Profesor | null>(null)
    const [openWizard, setOpenWizard] = useState(false)
    const [expandedProfesor, setExpandedProfesor] = useState<number | null>(null)
    const [asignaciones, setAsignaciones] = useState<Record<number, Asignacion[]>>({})
    const [loadingAsignaciones, setLoadingAsignaciones] = useState<number | null>(null)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [asignacionToDelete, setAsignacionToDelete] = useState<Asignacion | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [editModalOpen, setEditModalOpen] = useState(false)
    const [asignacionToEdit, setAsignacionToEdit] = useState<Asignacion | null>(null)

    useEffect(() => {
        const fetchProfesores = async () => {
            setIsLoading(true)
            try {
                const res = await fetch("/api/profesores")
                if (res.ok) {
                    const data = await res.json()
                    const profesoresFiltrados = data.filter((prof: Profesor) => {
                        const roles = (prof.roles ?? []).map((role) => String(role).toUpperCase())
                        const esAdmin = roles.includes("ADMIN") || roles.includes("ADMINISTRATIVO")
                        const esProfesor = roles.includes("PROFESOR")
                        return esProfesor && !esAdmin
                    })

                    setProfesores(profesoresFiltrados)
                    setFiltered(profesoresFiltrados)
                }
            } finally {
                setIsLoading(false)
            }
        }
        fetchProfesores()
    }, [])

    useEffect(() => {
        const q = search.toLowerCase()
        setFiltered(
            profesores.filter((p) =>
                p.nombre_completo.toLowerCase().includes(q) ||
                p.usuario.toLowerCase().includes(q) ||
                p.email.toLowerCase().includes(q),
            ),
        )
    }, [search, profesores])

    const handleAssign = (p: Profesor) => {
        setSelectedProfesor(p)
        setOpenWizard(true)
    }

    const toggleExpanded = async (profesorId: number) => {
        if (expandedProfesor === profesorId) {
            setExpandedProfesor(null)
        } else {
            setExpandedProfesor(profesorId)
            // Cargar asignaciones si no están cargadas
            if (!asignaciones[profesorId]) {
                await fetchAsignaciones(profesorId)
            }
        }
    }

    const fetchAsignaciones = async (profesorId: number) => {
        setLoadingAsignaciones(profesorId)
        try {
            const res = await fetch(`/api/profesores/${profesorId}/aulas?gestion=${gestionGlobal}`)
            if (res.ok) {
                const data = await res.json()
                setAsignaciones(prev => ({
                    ...prev,
                    [profesorId]: data.asignaciones || []
                }))
            }
        } catch (error) {
            console.error("Error al cargar asignaciones:", error)
            toast({
                title: "Error",
                description: "No se pudieron cargar las asignaciones",
                variant: "destructive"
            })
        } finally {
            setLoadingAsignaciones(null)
        }
    }

    const handleEdit = (asignacion: Asignacion) => {
        setAsignacionToEdit(asignacion)
        setEditModalOpen(true)
    }

    const handleDeleteClick = (asignacion: Asignacion) => {
        setAsignacionToDelete(asignacion)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!asignacionToDelete) return

        setIsDeleting(true)
        try {
            const res = await fetch(`/api/aulas/${asignacionToDelete.id}`, {
                method: "DELETE"
            })

            if (res.ok) {
                toast({
                    title: "Asignación eliminada",
                    description: "La asignación ha sido eliminada exitosamente"
                })

                // Recargar asignaciones del profesor
                if (expandedProfesor) {
                    await fetchAsignaciones(expandedProfesor)
                }
            } else {
                const error = await res.json()
                toast({
                    title: "Error",
                    description: error.error || "No se pudo eliminar la asignación",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Error de conexión",
                variant: "destructive"
            })
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setAsignacionToDelete(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Asignación de docentes</h1>
                    <p className="text-muted-foreground">Busca un usuario y asígnale un aula</p>
                </div>
            </div>

            <div className="flex items-center gap-3 max-w-xl">
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, usuario o email"
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden">
                <CardHeader />
                <CardContent className="overflow-x-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map((p, profesorIndex) => {
                                const profesorId = typeof p.id === "number" ? p.id : null
                                const roles = (p.roles ?? []).map((role) => String(role).toUpperCase())
                                const canShowAssignments = profesorId !== null && roles.includes("PROFESOR")
                                const profesorAsignaciones = canShowAssignments ? (asignaciones[profesorId!] || []) : []
                                const isLoadingAsigs = canShowAssignments ? loadingAsignaciones === profesorId : false
                                // Usar el conteo del servidor o el conteo local si ya se cargaron
                                const aulasCount = profesorAsignaciones.length > 0 ? profesorAsignaciones.length : (p.aulas_asignadas || 0)
                                const profesorKey = String(p.id ?? p.usuario ?? p.email ?? `fallback-${profesorIndex}`)
                                const isExpanded = canShowAssignments && profesorId !== null && expandedProfesor === profesorId

                                return (
                                    <Card key={`prof-${profesorKey}`} className="overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium truncate">{p.nombre_completo}</div>
                                                        {canShowAssignments && (
                                                            <Badge variant="secondary" className="shrink-0">
                                                                {aulasCount} {aulasCount === 1 ? 'aula' : 'aulas'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate mt-1">
                                                        @{p.usuario} · {p.email}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    {canShowAssignments && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (profesorId !== null) {
                                                                    toggleExpanded(profesorId)
                                                                }
                                                            }}
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAssign(p)}
                                                    >
                                                        <UserCheck className="h-4 w-4 mr-1" />
                                                        Nueva Asignación
                                                    </Button>
                                                </div>
                                            </div>

                                            {canShowAssignments && isExpanded && (
                                                <div className="mt-4 border-t pt-4">
                                                    {isLoadingAsigs ? (
                                                        <div className="flex justify-center py-8">
                                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                        </div>
                                                    ) : profesorAsignaciones.length === 0 ? (
                                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                                            No hay asignaciones para este profesor en la gestión actual
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold mb-3">Asignaciones actuales:</h4>
                                                            {profesorAsignaciones.map((asig, asigIndex) => {
                                                                const asignacionKey = String(
                                                                    asig.id ??
                                                                    `${asig.id_profesor}-${asig.id_materia}-${asig.id_colegio}-${asig.id_curso}-${asig.id_paralelo}-${asig.gestion_nombre ?? `idx-${asigIndex}`}`
                                                                )

                                                                return (
                                                                    <Card key={`asig-${asignacionKey}`} className="p-3">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="font-medium text-sm truncate">
                                                                                    {asig.nombre_aula}
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        <Badge variant="outline" className="text-xs">
                                                                                            {asig.materia_corta}
                                                                                        </Badge>
                                                                                        <Badge variant="outline" className="text-xs">
                                                                                            {asig.curso} {asig.paralelo}
                                                                                        </Badge>
                                                                                        <Badge variant="outline" className="text-xs">
                                                                                            {asig.nivel}
                                                                                        </Badge>
                                                                                        <Badge variant="outline" className="text-xs">
                                                                                            {asig.colegio}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <div className="mt-1">
                                                                                        Estudiantes: {asig.estudiantes_inscritos} / {asig.max_estudiantes}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-1 shrink-0">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    onClick={() => handleEdit(asig)}
                                                                                    title="Editar asignación"
                                                                                >
                                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    onClick={() => handleDeleteClick(asig)}
                                                                                    title="Eliminar asignación"
                                                                                    className="text-destructive hover:text-destructive"
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </Card>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                            {filtered.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-10">
                                    No se encontraron usuarios con la búsqueda.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedProfesor && (
                <AssignAulaWizard
                    isOpen={openWizard}
                    onClose={() => setOpenWizard(false)}
                    onSuccess={() => {
                        setOpenWizard(false)
                        // Recargar asignaciones si el profesor está expandido
                        if (expandedProfesor === selectedProfesor.id) {
                            fetchAsignaciones(selectedProfesor.id)
                        }
                    }}
                    currentGestionId={gestionGlobal}
                    profesorId={selectedProfesor.id}
                    profesorName={selectedProfesor.nombre_completo}
                />
            )}

            <EditAsignacionModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false)
                    setAsignacionToEdit(null)
                }}
                onSuccess={() => {
                    // Recargar asignaciones del profesor
                    if (expandedProfesor) {
                        fetchAsignaciones(expandedProfesor)
                    }
                }}
                asignacion={asignacionToEdit}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar asignación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la asignación del aula "{asignacionToDelete?.nombre_aula}".
                            Los estudiantes inscritos en esta aula no serán eliminados, pero perderán la vinculación con esta aula.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                "Eliminar"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}


