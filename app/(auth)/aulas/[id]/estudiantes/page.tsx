"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Estudiante {
    id: number
    inscripcion_id: number
    nombres: string
    apellido_paterno: string
    apellido_materno: string
    nombre_completo: string
}

export default function AulaEstudiantesPage() {
    const params = useParams()
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])

    useEffect(() => {
        const load = async () => {
            const res = await fetch(`/api/aulas/${params?.id}/estudiantes`)
            if (res.ok) setEstudiantes(await res.json())
        }
        if (params?.id) load()
    }, [params?.id])

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Estudiantes</h1>
                <Button onClick={() => (window.location.href = `/aulas/${params?.id}/estudiantes/import`)}>Importar</Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre completo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {estudiantes.map(e => (
                        <TableRow key={e.id}>
                            <TableCell>{e.nombre_completo || `${e.nombres} ${e.apellido_paterno} ${e.apellido_materno}`}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}