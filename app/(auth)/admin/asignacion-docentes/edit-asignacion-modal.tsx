"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Lock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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

interface EditAsignacionModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    asignacion: Asignacion | null
}

interface AvailableOption {
    id: number
    nombre: string
    nombre_completo?: string
    disponible?: boolean
    profesor_asignado?: string
    profesor_email?: string
}

export default function EditAsignacionModal({
    isOpen,
    onClose,
    onSuccess,
    asignacion
}: EditAsignacionModalProps) {
    const { toast } = useToast()

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)

    // Opciones disponibles
    const [profesores, setProfesores] = useState<any[]>([])
    const [materias, setMaterias] = useState<any[]>([])
    const [colegios, setColegios] = useState<any[]>([])
    const [niveles, setNiveles] = useState<any[]>([])
    const [cursos, setCursos] = useState<any[]>([])
    const [paralelos, setParalelos] = useState<AvailableOption[]>([])

    // Valores del formulario
    const [formData, setFormData] = useState({
        id_profesor: "",
        id_materia: "",
        id_colegio: "",
        id_nivel: "",
        id_curso: "",
        id_paralelo: "",
        nombre_aula: "",
        max_estudiantes: ""
    })

    // Cargar datos iniciales y verificar disponibilidad
    useEffect(() => {
        if (isOpen && asignacion) {
            // Resetear formulario
            setFormData({
                id_profesor: asignacion.id_profesor.toString(),
                id_materia: asignacion.id_materia.toString(),
                id_colegio: asignacion.id_colegio.toString(),
                id_nivel: asignacion.id_nivel.toString(),
                id_curso: asignacion.id_curso.toString(),
                id_paralelo: asignacion.id_paralelo.toString(),
                nombre_aula: asignacion.nombre_aula,
                max_estudiantes: asignacion.max_estudiantes.toString()
            })

            // Cargar opciones y verificar conflictos
            const loadData = async () => {
                await fetchOptions()
                // Pequeño delay para asegurar que los paralelos se cargaron
                setTimeout(() => {
                    checkParaleloConflicts()
                }, 100)
            }
            loadData()
        }
    }, [isOpen, asignacion])

    const fetchOptions = async () => {
        setIsLoading(true)
        try {
            const [profRes, matRes, colRes, nivRes, curRes, parRes] = await Promise.all([
                fetch("/api/profesores"),
                fetch("/api/materias"),
                fetch("/api/colegios"),
                fetch("/api/niveles"),
                fetch("/api/cursos"),
                fetch("/api/paralelos")
            ])

            if (profRes.ok) setProfesores(await profRes.json())
            if (matRes.ok) setMaterias(await matRes.json())
            if (colRes.ok) setColegios(await colRes.json())
            if (nivRes.ok) setNiveles(await nivRes.json())
            if (curRes.ok) setCursos(await curRes.json())
            if (parRes.ok) setParalelos(await parRes.json())
        } catch (error) {
            console.error("Error cargando opciones:", error)
            toast({
                title: "Error",
                description: "No se pudieron cargar las opciones",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Auto-generar nombre del aula cuando cambian materia, curso o paralelo
    useEffect(() => {
        if (formData.id_materia && formData.id_curso && formData.id_paralelo && materias.length && cursos.length && paralelos.length) {
            const materia = materias.find(m => m.id.toString() === formData.id_materia)
            const curso = cursos.find(c => c.id.toString() === formData.id_curso)
            const paralelo = paralelos.find(p => p.id.toString() === formData.id_paralelo)

            if (materia && curso && paralelo) {
                const nombreGenerado = `${materia.nombre_completo} - ${curso.nombre} ${paralelo.nombre}`
                setFormData(prev => ({ ...prev, nombre_aula: nombreGenerado }))
            }
        }
    }, [formData.id_materia, formData.id_curso, formData.id_paralelo, materias, cursos, paralelos])

    // Verificar conflictos cuando cambian materia, colegio, nivel o curso
    useEffect(() => {
        if (formData.id_materia && formData.id_colegio && formData.id_nivel && formData.id_curso && asignacion) {
            checkParaleloConflicts()
        }
    }, [formData.id_materia, formData.id_colegio, formData.id_nivel, formData.id_curso])

    const checkParaleloConflicts = async () => {
        if (!asignacion) return

        setIsCheckingConflicts(true)
        try {
            const response = await fetch("/api/aulas/check-combination", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_materia: formData.id_materia,
                    id_colegio: formData.id_colegio,
                    id_nivel: formData.id_nivel,
                    id_curso: formData.id_curso,
                    id_paralelo: "",
                    id_gestion: asignacion.gestion_nombre ? undefined : 1 // Usar gestion de la asignación actual
                })
            })

            if (response.ok) {
                const data = await response.json()

                // Actualizar paralelos con disponibilidad
                setParalelos(prev => prev.map(paralelo => {
                    const ocupado = data.ocupadas && data.ocupadas.find((o: any) =>
                        o.id_colegio.toString() === formData.id_colegio &&
                        o.id_nivel.toString() === formData.id_nivel &&
                        o.id_curso.toString() === formData.id_curso &&
                        o.id_paralelo === paralelo.id &&
                        o.id_aula_profesor !== asignacion.id // Excluir la asignación actual
                    )

                    return {
                        ...paralelo,
                        disponible: !ocupado,
                        profesor_asignado: ocupado?.profesor_nombre,
                        profesor_email: ocupado?.profesor_email
                    }
                }))
            }
        } catch (error) {
            console.error("Error verificando conflictos:", error)
        } finally {
            setIsCheckingConflicts(false)
        }
    }

    const isParaleloDisponible = () => {
        const paraleloSeleccionado = paralelos.find(p => p.id.toString() === formData.id_paralelo)
        if (!paraleloSeleccionado) return false

        if (asignacion && paraleloSeleccionado.id.toString() === asignacion.id_paralelo.toString()) {
            return true
        }

        return paraleloSeleccionado.disponible !== false
    }

    const handleSave = async () => {
        if (!asignacion) return

        // Validar campos requeridos
        if (!formData.nombre_aula || !formData.max_estudiantes) {
            toast({
                title: "Campos requeridos",
                description: "Completa todos los campos obligatorios",
                variant: "destructive"
            })
            return
        }

        // Validar que el paralelo esté disponible
        if (!isParaleloDisponible()) {
            toast({
                title: "Paralelo no disponible",
                description: "El paralelo seleccionado ya está ocupado. Por favor selecciona otro.",
                variant: "destructive"
            })
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch(`/api/aulas/${asignacion.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_profesor: parseInt(formData.id_profesor),
                    id_materia: parseInt(formData.id_materia),
                    id_colegio: parseInt(formData.id_colegio),
                    id_nivel: parseInt(formData.id_nivel),
                    id_curso: parseInt(formData.id_curso),
                    id_paralelo: parseInt(formData.id_paralelo),
                    nombre_aula: formData.nombre_aula,
                    max_estudiantes: parseInt(formData.max_estudiantes)
                })
            })

            if (response.ok) {
                toast({
                    title: "✅ Asignación actualizada",
                    description: "Los cambios se guardaron correctamente"
                })
                onSuccess()
                onClose()
            } else {
                const error = await response.json()
                toast({
                    title: "Error al actualizar",
                    description: error.error || "No se pudo actualizar la asignación",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error de conexión",
                description: "No se pudo conectar con el servidor",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (!asignacion) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Asignación</DialogTitle>
                    <DialogDescription>
                        Modifica los datos de la asignación. Los cambios se aplicarán inmediatamente.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {/* Profesor */}
                        <div className="grid gap-2">
                            <Label htmlFor="profesor">Profesor Asignado</Label>
                            <Select
                                value={formData.id_profesor}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, id_profesor: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar profesor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {profesores
                                        .filter((prof) => prof && prof.id != null)
                                        .map((prof) => (
                                            <SelectItem key={prof.id} value={prof.id.toString()}>
                                                {prof.nombre_completo ?? `Profesor ${prof.id}`}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Materia */}
                        <div className="grid gap-2">
                            <Label htmlFor="materia">Materia</Label>
                            <Select
                                value={formData.id_materia}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, id_materia: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar materia" />
                                </SelectTrigger>
                                <SelectContent>
                                    {materias
                                        .filter((mat) => mat && mat.id != null)
                                        .map((mat) => (
                                            <SelectItem key={mat.id} value={mat.id.toString()}>
                                                {mat.nombre_completo ?? `Materia ${mat.id}`}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Colegio y Nivel */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="colegio">Colegio</Label>
                                <Select
                                    value={formData.id_colegio}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, id_colegio: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colegios
                                            .filter((col) => col && col.id != null)
                                            .map((col) => (
                                                <SelectItem key={col.id} value={col.id.toString()}>
                                                    {col.nombre ?? `Colegio ${col.id}`}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="nivel">Nivel</Label>
                                <Select
                                    value={formData.id_nivel}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, id_nivel: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {niveles
                                            .filter((niv) => niv && niv.id != null)
                                            .map((niv) => (
                                                <SelectItem key={niv.id} value={niv.id.toString()}>
                                                    {niv.nombre ?? `Nivel ${niv.id}`}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Curso y Paralelo */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="curso">Curso</Label>
                                <Select
                                    value={formData.id_curso}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, id_curso: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cursos
                                            .filter((cur) => cur && cur.id != null)
                                            .map((cur) => (
                                                <SelectItem key={cur.id} value={cur.id.toString()}>
                                                    {cur.nombre ?? `Curso ${cur.id}`}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="paralelo">
                                    Paralelo
                                    {isCheckingConflicts && (
                                        <Loader2 className="h-3 w-3 animate-spin inline ml-2" />
                                    )}
                                </Label>
                                <Select
                                    value={formData.id_paralelo}
                                    onValueChange={(value) => {
                                        const paralelo = paralelos.find(p => p.id.toString() === value)
                                        const esParaleloOriginal = asignacion && paralelo?.id.toString() === asignacion.id_paralelo.toString()
                                        if (paralelo?.disponible !== false || esParaleloOriginal) {
                                            setFormData(prev => ({ ...prev, id_paralelo: value }))
                                        } else {
                                            toast({
                                                title: "Paralelo no disponible",
                                                description: `Este paralelo ya está asignado a ${paralelo.profesor_asignado}`,
                                                variant: "destructive"
                                            })
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paralelos
                                            .filter((par) => par && par.id != null)
                                            .map((par) => (
                                                <SelectItem
                                                    key={par.id}
                                                    value={par.id.toString()}
                                                    disabled={par.disponible === false}
                                                >
                                                    {par.nombre ?? `Paralelo ${par.id}`}
                                                    {par.disponible === false && par.profesor_asignado && (!asignacion || par.id.toString() !== asignacion.id_paralelo.toString()) && (
                                                        <span className="text-xs text-muted-foreground block">
                                                            Ocupado por {par.profesor_asignado}
                                                        </span>
                                                    )}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {(() => {
                                    const seleccionado = paralelos.find(p => p.id.toString() === formData.id_paralelo)
                                    const esOriginal = asignacion && seleccionado && seleccionado.id.toString() === asignacion.id_paralelo.toString()
                                    return seleccionado?.disponible === false && !esOriginal
                                })() && (
                                    <p className="text-xs text-destructive">
                                        ⚠️ Este paralelo ya está ocupado
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Nombre del Aula - Auto-generado */}
                        <div className="grid gap-2">
                            <Label htmlFor="nombre_aula">Nombre del Aula (Auto-generado)</Label>
                            <Input
                                id="nombre_aula"
                                value={formData.nombre_aula}
                                disabled
                                className="bg-muted"
                                placeholder="Se generará automáticamente"
                            />
                            <p className="text-xs text-muted-foreground">
                                El nombre se genera automáticamente según la materia, curso y paralelo
                            </p>
                        </div>

                        {/* Capacidad */}
                        <div className="grid gap-2">
                            <Label htmlFor="max_estudiantes">Capacidad Máxima</Label>
                            <Input
                                id="max_estudiantes"
                                type="number"
                                min="1"
                                max="100"
                                value={formData.max_estudiantes}
                                onChange={(e) => setFormData(prev => ({ ...prev, max_estudiantes: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Estudiantes actuales: {asignacion.estudiantes_inscritos}
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading || isCheckingConflicts || !isParaleloDisponible()}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : isCheckingConflicts ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verificando...
                            </>
                        ) : !isParaleloDisponible() ? (
                            "Paralelo no disponible"
                        ) : (
                            "Guardar Cambios"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
