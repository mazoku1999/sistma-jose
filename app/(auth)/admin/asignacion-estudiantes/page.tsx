"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Search, ArrowRight, Check, ChevronLeft, ChevronRight, Users, Building2, BookOpen, GraduationCap } from "lucide-react"
import { Dialog, DialogContent, DialogHeader as DialogHeaderUI, DialogTitle as DialogTitleUI } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

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
    const [removeIds, setRemoveIds] = useState<number[]>([])

    // Inscritos actuales (para remover)
    const [inscritos, setInscritos] = useState<Estudiante[]>([])
    const [inscritosLoading, setInscritosLoading] = useState(false)

    // Crear estudiante rápido
    const [createOpen, setCreateOpen] = useState(false)
    const [nuevoNombres, setNuevoNombres] = useState("")
    const [nuevoApellidos, setNuevoApellidos] = useState("")
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        const loadAulas = async () => {
            setAulasLoading(true)
            try {
                const res = await fetch(`/api/aulas/admin?search=${encodeURIComponent(searchAula)}&page=1&size=20`)
                if (res.ok) {
                    const data = await res.json()
                    setAulas(data.data)
                }
            } finally {
                setAulasLoading(false)
            }
        }
        loadAulas()
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
            setSelectedAula((prev) => (prev ? { ...prev, inscritos: Math.max(0, prev.inscritos - ids.length) } : prev))
        } else {
            const err = await res.json().catch(() => ({}))
            toast({ title: "Error al remover", description: err.error || "", variant: "destructive" })
        }
    }

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

    // Nuevo: Wizard de 3 pasos de pantalla completa
    const [currentStep, setCurrentStep] = useState<number>(1)

    return (
        <div className="flex flex-col gap-6">
            {/* Header con pasos */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold">Asignación de estudiantes</h1>
                    <p className="text-sm text-muted-foreground">Sigue los pasos para asignar estudiantes a un aula</p>
                </div>
                <div className="flex items-center divide-x rounded-lg border">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`px-4 py-2 text-sm ${currentStep === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Paso {s}</div>
                    ))}
                </div>
            </div>

            {/* Paso 1: Seleccionar aula */}
            {currentStep === 1 && (
                <Card>
                    <CardContent className="space-y-4 pt-4">
                        <div className="relative max-w-xl">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar aula por nombre" className="pl-8" value={searchAula} onChange={(e) => setSearchAula(e.target.value)} />
                        </div>
                        {aulasLoading ? (
                            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {aulas.map((a) => (
                                    <Card key={a.id} className={`p-5 cursor-pointer transition ${selectedAula?.id === a.id ? 'ring-2 ring-primary' : 'hover:shadow'}`} onClick={() => setSelectedAula(a)}>
                                        <div className="text-base font-semibold">{a.nombre_aula}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{a.colegio} · {a.nivel} · {a.curso}{a.paralelo}</div>
                                        <div className="text-xs mt-2">{a.materia} · Cupo {a.inscritos}/{a.max_estudiantes}</div>
                                    </Card>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end">
                            <Button onClick={() => setCurrentStep(2)} disabled={!selectedAula}>Continuar</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Paso 2: Agregar/Remover */}
            {currentStep === 2 && selectedAula && (
                <div className="space-y-4">
                    <Card>
                        <CardContent className="py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
                                <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="truncate">{selectedAula.colegio}</span></div>
                                <div className="flex items-center gap-2 text-sm"><GraduationCap className="h-4 w-4 text-muted-foreground" /><span>{selectedAula.nivel} • {selectedAula.curso}{selectedAula.paralelo}</span></div>
                                <div className="flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4 text-muted-foreground" /><span className="truncate">{selectedAula.materia}</span></div>
                                <div className="text-sm text-right">Cupo: <span className="font-medium">{selectedAula.inscritos}/{selectedAula.max_estudiantes}</span> <span className="text-muted-foreground">(disp. {cupoDisponible})</span></div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <div>
                                    <h3 className="text-lg font-semibold">Candidatos</h3>
                                    <p className="text-sm text-muted-foreground">Selecciona estudiantes para inscribir</p>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div className="relative w-full md:w-96">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Buscar estudiantes" className="pl-8" value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), loadCandidatos())} />
                                    </div>
                                    <div className="text-sm text-muted-foreground">Cupo disp.: {cupoDisponible}</div>
                                </div>

                                {/* Alta rápida inline */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input placeholder="Nombres" value={nuevoNombres} onChange={(e) => setNuevoNombres(e.target.value)} />
                                    <Input placeholder="Apellidos" value={nuevoApellidos} onChange={(e) => setNuevoApellidos(e.target.value)} />
                                    <Button onClick={handleCreateStudent} disabled={creating || !nuevoNombres.trim() || !nuevoApellidos.trim()}>
                                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Agregar
                                    </Button>
                                </div>

                                {candidatosLoading ? (
                                    <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : (
                                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                                        {candidatos.map((c) => (
                                            <div key={c.id} className="flex items-center justify-between rounded border p-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <input type="checkbox" className="h-4 w-4" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                                                    <div className="truncate">{c.nombre_completo}</div>
                                                </div>
                                                <Button size="sm" variant={selectedIds.includes(c.id) ? 'default' : 'outline'} onClick={() => toggleSelect(c.id)}>{selectedIds.includes(c.id) ? 'Seleccionado' : 'Seleccionar'}</Button>
                                            </div>
                                        ))}
                                        {candidatos.length === 0 && <div className="text-sm text-muted-foreground text-center py-10">No hay resultados</div>}
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">Página {page}</div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => { if (page > 1) { setPage(page - 1); loadCandidatos() } }}><ChevronLeft className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="sm" onClick={() => { setPage(page + 1); loadCandidatos() }}><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div>
                                    <h3 className="text-lg font-semibold">Inscritos</h3>
                                    <p className="text-sm text-muted-foreground">Gestiona los estudiantes ya inscritos</p>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {inscritosLoading ? (
                                    <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : (
                                    <>
                                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                                            {inscritos.map((e) => (
                                                <div key={e.id} className="flex items-center justify-between rounded border p-3">
                                                    <div className="flex items-center gap-2">
                                                        <input type="checkbox" className="h-4 w-4" checked={removeIds.includes(e.id)} onChange={(ev) => setRemoveIds(prev => ev.target.checked ? [...prev, e.id] : prev.filter(x => x !== e.id))} />
                                                        <div className="text-sm">{e.nombre_completo}</div>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={() => handleRemove([e.id])}>Remover</Button>
                                                </div>
                                            ))}
                                            {inscritos.length === 0 && <div className="text-sm text-muted-foreground text-center py-10">No hay estudiantes inscritos</div>}
                                        </div>
                                        <div className="flex justify-end"><Button variant="destructive" size="sm" disabled={removeIds.length === 0} onClick={() => { handleRemove(removeIds); setRemoveIds([]) }}>Remover seleccionados ({removeIds.length})</Button></div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={() => setCurrentStep(1)}>Atrás</Button>
                        <Button onClick={() => setCurrentStep(3)} disabled={selectedIds.length === 0}>Continuar</Button>
                    </div>
                </div>
            )}

            {/* Paso 3: Resumen */}
            {currentStep === 3 && selectedAula && (
                <Card>
                    <CardContent className="space-y-6 pt-4">
                        <div>
                            <h3 className="text-lg font-semibold">Resumen de asignación</h3>
                            <p className="text-sm text-muted-foreground">Confirma los estudiantes a asignar</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Aula</div><div className="font-medium">{selectedAula.nombre_aula}</div></CardContent></Card>
                            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Seleccionados</div><div className="font-medium">{selectedIds.length}</div></CardContent></Card>
                        </div>
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => setCurrentStep(2)}>Atrás</Button>
                            <Button onClick={handleAssign} disabled={selectedIds.length === 0 || selectedIds.length > cupoDisponible}>Asignar ahora</Button>
                        </div>
                    </CardContent>
                </Card>
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


