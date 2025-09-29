"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader as DialogHeaderUI, DialogTitle as DialogTitleUI } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Search, ArrowLeft, ArrowRight, Check, Users, UserPlus, Trash2, Upload, X } from "lucide-react"
import * as XLSX from 'xlsx'

/** Types **/
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

type Estudiante = {
    id: number
    nombre_completo: string
    nombres?: string
    apellido_paterno?: string
    apellido_materno?: string
}

/** Utils **/
function useDebounce<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(id)
    }, [value, delay])
    return debounced
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    if (!res.ok) {
        let msg = "Error inesperado"
        try { const err = await res.json(); msg = err?.error || msg } catch { }
        throw new Error(msg)
    }
    return res.json()
}

/** Small UI **/
function CapacityBar({ current, max }: { current: number; max: number }) {
    const pct = Math.min(100, Math.round((current / Math.max(1, max)) * 100))
    return (
        <div className="flex items-center gap-3 w-full">
            <Progress value={pct} className="h-2 w-full" aria-label="Progreso de cupo" />
            <span className="text-xs tabular-nums text-muted-foreground">{current}/{max}</span>
        </div>
    )
}

function AulaCard({ aula, onSelect }: { aula: Aula; onSelect: (a: Aula) => void }) {
    return (
        <Card role="button" onClick={() => onSelect(aula)} className="p-4 transition hover:shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="font-medium truncate" title={aula.nombre_aula}>{aula.nombre_aula}</div>
                    <div className="text-xs text-muted-foreground truncate" title={`${aula.colegio} · ${aula.nivel} · ${aula.curso}${aula.paralelo}`}>
                        {aula.colegio} · {aula.nivel} · {aula.curso}{aula.paralelo}
                    </div>
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{aula.materia}</Badge>
                        <Badge variant="outline" className="text-[10px] flex items-center gap-1"><Users className="h-3 w-3" /> {aula.inscritos}/{aula.max_estudiantes}</Badge>
                    </div>
                </div>
            </div>
        </Card>
    )
}

/** Pantalla 1: Aulas a pantalla completa **/
function AulasScreen({
    aulas,
    loading,
    search,
    onSearch,
    onSelect,
}: {
    aulas: Aula[]
    loading: boolean
    search: string
    onSearch: (v: string) => void
    onSelect: (a: Aula) => void
}) {
    return (
        <div className="min-h-[100dvh] flex flex-col">
            <div className="container mx-auto p-4 w-full">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Selecciona un aula</h1>
                        <p className="text-sm text-muted-foreground">Paso 1 de 2 · Elige el aula para gestionar asignaciones</p>
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar aula por nombre" className="pl-8" value={search} onChange={(e) => onSearch(e.target.value)} aria-label="Buscar aula" />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 9 }).map((_, i) => (<Skeleton key={i} className="h-24" />))}
                    </div>
                ) : aulas.length === 0 ? (
                    <Card><CardContent className="py-10 text-center text-muted-foreground">No se encontraron aulas</CardContent></Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {aulas.map((a) => (<AulaCard key={a.id} aula={a} onSelect={onSelect} />))}
                    </div>
                )}
            </div>
        </div>
    )
}

/** Pantalla 2: Asignar a pantalla completa con Tabs **/
function AssignScreen({
    aula,
    onBack,
    searchStudent,
    setSearchStudent,
    candidatos,
    candidatosLoading,
    selectedIds,
    toggleSelect,
    selectPage,
    clearSelection,
    handleAssign,
    cupoDisponible,
    page,
    setPage,
    inscritos,
    inscritosLoading,
    selectedInscritos,
    toggleInscrito,
    selectAllInscritos,
    clearInscritosSelection,
    handleRemove,
    onOpenCreate,
    onImportClick,
    importingExcel,
}: any) {
    const [inscritosFilter, setInscritosFilter] = useState("")
    const filteredInscritos = useMemo(() =>
        inscritos.filter((e: Estudiante) => e.nombre_completo.toLowerCase().includes(inscritosFilter.toLowerCase())),
        [inscritos, inscritosFilter]
    )
    return (
        <div className="min-h-[100dvh] flex flex-col">
            <div className="container mx-auto p-4 w-full space-y-4">
                {/* Top bar */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
                    <div className="ml-1">
                        <div className="font-medium">{aula.nombre_aula}</div>
                        <div className="text-xs text-muted-foreground">{aula.colegio} · {aula.nivel} · {aula.curso}{aula.paralelo} · {aula.materia}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-3 w-full sm:w-auto">
                        <CapacityBar current={aula.inscritos} max={aula.max_estudiantes} />
                        <Badge variant="outline" className="text-[10px]">Cupo disponible: {Math.max(0, aula.max_estudiantes - aula.inscritos)}</Badge>
                    </div>
                </div>

                {/* Toolbar y lista de inscritos */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar inscritos" className="pl-8" value={inscritosFilter} onChange={(e) => setInscritosFilter(e.target.value)} aria-label="Buscar inscritos" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={onImportClick} disabled={importingExcel}>
                            <Upload className="h-4 w-4 mr-1" /> {importingExcel ? 'Importando...' : 'Importar Excel'}
                        </Button>
                        <Button size="sm" onClick={onOpenCreate}><UserPlus className="h-4 w-4 mr-1" /> Nuevo</Button>
                    </div>
                </div>

                <Card className="mt-4">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Estudiantes inscritos</CardTitle>
                            <CardDescription>Gestiona los estudiantes de esta aula</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">Total: {filteredInscritos.length}</Badge>
                            <Badge variant="secondary" className="text-[10px]">Cupo: {aula.inscritos}/{aula.max_estudiantes}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <InscritosPanel inscritos={filteredInscritos} loading={inscritosLoading} selectedInscritos={selectedInscritos} toggleInscrito={toggleInscrito} selectAllInscritos={selectAllInscritos} clearInscritosSelection={clearInscritosSelection} handleRemove={handleRemove} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function InscritosPanel({ inscritos, loading, selectedInscritos, toggleInscrito, selectAllInscritos, clearInscritosSelection, handleRemove }: any) {
    const [confirmOpen, setConfirmOpen] = useState(false)

    const normalizeValue = (value: string | undefined | null) => (value ?? '').toString().trim()

    const deriveNames = (est: Estudiante | any) => {
        const nombres = normalizeValue(est.nombres)
        const apellido_paterno = normalizeValue(est.apellido_paterno)
        const apellido_materno = normalizeValue(est.apellido_materno)

        if (nombres || apellido_paterno || apellido_materno) {
            return { nombres, apellido_paterno, apellido_materno }
        }

        const nombreCompleto = normalizeValue(est.nombre_completo)
        const parts = nombreCompleto.split(/\s+/).filter(Boolean)

        if (parts.length >= 3) {
            return {
                nombres: parts.slice(0, parts.length - 2).join(' '),
                apellido_paterno: parts[parts.length - 2] || '',
                apellido_materno: parts[parts.length - 1] || '',
            }
        }

        if (parts.length === 2) {
            return {
                nombres: parts[0],
                apellido_paterno: '',
                apellido_materno: parts[1],
            }
        }

        if (parts.length === 1) {
            return {
                nombres: nombreCompleto,
                apellido_paterno: '',
                apellido_materno: '',
            }
        }

        return {
            nombres: '',
            apellido_paterno: '',
            apellido_materno: '',
        }
    }

    const compareFields = (fields: Array<'apellido_paterno' | 'apellido_materno' | 'nombres'>) => (a: any, b: any) => {
        for (const field of fields) {
            const va = normalizeValue(a[field]).toLocaleLowerCase()
            const vb = normalizeValue(b[field]).toLocaleLowerCase()
            const cmp = va.localeCompare(vb, 'es', { sensitivity: 'base' })
            if (cmp !== 0) return cmp
        }
        return 0
    }

    const sortRows = (rows: Estudiante[]) => {
        const mapped = rows.map((row) => ({ id: row.id, ...deriveNames(row) }))
        const soloMaterno = mapped.filter(r => !r.apellido_paterno)
        const conPaterno = mapped.filter(r => r.apellido_paterno)

        soloMaterno.sort(compareFields(['apellido_materno', 'nombres']))
        conPaterno.sort(compareFields(['apellido_paterno', 'apellido_materno', 'nombres']))

        return [...soloMaterno, ...conPaterno]
    }

    const sortedRows = sortRows(inscritos)

    return (
        <>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAllInscritos} disabled={sortedRows.length === 0}>Seleccionar todos</Button>
                <Button variant="ghost" size="sm" onClick={clearInscritosSelection} disabled={selectedInscritos.length === 0}>Limpiar selección</Button>
                <Badge variant="secondary" className="text-[10px]">Seleccionados: {selectedInscritos.length}</Badge>
                <div className="ml-auto">
                    <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={selectedInscritos.length === 0}><Trash2 className="h-4 w-4 mr-1" /> Remover seleccionados</Button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2 mt-2">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</div>
            ) : sortedRows.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-2">No hay estudiantes inscritos</div>
            ) : (
                <div className="rounded-md border mt-3">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Apellido paterno</TableHead>
                                <TableHead>Apellido materno</TableHead>
                                <TableHead>Nombres</TableHead>
                                <TableHead className="w-32 text-center">Seleccionar</TableHead>
                                <TableHead className="w-24" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedRows.map((row: any, index: number) => (
                                <TableRow key={row.id}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>{row.apellido_paterno || <span className="text-muted-foreground italic">(sin paterno)</span>}</TableCell>
                                    <TableCell>{row.apellido_materno}</TableCell>
                                    <TableCell>{row.nombres}</TableCell>
                                    <TableCell className="text-center">
                                        <Checkbox checked={selectedInscritos.includes(row.id)} onCheckedChange={() => toggleInscrito(row.id)} aria-label={`Seleccionar ${row.nombres}`} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleRemove([row.id])}>Remover</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Remover estudiantes seleccionados?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción los quitará del aula. Podrás volver a asignarlos luego.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { handleRemove(selectedInscritos); setConfirmOpen(false) }}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

/** Page **/
export default function AsignacionEstudiantesAdminPage() {
    const { toast } = useToast()
    const searchParams = useSearchParams()

    // Aulas
    const [searchAula, setSearchAula] = useState("")
    const debouncedAula = useDebounce(searchAula)
    const [aulas, setAulas] = useState<Aula[]>([])
    const [aulasLoading, setAulasLoading] = useState(true)
    const [selectedAula, setSelectedAula] = useState<Aula | null>(null)

    // Candidates
    const [searchStudent, setSearchStudent] = useState("")
    const debouncedStudent = useDebounce(searchStudent)
    const [candidatos, setCandidatos] = useState<Estudiante[]>([])
    const [candidatosLoading, setCandidatosLoading] = useState(false)
    const [page, setPage] = useState(1)
    const pageSize = 10
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // Enrolled
    const [inscritos, setInscritos] = useState<Estudiante[]>([])
    const [inscritosLoading, setInscritosLoading] = useState(false)
    const [selectedInscritos, setSelectedInscritos] = useState<number[]>([])

    // Create student
    const [createOpen, setCreateOpen] = useState(false)
    const [nuevoNombres, setNuevoNombres] = useState("")
    const [nuevoApellidos, setNuevoApellidos] = useState("")
    const [creating, setCreating] = useState(false)

    // Derived
    const cupoDisponible = useMemo(() => {
        if (!selectedAula) return 0
        return Math.max(0, selectedAula.max_estudiantes - selectedAula.inscritos)
    }, [selectedAula])

    /** Loaders **/
    const loadAulas = useCallback(async () => {
        setAulasLoading(true)
        try {
            const data = await fetchJSON<{ data: Aula[] }>(`/api/aulas/admin?search=${encodeURIComponent(debouncedAula)}&page=1&size=24`)
            const mapped = data.data.map((a: any) => ({
                ...a,
                inscritos: typeof a.inscritos === "number" ? a.inscritos : Array.isArray(a.estudiantes) ? a.estudiantes.length : (a.estudiantes ?? 0),
            })) as Aula[]
            setAulas(mapped)
        } catch (e: any) {
            toast({ title: "Error al cargar aulas", description: e.message, variant: "destructive" })
            setAulas([])
        } finally { setAulasLoading(false) }
    }, [debouncedAula, toast])

    const loadCandidatos = useCallback(async () => {
        if (!selectedAula) return
        setCandidatosLoading(true)
        try {
            const data = await fetchJSON<{ data: Estudiante[] }>(`/api/aulas/${selectedAula.id}/estudiantes/available?search=${encodeURIComponent(debouncedStudent)}&page=${page}&size=${pageSize}`)
            setCandidatos(data.data)
        } catch (e: any) {
            toast({ title: "Error al cargar candidatos", description: e.message, variant: "destructive" })
            setCandidatos([])
        } finally { setCandidatosLoading(false) }
    }, [selectedAula, debouncedStudent, page, toast])

    const loadInscritos = useCallback(async () => {
        if (!selectedAula) return
        setInscritosLoading(true)
        try {
            const data = await fetchJSON<any[]>(`/api/aulas/${selectedAula.id}/estudiantes`)
            setInscritos(data.map((e: any) => ({
                id: e.id,
                nombre_completo: e.nombre_completo,
                nombres: e.nombres,
                apellido_paterno: e.apellido_paterno,
                apellido_materno: e.apellido_materno,
            })) as Estudiante[])
        } catch (e: any) {
            toast({ title: "Error al cargar inscritos", description: e.message, variant: "destructive" })
            setInscritos([])
        } finally { setInscritosLoading(false) }
    }, [selectedAula, toast])

    /** Effects **/
    useEffect(() => { loadAulas() }, [loadAulas])

    // Preselección por query
    useEffect(() => {
        const aulaId = searchParams?.get("aulaId")
        if (!aulaId) return
            ; (async () => {
                try {
                    const a = await fetchJSON<any>(`/api/aulas/${aulaId}`)
                    const mapped: Aula = {
                        id: a.id,
                        nombre_aula: a.nombre_aula,
                        colegio: a.colegio,
                        nivel: a.nivel,
                        curso: a.curso,
                        paralelo: a.paralelo,
                        materia: a.materia,
                        max_estudiantes: a.max_estudiantes,
                        inscritos: typeof a.inscritos === "number" ? a.inscritos : Array.isArray(a.estudiantes) ? a.estudiantes.length : (a.estudiantes ?? 0),
                    }
                    setSelectedAula(mapped)
                } catch (e: any) {
                    toast({ title: "No se pudo preseleccionar el aula", description: e.message, variant: "destructive" })
                }
            })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Cuando cambia el aula
    useEffect(() => {
        if (!selectedAula) return
        setSelectedIds([])
        setSelectedInscritos([])
        setPage(1)
        loadCandidatos()
        loadInscritos()
    }, [selectedAula])

    // Buscar candidatos con debounce y paginación
    useEffect(() => { if (selectedAula) loadCandidatos() }, [debouncedStudent, page, selectedAula, loadCandidatos])

    /** Selection handlers **/
    const toggleSelect = (id: number) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    const selectPage = () => setSelectedIds((prev) => Array.from(new Set([...prev, ...candidatos.map((c) => c.id)])))
    const clearSelection = () => setSelectedIds([])

    const toggleInscrito = (id: number) => setSelectedInscritos((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    const selectAllInscritos = () => setSelectedInscritos(inscritos.map((i) => i.id))
    const clearInscritosSelection = () => setSelectedInscritos([])

    /** Actions **/
    const handleAssign = async () => {
        if (!selectedAula || selectedIds.length === 0) return
        const cupoDisponible = Math.max(0, selectedAula.max_estudiantes - selectedAula.inscritos)
        if (selectedIds.length > cupoDisponible) {
            toast({ title: "Cupo insuficiente", description: `Disponibles: ${cupoDisponible}`, variant: "destructive" })
            return
        }
        try {
            await fetchJSON(`/api/aulas/${selectedAula.id}/estudiantes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", studentIds: selectedIds }) })
            toast({ title: "Asignación completa" })
            setSelectedAula((prev) => (prev ? { ...prev, inscritos: prev.inscritos + selectedIds.length } : prev))
            setSelectedIds([])
            loadInscritos(); loadCandidatos()
        } catch (e: any) {
            toast({ title: "Error al asignar", description: e.message, variant: "destructive" })
        }
    }

    const handleRemove = async (ids: number[]) => {
        if (!selectedAula || ids.length === 0) return
        try {
            await fetchJSON(`/api/aulas/${selectedAula.id}/estudiantes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", studentIds: ids }) })
            toast({ title: "Estudiantes removidos" })
            setInscritos((prev) => prev.filter((e) => !ids.includes(e.id)))
            setSelectedInscritos((prev) => prev.filter((id) => !ids.includes(id)))
            setSelectedAula((prev) => (prev ? { ...prev, inscritos: Math.max(0, prev.inscritos - ids.length) } : prev))
        } catch (e: any) {
            toast({ title: "Error al remover", description: e.message, variant: "destructive" })
        }
    }

    const handleCreateStudent = async () => {
        if (!selectedAula) return
        if (!nuevoNombres.trim() || !nuevoApellidos.trim()) { toast({ title: "Completa los campos", variant: "destructive" }); return }
        setCreating(true)
        try {
            const est = await fetchJSON<{ id: number; nombre_completo: string; nombres?: string; apellido_paterno?: string; apellido_materno?: string }>(`/api/aulas/${selectedAula.id}/estudiantes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombres: nuevoNombres.trim(), apellidos: nuevoApellidos.trim() }) })
            toast({ title: "Estudiante creado y asignado" })
            setInscritos((prev) => [{
                id: est.id,
                nombre_completo: est.nombre_completo,
                nombres: est.nombres ?? nuevoNombres.trim(),
                apellido_paterno: est.apellido_paterno ?? '',
                apellido_materno: est.apellido_materno ?? nuevoApellidos.trim(),
            }, ...prev])
            setSelectedAula((prev) => (prev ? { ...prev, inscritos: prev.inscritos + 1 } : prev))
            setCreateOpen(false); setNuevoNombres(""); setNuevoApellidos("")
        } catch (e: any) {
            toast({ title: "Error al crear estudiante", description: e.message, variant: "destructive" })
        } finally { setCreating(false) }
    }

    // Importar estudiantes desde Excel
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [importingExcel, setImportingExcel] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    type ImportRow = {
        Nombres: string
        ApellidoPaterno?: string
        ApellidoMaterno?: string
        Apellidos?: string
    }

    const [importRows, setImportRows] = useState<ImportRow[]>([])
    const [importFilter, setImportFilter] = useState("")

    const onImportClick = () => fileInputRef.current?.click()

    const handleExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !selectedAula) return
        try {
            setImportingExcel(true)
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(new Uint8Array(data), { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]

            // Leer columnas fijas: C (paterno), D (materno), E (nombres) a partir de fila 12
            const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })
            const startRow = 11
            const colPaterno = 2
            const colMaterno = 3
            const colNombres = 4

            const out: ImportRow[] = []
            for (let i = startRow; i < rows.length; i++) {
                const r = rows[i] as any[]
                if (!Array.isArray(r)) continue

                const apellidoPaterno = (r[colPaterno] || '').toString().trim()
                const apellidoMaterno = (r[colMaterno] || '').toString().trim()
                const nombres = (r[colNombres] || '').toString().trim()

                if (!apellidoPaterno && !apellidoMaterno && !nombres) continue
                out.push({ Nombres: nombres, ApellidoPaterno: apellidoPaterno, ApellidoMaterno: apellidoMaterno })
            }

            if (out.length === 0) {
                toast({ title: 'Sin datos válidos', description: 'No se encontraron estudiantes en el Excel', variant: 'destructive' })
                return
            }
            // Abrir modal de vista previa
            setImportRows(out)
            setImportFilter("")
            setImportOpen(true)
            toast({ title: 'Archivo cargado', description: `${out.length} estudiantes detectados` })
        } catch (err: any) {
            toast({ title: 'Error al leer Excel', description: err.message || 'Archivo inválido', variant: 'destructive' })
        } finally {
            setImportingExcel(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const normalizeValue = (value: string | undefined | null) => (value ?? '').toString().trim()
    const apellidoPaterno = (row: ImportRow) => normalizeValue(row.ApellidoPaterno)
    const apellidoMaterno = (row: ImportRow) => normalizeValue(row.ApellidoMaterno)

    const filteredImportRows = importRows.filter(r =>
        `${apellidoPaterno(r)} ${apellidoMaterno(r)} ${normalizeValue(r.Nombres)}`.toLowerCase().includes(importFilter.toLowerCase())
    )

    const compareBy = (fields: Array<'ApellidoPaterno' | 'ApellidoMaterno' | 'Nombres'>) => (a: ImportRow, b: ImportRow) => {
        for (const field of fields) {
            const va = normalizeValue(a[field]).toLocaleLowerCase()
            const vb = normalizeValue(b[field]).toLocaleLowerCase()
            const cmp = va.localeCompare(vb, 'es', { sensitivity: 'base' })
            if (cmp !== 0) return cmp
        }
        return 0
    }

    const soloMaterno = filteredImportRows.filter(r => !apellidoPaterno(r))
    const conPaterno = filteredImportRows.filter(r => apellidoPaterno(r))

    soloMaterno.sort(compareBy(['ApellidoMaterno', 'Nombres']))
    conPaterno.sort(compareBy(['ApellidoPaterno', 'ApellidoMaterno', 'Nombres']))

    const sortedFilteredRows = [...soloMaterno, ...conPaterno]

    const removeImportRow = (index: number) => {
        setImportRows(prev => prev.filter((_, i) => i !== index))
    }

    const handleConfirmImport = async () => {
        if (!selectedAula) return
        if (willImportCount === 0) { toast({ title: 'Nada para importar', description: 'Revisa duplicados o cupo', variant: 'destructive' }); return }
        // Construir filas válidas y con cupo
        const rowsToSend = validCandidates.slice(0, willImportCount).map(r => ({
            ApellidoPaterno: apellidoPaterno(r),
            ApellidoMaterno: apellidoMaterno(r),
            Nombres: r.Nombres
        }))
        try {
            setImportingExcel(true)
            const res = await fetch(`/api/aulas/${selectedAula.id}/estudiantes/import`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estudiantes: rowsToSend })
            })
            if (res.ok) {
                const r = await res.json()
                const extras = r?.skippedByCapacity ? `, sin cupo: ${r.skippedByCapacity}` : ''
                const created = r?.createdNewStudents ? `, nuevos: ${r.createdNewStudents}` : ''
                const reused = r?.reusedExistingStudents ? `, existentes: ${r.reusedExistingStudents}` : ''
                toast({ title: 'Importación completa', description: `${r.imported ?? 0} importados${extras}${created}${reused}` })
                setImportOpen(false); setImportRows([]); setImportFilter("")
                // refrescar listas
                loadInscritos(); loadCandidatos()
                setSelectedAula((prev) => prev ? { ...prev, inscritos: prev.inscritos + (r.imported || 0) } : prev)
            } else {
                const err = await res.json().catch(() => ({}))
                toast({ title: 'Error al importar', description: err.error || '', variant: 'destructive' })
            }
        } finally {
            setImportingExcel(false)
        }
    }

    // Estadísticas de previsualización: duplicados y cupo
    const normalize = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, ' ')
    const fullName = (r: ImportRow) => normalize(`${apellidoPaterno(r)} ${apellidoMaterno(r)} ${r.Nombres}`)
    const existingSet = new Set(inscritos.map(e => normalize(e.nombre_completo)))
    const countsMap = importRows.reduce<Record<string, number>>((acc, r) => {
        const k = fullName(r); acc[k] = (acc[k] || 0) + 1; return acc
    }, {})
    const dupInFileSet = new Set(Object.entries(countsMap).filter(([, c]) => c > 1).map(([k]) => k))
    const validCandidates = importRows.filter(r => !existingSet.has(fullName(r)) && !dupInFileSet.has(fullName(r)))
    const capacityAvailable = selectedAula ? Math.max(0, selectedAula.max_estudiantes - selectedAula.inscritos) : 0
    const willImportCount = Math.min(capacityAvailable, validCandidates.length)
    const willImportSet = new Set(validCandidates.slice(0, willImportCount).map(fullName))
    const dupAulaCount = importRows.filter(r => existingSet.has(fullName(r))).length
    const dupFileCount = importRows.filter(r => dupInFileSet.has(fullName(r))).length
    const exceedCapacity = Math.max(0, validCandidates.length - willImportCount)

    /** Render **/
    return (
        <>
            {!selectedAula ? (
                <AulasScreen aulas={aulas} loading={aulasLoading} search={searchAula} onSearch={setSearchAula} onSelect={setSelectedAula} />
            ) : (
                <AssignScreen
                    aula={selectedAula}
                    onBack={() => setSelectedAula(null)}
                    searchStudent={searchStudent}
                    setSearchStudent={setSearchStudent}
                    candidatos={candidatos}
                    candidatosLoading={candidatosLoading}
                    selectedIds={selectedIds}
                    toggleSelect={toggleSelect}
                    selectPage={selectPage}
                    clearSelection={clearSelection}
                    handleAssign={handleAssign}
                    cupoDisponible={cupoDisponible}
                    page={page}
                    setPage={setPage}
                    inscritos={inscritos}
                    inscritosLoading={inscritosLoading}
                    selectedInscritos={selectedInscritos}
                    toggleInscrito={toggleInscrito}
                    selectAllInscritos={selectAllInscritos}
                    clearInscritosSelection={clearInscritosSelection}
                    handleRemove={handleRemove}
                    onOpenCreate={() => setCreateOpen(true)}
                    onImportClick={onImportClick}
                    importingExcel={importingExcel}
                />
            )}

            {/* Input oculto para Excel */}
            {selectedAula && (
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFile} style={{ display: 'none' }} />
            )}

            {/* Dialogo: crear estudiante */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeaderUI><DialogTitleUI>Nuevo estudiante</DialogTitleUI></DialogHeaderUI>
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="nombres">Nombres</Label>
                            <Input id="nombres" value={nuevoNombres} onChange={(e) => setNuevoNombres(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="apellidos">Apellidos</Label>
                            <Input id="apellidos" value={nuevoApellidos} onChange={(e) => setNuevoApellidos(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateStudent} disabled={creating}>{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Crear y asignar</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de vista previa de importación */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeaderUI>
                        <DialogTitleUI>Confirmar importación de estudiantes</DialogTitleUI>
                    </DialogHeaderUI>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-sm text-muted-foreground">Aula: <span className="font-medium">{selectedAula?.nombre_aula}</span></div>
                            <div className="flex items-center gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input value={importFilter} onChange={(e) => setImportFilter(e.target.value)} placeholder="Buscar en la vista previa" className="pl-8" />
                                </div>
                                <Badge variant="secondary" className="text-[10px]">Filas: {filteredImportRows.length}/{importRows.length}</Badge>
                            </div>
                        </div>

                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-base">Estudiantes detectados</CardTitle>
                                <CardDescription>Revisa, quita filas innecesarias y confirma</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {importRows.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No hay filas para importar</div>
                                ) : (
                                    <div className="border rounded-md">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border-b bg-muted/30 text-sm">
                                            <div>Cupo disponible: <span className="font-medium">{capacityAvailable}</span></div>
                                            <div>Ya inscritos en archivo: <span className="font-medium text-amber-700">{dupAulaCount}</span></div>
                                            <div>Duplicados en archivo: <span className="font-medium text-amber-700">{dupFileCount}</span></div>
                                            <div>Listos para importar: <span className="font-medium text-green-700">{willImportCount}</span>{exceedCapacity > 0 && <span className="ml-2 text-xs text-muted-foreground">(excedentes: {exceedCapacity})</span>}</div>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">#</TableHead>
                                                    <TableHead>Apellido paterno</TableHead>
                                                    <TableHead>Apellido materno</TableHead>
                                                    <TableHead>Nombres</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead className="w-28 text-right">Quitar</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedFilteredRows.map((row, idx) => {
                                                    // Obtener índice real en importRows
                                                    const realIndex = importRows.findIndex(r => r === row) !== -1 ? importRows.findIndex(r => r === row) : idx
                                                    const nameKey = fullName(row)
                                                    const status = existingSet.has(nameKey)
                                                        ? 'inscrito'
                                                        : dupInFileSet.has(nameKey)
                                                            ? 'duplicado'
                                                            : willImportSet.has(nameKey)
                                                                ? 'ok'
                                                                : 'sin_cupo'
                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                                            <TableCell className="font-medium">{apellidoPaterno(row) || <span className="text-muted-foreground italic">(sin paterno)</span>}</TableCell>
                                                            <TableCell className="font-medium">{apellidoMaterno(row)}</TableCell>
                                                            <TableCell className="font-medium">{row.Nombres}</TableCell>
                                                            <TableCell>
                                                                {status === 'ok' && <Badge className="bg-green-100 text-green-700 border-green-200">Listo</Badge>}
                                                                {status === 'inscrito' && <Badge className="bg-red-100 text-red-700 border-red-200">Ya inscrito</Badge>}
                                                                {status === 'duplicado' && <Badge className="bg-amber-100 text-amber-800 border-amber-200">Duplicado</Badge>}
                                                                {status === 'sin_cupo' && <Badge variant="outline">Sin cupo</Badge>}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="sm" onClick={() => removeImportRow(realIndex)}>
                                                                    <X className="h-4 w-4 mr-1" /> Quitar
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                        <div className="max-h-[45vh] overflow-y-auto" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importingExcel}>Cancelar</Button>
                            <Button onClick={handleConfirmImport} disabled={importingExcel || willImportCount === 0} title={willImportCount === 0 ? 'Nada para importar' : undefined}>
                                {importingExcel && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Importar {willImportCount} estudiante(s)
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
