"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar, Clock, Archive, ChevronDown, GraduationCap, CheckCircle2, History } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface Gestion {
    id_gestion: number
    nombre: string
    anio_inicio: number
    anio_fin: number
    fecha_inicio: string
    fecha_fin: string
    activa: boolean
    descripcion: string
}

interface GestionSelectorProps {
    onGestionChange: (gestionId: number, isActive: boolean) => void
    currentGestionId?: number
    showOnlyActive?: boolean
}

export default function GestionSelector({
    onGestionChange,
    currentGestionId,
    showOnlyActive = false
}: GestionSelectorProps) {
    const { toast } = useToast()
    const [gestiones, setGestiones] = useState<Gestion[]>([])
    const [selectedGestion, setSelectedGestion] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchGestiones()
    }, [])

    useEffect(() => {
        if (currentGestionId && gestiones.length > 0) {
            const gestion = gestiones.find(g => g.id_gestion === currentGestionId)
            setSelectedGestion(currentGestionId)
            if (gestion) {
                onGestionChange(currentGestionId, gestion.activa)
            }
        } else if (gestiones.length > 0 && !selectedGestion) {
            // Seleccionar la gestión activa por defecto
            const gestionActiva = gestiones.find(g => g.activa)
            if (gestionActiva) {
                setSelectedGestion(gestionActiva.id_gestion)
                onGestionChange(gestionActiva.id_gestion, true)
            }
        }
    }, [gestiones, currentGestionId])

    const fetchGestiones = async () => {
        setIsLoading(true)
        try {
            const url = showOnlyActive ? '/api/gestiones?activa=true' : '/api/gestiones'
            const response = await fetch(url)
            if (response.ok) {
                const data = await response.json()
                setGestiones(data)
            } else {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar las gestiones académicas",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al cargar gestiones:", error)
            toast({
                title: "Error",
                description: "Error al cargar las gestiones académicas",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleGestionChange = (gestionId: string) => {
        const id = parseInt(gestionId)
        const gestion = gestiones.find(g => g.id_gestion === id)
        setSelectedGestion(id)
        onGestionChange(id, gestion?.activa || false)
    }

    const getGestionStatus = (gestion: Gestion) => {
        if (gestion.activa) {
            return {
                color: "text-emerald-600",
                bgColor: "bg-emerald-100",
                icon: CheckCircle2,
                description: "Período académico en curso"
            }
        }

        const now = new Date()
        const fechaFin = new Date(gestion.fecha_fin)
        const fechaInicio = new Date(gestion.fecha_inicio)

        if (fechaFin < now) {
            return {
                color: "text-slate-600",
                bgColor: "bg-slate-100",
                icon: History,
                description: "Período académico completado"
            }
        } else if (fechaInicio > now) {
            return {
                color: "text-blue-600",
                bgColor: "bg-blue-100",
                icon: Calendar,
                description: "Período académico programado"
            }
        } else {
            return {
                color: "text-amber-600",
                bgColor: "bg-amber-100",
                icon: Clock,
                description: "Período en proceso de cambio"
            }
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Cargando gestiones...</span>
            </div>
        )
    }

    if (gestiones.length === 0) {
        // No mostrar nada si no hay gestiones, para que la página funcione normalmente
        return null
    }

    const selectedGestionData = gestiones.find(g => g.id_gestion === selectedGestion)
    const selectedStatus = selectedGestionData ? getGestionStatus(selectedGestionData) : null

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">Período Académico</span>
            </div>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-[250px] justify-between hover:bg-gray-50 border-2 hover:border-blue-200 transition-all duration-200"
                    >
                        {selectedGestionData ? (
                            <div className="flex items-center gap-3">
                                {selectedStatus && (
                                    <selectedStatus.icon className="h-4 w-4 text-emerald-600" />
                                )}
                                <div className="flex flex-col items-start">
                                    <span className="font-medium text-gray-900">
                                        {selectedGestionData.nombre}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(selectedGestionData.fecha_inicio).toLocaleDateString('es-ES', {
                                            month: 'short',
                                            year: 'numeric'
                                        })} - {new Date(selectedGestionData.fecha_fin).toLocaleDateString('es-ES', {
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-500">Seleccionar período académico</span>
                        )}
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[400px] p-2" align="start">
                    <div className="space-y-2">
                        <div className="px-3 py-2 border-b">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                Períodos Académicos
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Selecciona el año escolar para gestionar
                            </p>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                            <AnimatePresence>
                                {gestiones.map((gestion, index) => {
                                    const status = getGestionStatus(gestion)
                                    const isSelected = selectedGestion === gestion.id_gestion

                                    return (
                                        <motion.div
                                            key={gestion.id_gestion}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Card
                                                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                                                    ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                                                    : 'hover:bg-gray-50 border-gray-200'
                                                    }`}
                                                onClick={() => handleGestionChange(gestion.id_gestion.toString())}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-full ${gestion.activa
                                                                ? 'bg-emerald-100'
                                                                : 'bg-gray-100'
                                                                }`}>
                                                                <status.icon className={`h-4 w-4 ${gestion.activa
                                                                    ? 'text-emerald-600'
                                                                    : 'text-gray-600'
                                                                    }`} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-gray-900">
                                                                        {gestion.nombre}
                                                                    </span>
                                                                    {isSelected && (
                                                                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                                                    )}
                                                                </div>
                                                                <span className="text-sm text-gray-600">
                                                                    {new Date(gestion.fecha_inicio).toLocaleDateString('es-ES', {
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        year: 'numeric'
                                                                    })} - {new Date(gestion.fecha_fin).toLocaleDateString('es-ES', {
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        year: 'numeric'
                                                                    })}
                                                                </span>
                                                                <span className="text-xs text-gray-500 mt-1">
                                                                    {status.description}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Indicador visual solo con color */}
                                                        <div className={`w-3 h-3 rounded-full ${status.bgColor} border-2 border-white shadow-sm`} />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>

                        {gestiones.length > 3 && (
                            <div className="px-3 py-2 border-t bg-gray-50 rounded-b-lg">
                                <p className="text-xs text-gray-500 text-center">
                                    {gestiones.length} períodos académicos disponibles
                                </p>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>


        </div>
    )
}