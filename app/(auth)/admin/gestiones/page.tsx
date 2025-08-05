"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    Calendar,
    Plus,
    Settings,
    Archive,
    CheckCircle,
    Clock,
    Loader2
} from "lucide-react"

interface Gestion {
    id_gestion: number
    nombre: string
    anio: number
    fecha_inicio: string
    fecha_fin: string
    activa: boolean
    descripcion: string
    fecha_creacion: string
}

interface FormData {
    nombre: string
    anio: string
    fecha_inicio: string
    fecha_fin: string
    descripcion: string
}

export default function GestionesAdminPage() {
    const { toast } = useToast()
    const [gestiones, setGestiones] = useState<Gestion[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<FormData>({
        nombre: "",
        anio: "",
        fecha_inicio: "",
        fecha_fin: "",
        descripcion: ""
    })

    useEffect(() => {
        fetchGestiones()
    }, [])

    const fetchGestiones = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/gestiones')
            if (response.ok) {
                const data = await response.json()
                setGestiones(data)
            } else {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar las gestiones",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al cargar gestiones:", error)
            toast({
                title: "Error",
                description: "Error al cargar las gestiones",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/gestiones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    anio: parseInt(formData.anio)
                })
            })

            if (response.ok) {
                toast({
                    title: "✅ Gestión creada",
                    description: "La nueva gestión académica ha sido creada correctamente",
                })
                setIsDialogOpen(false)
                setFormData({
                    nombre: "",
                    anio: "",
                    fecha_inicio: "",
                    fecha_fin: "",
                    descripcion: ""
                })
                fetchGestiones()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al crear la gestión",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al crear gestión:", error)
            toast({
                title: "Error",
                description: "Error al crear la gestión",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleActivarGestion = async (gestionId: number, activa: boolean) => {
        try {
            const response = await fetch(`/api/gestiones/${gestionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ activa })
            })

            if (response.ok) {
                toast({
                    title: activa ? "✅ Gestión activada" : "⏸️ Gestión desactivada",
                    description: activa
                        ? "La gestión ha sido activada correctamente"
                        : "La gestión ha sido desactivada correctamente",
                })
                fetchGestiones()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al actualizar la gestión",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al actualizar gestión:", error)
            toast({
                title: "Error",
                description: "Error al actualizar la gestión",
                variant: "destructive",
            })
        }
    }

    const getGestionStatus = (gestion: Gestion) => {
        if (gestion.activa) {
            return {
                label: "Activa",
                color: "bg-green-100 text-green-800",
                icon: <CheckCircle className="h-4 w-4" />
            }
        }

        const now = new Date()
        const fechaFin = new Date(gestion.fecha_fin)

        if (fechaFin < now) {
            return {
                label: "Finalizada",
                color: "bg-gray-100 text-gray-800",
                icon: <Archive className="h-4 w-4" />
            }
        } else {
            return {
                label: "Programada",
                color: "bg-blue-100 text-blue-800",
                icon: <Clock className="h-4 w-4" />
            }
        }
    }

    const generateNextYear = () => {
        const currentYear = new Date().getFullYear()
        setFormData(prev => ({
            ...prev,
            nombre: `Gestión ${currentYear}`,
            anio: currentYear.toString(),
            fecha_inicio: `${currentYear}-02-05`,
            fecha_fin: `${currentYear}-12-04`
        }))
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando gestiones...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestiones Académicas</h1>
                    <p className="text-muted-foreground">Administra los períodos académicos del sistema</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Gestión
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Crear Nueva Gestión Académica</DialogTitle>
                            <DialogDescription>
                                Define un nuevo período académico para el sistema
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateNextYear}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Generar Año Actual
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre de la Gestión</Label>
                                <Input
                                    id="nombre"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    placeholder="Ej: Gestión 2024-2025"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="anio">Año Académico</Label>
                                <Input
                                    id="anio"
                                    name="anio"
                                    type="number"
                                    value={formData.anio}
                                    onChange={handleInputChange}
                                    placeholder="2024"
                                    min="2020"
                                    max="2050"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                                    <Input
                                        id="fecha_inicio"
                                        name="fecha_inicio"
                                        type="date"
                                        value={formData.fecha_inicio}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fecha_fin">Fecha de Fin</Label>
                                    <Input
                                        id="fecha_fin"
                                        name="fecha_fin"
                                        type="date"
                                        value={formData.fecha_fin}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                                <Textarea
                                    id="descripcion"
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleInputChange}
                                    placeholder="Descripción del período académico..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Crear Gestión
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Estadísticas */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gestiones</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{gestiones.length}</div>
                        <p className="text-xs text-muted-foreground">Períodos académicos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gestión Activa</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {gestiones.filter(g => g.activa).length}
                        </div>
                        <p className="text-xs text-muted-foreground">En curso</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
                        <Archive className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-600">
                            {gestiones.filter(g => !g.activa && new Date(g.fecha_fin) < new Date()).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Completadas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Programadas</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {gestiones.filter(g => !g.activa && new Date(g.fecha_fin) >= new Date()).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Futuras</p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Gestiones */}
            <div className="space-y-4">
                {gestiones.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No hay gestiones académicas</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                Crea la primera gestión académica para comenzar
                            </p>
                            <Button onClick={() => setIsDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Primera Gestión
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    gestiones.map((gestion) => {
                        const status = getGestionStatus(gestion)
                        return (
                            <Card key={gestion.id_gestion} className="overflow-hidden">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl">{gestion.nombre}</CardTitle>
                                            <CardDescription>
                                                {new Date(gestion.fecha_inicio).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })} - {new Date(gestion.fecha_fin).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={status.color}>
                                                {status.icon}
                                                <span className="ml-1">{status.label}</span>
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {gestion.descripcion && (
                                            <p className="text-sm text-muted-foreground">
                                                {gestion.descripcion}
                                            </p>
                                        )}

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Año:</span>
                                                <p className="font-medium">{gestion.anio}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Duración:</span>
                                                <p className="font-medium">
                                                    {Math.ceil((new Date(gestion.fecha_fin).getTime() - new Date(gestion.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Creada:</span>
                                                <p className="font-medium">
                                                    {new Date(gestion.fecha_creacion).toLocaleDateString('es-ES')}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Estado:</span>
                                                <p className="font-medium">{status.label}</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4 border-t">
                                            {!gestion.activa ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleActivarGestion(gestion.id_gestion, true)}
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Activar
                                                </Button>
                                            ) : null}
                                            {gestion.activa ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleActivarGestion(gestion.id_gestion, false)}
                                                >
                                                    <Archive className="mr-2 h-4 w-4" />
                                                    Desactivar
                                                </Button>
                                            ) : null}
                                            <Button variant="ghost" size="sm">
                                                <Settings className="mr-2 h-4 w-4" />
                                                Configurar
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}