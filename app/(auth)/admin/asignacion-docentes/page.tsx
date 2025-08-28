"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Search, UserCheck, Mail, Users, School } from "lucide-react"
import AssignAulaWizard from "../profesores/assign-aula-wizard"
import { useGestionGlobal } from "@/hooks/use-gestion-global"

interface Profesor {
    id: number
    nombre_completo: string
    usuario: string
    email: string
    telefono?: string
    aulas_activas?: number
}

export default function AsignacionDocentesPage() {
    const { gestionGlobal } = useGestionGlobal()
    const [profesores, setProfesores] = useState<Profesor[]>([])
    const [filtered, setFiltered] = useState<Profesor[]>([])
    const [search, setSearch] = useState("")
    const [view, setView] = useState<'all' | 'with' | 'without'>("all")
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
                    const normalized = (Array.isArray(data) ? data : []).map((p: any) => ({
                        id: p.id,
                        nombre_completo: p.nombre_completo,
                        usuario: p.usuario,
                        email: p.email,
                        telefono: p.telefono,
                        aulas_activas: p.aulas_activas || 0,
                    }))
                    setProfesores(normalized)
                    setFiltered(normalized)
                } else {
                    setProfesores([])
                    setFiltered([])
                }
            } catch {
                setProfesores([])
                setFiltered([])
            } finally {
                setIsLoading(false)
            }
        }
        fetchProfesores()
    }, [])

    useEffect(() => {
        const q = search.toLowerCase()
        const base = profesores.filter((p) =>
            p.nombre_completo.toLowerCase().includes(q) ||
            p.usuario.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q),
        )

        let filteredByTab = base
        if (view === 'with') filteredByTab = base.filter(p => (p.aulas_activas || 0) > 0)
        if (view === 'without') filteredByTab = base.filter(p => (p.aulas_activas || 0) === 0)
        setFiltered(filteredByTab)
    }, [search, profesores, view])

    const handleAssign = (p: Profesor) => {
        setSelectedProfesor(p)
        setOpenWizard(true)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Asignación de docentes</h1>
                <p className="text-muted-foreground">Encuentra un profesor y asígnale un aula en la gestión actual.</p>
            </div>

            <Card>
                <CardHeader className="pb-0" />
                <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, usuario o email"
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">{filtered.length} resultado(s)</div>
                    </div>

                    <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                        <TabsList>
                            <TabsTrigger value="all">Todos</TabsTrigger>
                            <TabsTrigger value="with">Con aulas</TabsTrigger>
                            <TabsTrigger value="without">Sin aulas</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="mt-4">
                            {isLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="animate-pulse rounded-lg border p-4">
                                            <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                                            <div className="h-3 bg-muted rounded w-1/4" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filtered.map((p) => (
                                        <div key={p.id} className={`rounded-lg border p-4 hover:shadow-sm transition ${(p.aulas_activas || 0) > 0 ? 'border-green-200 bg-green-50/40' : ''}`}>
                                            <div className="flex items-start gap-3">
                                                <Avatar>
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {p.nombre_completo.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="font-semibold leading-tight truncate">{p.nombre_completo}</div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 overflow-hidden">
                                                                <span className="shrink-0">@{p.usuario}</span>
                                                                <span className="shrink-0">•</span>
                                                                <span className="inline-flex items-center gap-1 min-w-0">
                                                                    <Mail className="h-3 w-3" />
                                                                    <span className="truncate">{p.email}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Badge variant={(p.aulas_activas || 0) > 0 ? 'default' : 'outline'} className={(p.aulas_activas || 0) > 0 ? 'bg-green-100 text-green-800' : ''}>
                                                                <Users className="h-3 w-3 mr-1" /> {(p.aulas_activas || 0)} aula(s)
                                                            </Badge>
                                                            <Button size="sm" variant="outline" asChild className="whitespace-nowrap">
                                                                <a href={`/admin/asignacion-estudiantes`}><School className="h-4 w-4 mr-1" /> Estudiantes</a>
                                                            </Button>
                                                            <Button size="sm" onClick={() => handleAssign(p)} className="whitespace-nowrap">
                                                                <UserCheck className="h-4 w-4 mr-1" /> Asignar aula
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filtered.length === 0 && (
                                        <div className="text-center py-14 border rounded-lg">
                                            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                <Search className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">No se encontraron usuarios con la búsqueda.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Usamos el mismo listado, el filtro lo aplica 'view' en el efecto */}
                        <TabsContent value="with" className="mt-4" />
                        <TabsContent value="without" className="mt-4" />
                    </Tabs>
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


