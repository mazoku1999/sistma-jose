"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, User } from "lucide-react"

interface AddStudentModalProps {
    aulaId: string
    isOpen: boolean
    onClose: () => void
    onStudentAdded: () => void
}

export default function AddStudentModal({ 
    aulaId, 
    isOpen, 
    onClose, 
    onStudentAdded 
}: AddStudentModalProps) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [newStudent, setNewStudent] = useState({
        nombres: "",
        apellidos: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!newStudent.nombres.trim() || !newStudent.apellidos.trim()) {
            toast({
                title: "Campos requeridos",
                description: "Nombres y apellidos son obligatorios",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(`/api/aulas/${aulaId}/estudiantes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nombres: newStudent.nombres.trim(),
                    apellidos: newStudent.apellidos.trim()
                })
            })

            if (response.ok) {
                toast({
                    title: "✅ Estudiante agregado",
                    description: `${newStudent.nombres} ${newStudent.apellidos} fue agregado correctamente`,
                })
                
                // Limpiar formulario
                setNewStudent({ nombres: "", apellidos: "" })
                onClose()
                onStudentAdded()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al agregar estudiante",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al agregar estudiante:", error)
            toast({
                title: "Error",
                description: "Error al agregar estudiante",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        if (!isLoading) {
            setNewStudent({ nombres: "", apellidos: "" })
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Agregar Nuevo Estudiante
                    </DialogTitle>
                    <DialogDescription>
                        Ingresa la información del estudiante que deseas agregar al aula
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombres" className="text-sm font-medium">
                            Nombres *
                        </Label>
                        <Input
                            id="nombres"
                            placeholder="Ej: Juan Carlos"
                            value={newStudent.nombres}
                            onChange={(e) => setNewStudent(prev => ({ ...prev, nombres: e.target.value }))}
                            disabled={isLoading}
                            className="w-full"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="apellidos" className="text-sm font-medium">
                            Apellidos *
                        </Label>
                        <Input
                            id="apellidos"
                            placeholder="Ej: Pérez García"
                            value={newStudent.apellidos}
                            onChange={(e) => setNewStudent(prev => ({ ...prev, apellidos: e.target.value }))}
                            disabled={isLoading}
                            className="w-full"
                        />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700">
                            💡 <strong>Tip:</strong> También puedes importar múltiples estudiantes usando un archivo Excel.
                        </p>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <Button 
                            type="button"
                            variant="outline" 
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit"
                            disabled={isLoading || !newStudent.nombres.trim() || !newStudent.apellidos.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Agregando...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar Estudiante
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}