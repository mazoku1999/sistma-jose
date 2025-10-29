"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, MessageCircle, Phone, Search } from "lucide-react"

interface Aula {
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

interface Estudiante {
    id: number
    nombres: string
    apellido_paterno: string | null
    apellido_materno: string | null
    telefono_apoderado: string | null
    nombre_completo: string
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    if (!res.ok) {
        let msg = "Error inesperado"
        try {
            const err = await res.json()
            msg = err?.error || msg
        } catch (error) {
            // swallow
        }
        throw new Error(msg)
    }
    return res.json()
}

const normalize = (value?: string | null) => (value ?? "").toString().trim()

const formatPhoneDisplay = (value?: string | null) => (value ?? "").replace(/\D/g, "")

const buildWhatsAppLink = (value?: string | null) => {
    if (!value) return null
    let digits = value.replace(/\D/g, "")
    if (!digits) return null

    if (digits.startsWith("00")) {
        digits = digits.slice(2)
    }

    if (digits.startsWith("0")) {
        digits = digits.slice(1)
    }

    if (!digits.startsWith("591")) {
        digits = `591${digits}`
    }

    if (digits.length < 8) {
        return null
    }

    return `https://wa.me/${digits}`
}

export default function ContactoApoderadosDetallePage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const { toast } = useToast()

    const aulaId = params?.id

    const [aula, setAula] = useState<Aula | null>(null)
    const [aulaLoading, setAulaLoading] = useState(true)

    const [inscritos, setInscritos] = useState<Estudiante[]>([])
    const [inscritosLoading, setInscritosLoading] = useState(true)
    const [search, setSearch] = useState("")

    const filteredInscritos = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return inscritos
        return inscritos.filter((est) =>
            est.nombre_completo.toLowerCase().includes(query)
            || normalize(est.nombres).toLowerCase().includes(query)
            || normalize(est.apellido_paterno).toLowerCase().includes(query)
            || normalize(est.apellido_materno).toLowerCase().includes(query)
        )
    }, [inscritos, search])

    const loadAula = useCallback(async () => {
        if (!aulaId) return
        setAulaLoading(true)
        try {
            const data = await fetchJSON<any>(`/api/aulas/${aulaId}`)
            setAula({
                id: data.id,
                nombre_aula: data.nombre_aula,
                colegio: data.colegio,
                nivel: data.nivel,
                curso: data.curso,
                paralelo: data.paralelo,
                materia: data.materia,
                max_estudiantes: data.max_estudiantes,
                inscritos: typeof data.inscritos === "number"
                    ? data.inscritos
                    : Array.isArray(data.estudiantes)
                        ? data.estudiantes.length
                        : data.inscritos ?? 0,
            })
        } catch (error: any) {
            toast({ title: "Aula no encontrada", description: error.message, variant: "destructive" })
            setAula(null)
        } finally {
            setAulaLoading(false)
        }
    }, [aulaId, toast])

    const loadInscritos = useCallback(async () => {
        if (!aulaId) return
        setInscritosLoading(true)
        try {
            const data = await fetchJSON<any[]>(`/api/aulas/${aulaId}/estudiantes`)
            setInscritos(data.map((est) => ({
                id: est.id,
                nombres: normalize(est.nombres),
                apellido_paterno: normalize(est.apellido_paterno) || null,
                apellido_materno: normalize(est.apellido_materno) || null,
                telefono_apoderado: est.telefono_apoderado,
                nombre_completo: normalize(est.nombre_completo || `${est.nombres} ${est.apellido_paterno ?? ""} ${est.apellido_materno ?? ""}`),
            })))
        } catch (error: any) {
            toast({ title: "Error al cargar estudiantes", description: error.message, variant: "destructive" })
            setInscritos([])
        } finally {
            setInscritosLoading(false)
        }
    }, [aulaId, toast])

    useEffect(() => {
        if (!aulaId) {
            toast({ title: "Aula inválida", description: "No se proporcionó un identificador de aula válido", variant: "destructive" })
            router.push("/admin/contacto-apoderados")
            return
        }
        loadAula()
        loadInscritos()
    }, [aulaId, loadAula, loadInscritos, router, toast])

    const volver = () => router.push("/admin/contacto-apoderados")

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={volver}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold">Contacto con apoderados</h1>
                    <span className="text-sm text-muted-foreground">Aula seleccionada</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{aula?.nombre_aula || "Cargando aula..."}</CardTitle>
                    <CardDescription>
                        {aula ? (
                            <span>
                                {aula.colegio} · {aula.nivel} · {aula.curso}{aula.paralelo} · {aula.materia}
                            </span>
                        ) : aulaLoading ? (
                            "Obteniendo información del aula"
                        ) : (
                            "No se encontró información del aula"
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent />
            </Card>

            <Card>
                <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <CardTitle>Estudiantes inscritos</CardTitle>
                        <CardDescription>
                            Contacta rápidamente a los apoderados de esta aula.
                        </CardDescription>
                    </div>
                    <div className="text-xs text-muted-foreground">{filteredInscritos.length} estudiante(s) encontrado(s)</div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombres o apellidos"
                                className="pl-9"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                disabled={inscritosLoading}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>Los números se abren en WhatsApp en una pestaña nueva.</span>
                        </div>
                    </div>

                    {inscritosLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : aula && inscritos.length === 0 ? (
                        <Alert>
                            <AlertTitle>Sin estudiantes</AlertTitle>
                            <AlertDescription>Este aula no tiene estudiantes inscritos actualmente.</AlertDescription>
                        </Alert>
                    ) : filteredInscritos.length === 0 ? (
                        <Alert>
                            <AlertTitle>Sin coincidencias</AlertTitle>
                            <AlertDescription>No encontramos estudiantes que coincidan con la búsqueda.</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Apellido paterno</TableHead>
                                        <TableHead>Apellido materno</TableHead>
                                        <TableHead>Nombres</TableHead>
                                        <TableHead>Teléfono apoderado</TableHead>
                                        <TableHead className="w-32 text-right">Contacto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInscritos.map((est, index) => {
                                        const displayPhone = formatPhoneDisplay(est.telefono_apoderado)
                                        const whatsappLink = buildWhatsAppLink(est.telefono_apoderado)
                                        return (
                                            <TableRow key={est.id}>
                                                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell>{normalize(est.apellido_paterno) || <span className="text-muted-foreground italic">(sin paterno)</span>}</TableCell>
                                                <TableCell>{normalize(est.apellido_materno) || <span className="text-muted-foreground italic">(sin materno)</span>}</TableCell>
                                                <TableCell>{normalize(est.nombres) || <span className="text-muted-foreground italic">(sin nombres)</span>}</TableCell>
                                                <TableCell>
                                                    {displayPhone ? (
                                                        <span className="font-medium">{displayPhone}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">(sin teléfono)</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {whatsappLink ? (
                                                        <Button size="sm" variant="secondary" asChild>
                                                            <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                                                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                                                            </Link>
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="ghost" disabled>
                                                            <MessageCircle className="h-4 w-4 mr-2" /> Sin número
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
