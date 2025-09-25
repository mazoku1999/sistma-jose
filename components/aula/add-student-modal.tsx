"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AddStudentModal({ aulaId, onAdded }: { aulaId: number; onAdded: () => void }) {
    const [newStudent, setNewStudent] = useState<{ nombres: string; apellido_paterno: string; apellido_materno: string }>({ nombres: "", apellido_paterno: "", apellido_materno: "" })
    const [errors, setErrors] = useState<{ nombres?: string; apellido_paterno?: string; apellido_materno?: string }>({})
    const [isLoading, setIsLoading] = useState(false)

    const validate = () => {
        const trimmed = {
            nombres: newStudent.nombres.replace(/\s+/g, " ").trim(),
            apellido_paterno: newStudent.apellido_paterno.replace(/\s+/g, " ").trim(),
            apellido_materno: newStudent.apellido_materno.replace(/\s+/g, " ").trim(),
        }
        const localErrors: { nombres?: string; apellido_paterno?: string; apellido_materno?: string } = {}
        if (!trimmed.nombres) localErrors.nombres = "Ingresa los nombres"
        if (!trimmed.apellido_paterno) localErrors.apellido_paterno = "Ingresa el apellido paterno"
        if (!trimmed.apellido_materno) localErrors.apellido_materno = "Ingresa el apellido materno"
        setErrors(localErrors)
        return { ok: Object.keys(localErrors).length === 0, trimmed }
    }

    const handleAdd = async () => {
        const { ok, trimmed } = validate()
        if (!ok) return
        setIsLoading(true)
        try {
            const res = await fetch(`/api/aulas/${aulaId}/estudiantes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trimmed)
            })
            if (res.ok) {
                setNewStudent({ nombres: "", apellido_paterno: "", apellido_materno: "" })
                onAdded()
            }
        } finally { setIsLoading(false) }
    }

    return (
        <div className="space-y-3">
            <div>
                <Label htmlFor="nombres" className="text-sm font-medium">Nombres *</Label>
                <Input id="nombres" value={newStudent.nombres} onChange={(e) => setNewStudent(prev => ({ ...prev, nombres: e.target.value }))} aria-invalid={!!errors.nombres} />
                {errors.nombres && <p className="text-xs text-red-600">{errors.nombres}</p>}
            </div>
            <div>
                <Label htmlFor="apellido_paterno" className="text-sm font-medium">Apellido paterno *</Label>
                <Input id="apellido_paterno" value={newStudent.apellido_paterno} onChange={(e) => setNewStudent(prev => ({ ...prev, apellido_paterno: e.target.value }))} aria-invalid={!!errors.apellido_paterno} />
                {errors.apellido_paterno && <p className="text-xs text-red-600">{errors.apellido_paterno}</p>}
            </div>
            <div>
                <Label htmlFor="apellido_materno" className="text-sm font-medium">Apellido materno *</Label>
                <Input id="apellido_materno" value={newStudent.apellido_materno} onChange={(e) => setNewStudent(prev => ({ ...prev, apellido_materno: e.target.value }))} aria-invalid={!!errors.apellido_materno} />
                {errors.apellido_materno && <p className="text-xs text-red-600">{errors.apellido_materno}</p>}
            </div>
            <div className="flex justify-end">
                <Button onClick={handleAdd} disabled={isLoading}>Agregar</Button>
            </div>
        </div>
    )
}
