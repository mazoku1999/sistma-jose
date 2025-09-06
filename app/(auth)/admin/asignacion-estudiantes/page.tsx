"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Search, ArrowRight, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader as DialogHeaderUI, DialogTitle as DialogTitleUI } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

type Aula = {
    id: number
    nombre_aula: string
    colegio: string
    nivel: string
    curso: string
    paralelo: string
    materia: string
    max_estudiantes: number
    inscritos: number
}

type Estudiante = { id: number; nombre_completo: string }

export default function AsignacionEstudiantesAdminPage() {
    const { toast } = useToast()
    const searchParams = useSearchParams()

    // Step 1: Aula
    const [searchAula, setSearchAula] = useState("")
    const [aulas, setAulas] = useState<Aula[]>([])
    const [aulasLoading, setAulasLoading] = useState(true)
    const [selectedAula, setSelectedAula] = useState<Aula | null>(null)

    // Step 2: Estudiantes
    const [searchStudent, setSearchStudent] = useState("")
    const [candidatos, setCandidatos] = useState<Estudiante[]>([])
    const [candidatosLoading, setCandidatosLoading] = useState(false)
    const [page, setPage] = useState(1)
    const pageSize = 10
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // Inscritos actuales (para remover)
    const [inscritos, setInscritos] = useState<Estudiante[]>([])
    const [inscritosLoading, setInscritosLoading] = useState(false)
    const [selectedInscritos, setSelectedInscritos] = useState<number[]>([])

    // Crear estudiante rápido
    const [createOpen, setCreateOpen] = useState(false)
    const [nuevoNombres, setNuevoNombres] = useState("")
    const [nuevoApellidos, setNuevoApellidos] = useState("")
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        let active = true
        setAulasLoading(true)
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/aulas/admin?search=${encodeURIComponent(searchAula)}&page=1&size=20`)
                if (!active) return
                if (res.ok) {
                    const data = await res.json()
                    setAulas(data.data)
                }
            } finally {
                if (active) setAulasLoading(false)
            }
        }, 300)
        return () => {
            active = false
            clearTimeout(t)
        }
    }, [searchAula])

    // Preselección si llega ?aulaId=xxx
    useEffect(() => {
        const aulaId = searchParams?.get("aulaId")
        const preselect = async () => {
            if (!aulaId) return
            try {
                const res = await fetch(`/api/aulas/${aulaId}`)
                if (res.ok) {
                    const a = await res.json()
                    const mapped: Aula = {
                        id: a.id,
                        nombre_aula: a.nombre_aula,
                        colegio: a.colegio,
                        nivel: a.nivel,
                        curso: a.curso,
                        paralelo: a.paralelo,
                        materia: a.materia,
                        max_estudiantes: a.max_estudiantes,
                        inscritos: a.estudiantes,
                    }
                    setSelectedAula(mapped)
                }
            } catch { }
        }
        preselect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const cupoDisponible = useMemo(() => {
        if (!selectedAula) return 0
        return Math.max(0, selectedAula.max_estudiantes - selectedAula.inscritos)
    }, [selectedAula])

    const loadCandidatos = async () => {
        if (!selectedAula) return
        setCandidatosLoading(true)
        try {
            const res = await fetch(`/api/aulas/${selectedAula.id}/estudiantes/available?search=${encodeURIComponent(searchStudent)}&page=${page}&size=${pageSize}`)
            if (res.ok) {
                const data = await res.json()
                setCandidatos(data.data)
            }
        } finally {
            setCandidatosLoading(false)
        }
    }

    // Debounce candidate search
    useEffect(() => {
        if (!selectedAula) return
        let active = true
        setCandidatosLoading(true)
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/aulas/${selectedAula.id}/estudiantes/available?search=${encodeURIComponent(searchStudent)}&page=${page}&size=${pageSize}`)
                if (!active) return
                if (res.ok) {
                    const data = await res.json()
                    setCandidatos(data.data)
                }
            } finally {
                if (active) setCandidatosLoading(false)
            }
        }, 300)
        return () => {
            active = false
            clearTimeout(t)
        }
    }, [selectedAula, searchStudent, page])

    const loadInscritos = async () => {
        if (!selectedAula) return
        setInscritosLoading(true)
        try {
            const res = await fetch(`/api/aulas/${selectedAula.id}/estudiantes`)
            if (res.ok) {
                const data = await res.json()
                setInscritos(data.map((e: any) => ({ id: e.id, nombre_completo: e.nombre_completo })))
            }
        } finally {
            setInscritosLoading(false)
        }
    }

    // When aula changes, refresh lists and clear selections
    useEffect(() => {
        if (!selectedAula) return
        setSelectedIds([])
        setSelectedInscritos([])
        setPage(1)
        loadInscritos()
    }, [selectedAula])

    useEffect(() => {
        if (selectedAula) {
            loadCandidatos()
            loadInscritos()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAula, page])

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    const selectPage = () => {
        setSelectedIds((prev) => Array.from(new Set([...prev, ...candidatos.map((c) => c.id)])))
    }

    const clearSelection = () => setSelectedIds([])

    const handleAssign = async () => {
        if (!selectedAula) return
        if (selectedIds.length === 0) return
        if (selectedIds.length > cupoDisponible) {
            toast({ title: "Cupo insuficiente", description: `Disponibles: ${cupoDisponible}`, variant: "destructive" })
            return
        }
        const res = await fetch(`/api/aulas/${selectedAula.id}/estudiantes`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "assign", studentIds: selectedIds }),
        })
        if (res.ok) {
            toast({ title: "Asignación completa" })
            clearSelection()
            // refrescar conteos y listas
            setSelectedAula((prev) => (prev ? { ...prev, inscritos: prev.inscritos + selectedIds.length } : prev))
            loadInscritos()
            loadCandidatos()
        } else {
            const err = await res.json().catch(() => ({}))
            toast({ title: "Error al asignar", description: err.error || "", variant: "destructive" })
        }
    }

    const handleRemove = async (ids: number[]) => {
        if (!selectedAula || ids.length === 0) return
        const res = await fetch(`/api/aulas/${selectedAula.id}/estudiantes`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "remove", studentIds: ids }),
        })
        if (res.ok) {
            toast({ title: "Estudiantes removidos" })
            setInscritos((prev) => prev.filter((e) => !ids.includes(e.id)))
            setSelectedInscritos((prev) => prev.filter((id) => !ids.includes(id)))
            setSelectedAula((prev) => (prev ? { ...prev, inscritos: Math.max(0, prev.inscritos - ids.length) } : prev))
        } else {
            const err = await res.json().catch(() => ({}))
            toast({ title: "Error al remover", description: err.error || "", variant: "destructive" })
        }
    }

    const toggleInscrito = (id: number) => {
        setSelectedInscritos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    const selectAllInscritos = () => {
        setSelectedInscritos(inscritos.map((i) => i.id))
    }

    const clearInscritosSelection = () => setSelectedInscritos([])

    const handleCreateStudent = async () => {
        if (!selectedAula) return
        if (!nuevoNombres.trim() || !nuevoApellidos.trim()) {
            toast({ title: "Completa los campos", variant: "destructive" })
            return
        }
        setCreating(true)
        try {
            const res = await fetch(`/api/aulas/${selectedAula.id}/estudiantes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombres: nuevoNombres.trim(), apellidos: nuevoApellidos.trim() }),
            })
            if (res.ok) {
                const est = await res.json()
                toast({ title: "Estudiante creado y asignado" })
                setInscritos((prev) => [{ id: est.id, nombre_completo: est.nombre_completo }, ...prev])
                setSelectedAula((prev) => (prev ? { ...prev, inscritos: prev.inscritos + 1 } : prev))
                setCreateOpen(false)
                setNuevoNombres("")
                setNuevoApellidos("")
            } else {
                const err = await res.json().catch(() => ({}))
                toast({ title: "Error al crear estudiante", description: err.error || "", variant: "destructive" })
            }
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Asignación de estudiantes</h1>
                    <p className="text-sm text-muted-foreground">Selecciona un aula y asigna estudiantes de forma masiva</p>
                </div>
            </div>

            <Card>
                <CardHeader />
                <CardContent className="space-y-4">
                    <div className="flex gap-3 max-w-xl">
                        <div className="relative w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar aula por nombre" className="pl-8" value={searchAula} onChange={(e) => setSearchAula(e.target.value)} />
                        </div>
                    </div>

                    {aulasLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {aulas.map((a) => (
                                <Card key={a.id} className={`p-4 cursor-pointer ${selectedAula?.id === a.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedAula(a)}>
                                    <div className="font-medium">{a.nombre_aula}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {a.colegio} · {a.nivel} · {a.curso}{a.paralelo}
                                    </div>
                                    <div className="text-xs mt-2">
                                        {a.materia} · Cupo {a.inscritos}/{a.max_estudiantes}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedAula && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Candidatos */}
                    <Card>
                        <CardHeader />
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="relative w-72">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar estudiantes"
                                        className="pl-8"
                                        value={searchStudent}
                                        onChange={(e) => setSearchStudent(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadCandidatos())}
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground">Cupo disponible: {cupoDisponible}</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={selectPage}>
                                    Seleccionar página
                                </Button>
                                <Button variant="ghost" size="sm" onClick={clearSelection}>
                                    Limpiar selección
                                </Button>
                                <Button size="sm" onClick={() => setCreateOpen(true)}>
                                    Nuevo estudiante
                                </Button>
                                <div className="text-xs text-muted-foreground">Seleccionados: {selectedIds.length}</div>
                            </div>

                            {candidatosLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="text-right">Añadir</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {candidatos.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell>{c.nombre_completo}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant={selectedIds.includes(c.id) ? "default" : "outline"} size="sm" onClick={() => toggleSelect(c.id)}>
                                                        {selectedIds.includes(c.id) ? <Check className="h-4 w-4 mr-1" /> : null}
                                                        {selectedIds.includes(c.id) ? "Seleccionado" : "Seleccionar"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            <div className="flex justify-end items-center">
                                <div className="flex items-center gap-2">
                                    <Button onClick={handleAssign} disabled={selectedIds.length === 0}>
                                        Asignar seleccionados
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Inscritos */}
                    <Card>
                        <CardHeader />
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Inscritos</div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{inscritos.length} estudiante(s)</span>
                                    <span>Seleccionados: {selectedInscritos.length}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={selectAllInscritos} disabled={inscritos.length === 0}>Seleccionar todos</Button>
                                <Button variant="ghost" size="sm" onClick={clearInscritosSelection} disabled={selectedInscritos.length === 0}>Limpiar selección</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRemove(selectedInscritos)} disabled={selectedInscritos.length === 0}>
                                    Remover seleccionados
                                </Button>
                            </div>
                            {inscritosLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                    {inscritos.map((e) => (
                                        <div key={e.id} className="flex items-center justify-between rounded border p-2">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={selectedInscritos.includes(e.id)}
                                                    onCheckedChange={() => toggleInscrito(e.id)}
                                                    aria-label={`Seleccionar ${e.nombre_completo}`}
                                                />
                                                <div className="text-sm">{e.nombre_completo}</div>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => handleRemove([e.id])}>
                                                Remover
                                            </Button>
                                        </div>
                                    ))}
                                    {inscritos.length === 0 && (
                                        <div className="text-xs text-muted-foreground">No hay estudiantes inscritos</div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}



            {/* Modal crear estudiante */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeaderUI>
                        <DialogTitleUI>Nuevo estudiante</DialogTitleUI>
                    </DialogHeaderUI>
                    <div className="space-y-3">
                        <div>
                            <Label>Nombres</Label>
                            <Input value={nuevoNombres} onChange={(e) => setNuevoNombres(e.target.value)} />
                        </div>
                        <div>
                            <Label>Apellidos</Label>
                            <Input value={nuevoApellidos} onChange={(e) => setNuevoApellidos(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateStudent} disabled={creating}>
                                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Crear y asignar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
