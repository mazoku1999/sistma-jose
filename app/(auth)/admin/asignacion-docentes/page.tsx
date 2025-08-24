"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Search, UserCheck } from "lucide-react"
import AssignAulaWizard from "../profesores/assign-aula-wizard"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

interface Profesor {
    id: number
    nombre_completo: string
    usuario: string
    email: string
    aulas_asignadas?: number
}

export default function AsignacionDocentesPage() {
    const { gestionGlobal } = useGestionGlobal()
    const [profesores, setProfesores] = useState<Profesor[]>([])
    const [filtered, setFiltered] = useState<Profesor[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    const [selectedProfesor, setSelectedProfesor] = useState<Profesor | null>(null)
    const [openWizard, setOpenWizard] = useState(false)

    useEffect(() => {
        const fetchProfesores = async () => {
            setIsLoading(true)
            try {
                const res = await fetch("/api/profesores")
                if (res.ok) {
                    const data = await res.json()
                    setProfesores(data)
                    setFiltered(data)
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

            <Card>
                <CardHeader />
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((p) => (
                                <Card key={p.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{p.nombre_completo}</div>
                                            <div className="text-xs text-muted-foreground">@{p.usuario} · {p.email}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Aulas asignadas: {p.aulas_asignadas || 0}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" asChild>
                                                <a href={`/admin/asignacion-estudiantes`}>
                                                    Gestionar estudiantes
                                                </a>
                                            </Button>
                                            <Button size="sm" onClick={() => handleAssign(p)}>
                                                <UserCheck className="h-4 w-4 mr-1" />
                                                Asignar
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {filtered.length === 0 && (
                                <div className="col-span-full text-center text-sm text-muted-foreground py-10">
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
                    onSuccess={() => setOpenWizard(false)}
                    currentGestionId={gestionGlobal}
                    profesorId={selectedProfesor.id}
                    profesorName={selectedProfesor.nombre_completo}
                />
            )}
        </div>
    )
}


