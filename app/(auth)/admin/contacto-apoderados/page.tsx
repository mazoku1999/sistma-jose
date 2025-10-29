"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowRight, Search } from "lucide-react"

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

export default function ContactoApoderadosPage() {
    const { toast } = useToast()
    const [searchAula, setSearchAula] = useState("")
    const [aulasLoading, setAulasLoading] = useState(true)
    const [aulas, setAulas] = useState<Aula[]>([])

    const filteredAulas = useMemo(() => {
        const query = searchAula.trim().toLowerCase()
        if (!query) return aulas
        return aulas.filter((aula) =>
            [
                aula.nombre_aula,
                aula.colegio,
                aula.materia,
                `${aula.curso}${aula.paralelo}`,
            ]
                .map((field) => field.toLowerCase())
                .some((field) => field.includes(query))
        )
    }, [aulas, searchAula])

    const loadAulas = useCallback(async () => {
        setAulasLoading(true)
        try {
            const params = new URLSearchParams({
                search: searchAula,
                page: "1",
                size: "48",
            })
            const response = await fetchJSON<{ data: Aula[] }>(`/api/aulas/admin?${params.toString()}`)
            const mapped = response.data.map((aula: any) => ({
                id: aula.id,
                nombre_aula: aula.nombre_aula,
                colegio: aula.colegio,
                nivel: aula.nivel,
                curso: aula.curso,
                paralelo: aula.paralelo,
                materia: aula.materia,
                max_estudiantes: aula.max_estudiantes,
                inscritos: typeof aula.inscritos === "number"
                    ? aula.inscritos
                    : Array.isArray(aula.estudiantes)
                        ? aula.estudiantes.length
                        : aula.inscritos ?? 0,
            }))
            setAulas(mapped)
        } catch (error: any) {
            toast({ title: "Error al cargar aulas", description: error.message, variant: "destructive" })
            setAulas([])
        } finally {
            setAulasLoading(false)
        }
    }, [searchAula, toast])

    useEffect(() => {
        const handler = setTimeout(() => {
            loadAulas()
        }, 250)
        return () => clearTimeout(handler)
    }, [loadAulas])

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Contacto con apoderados</h1>
                <p className="text-sm text-muted-foreground">
                    Selecciona un aula para ver los estudiantes inscritos y contactar rápidamente a sus apoderados por WhatsApp.
                </p>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <CardTitle>Aulas disponibles</CardTitle>
                            <CardDescription>Filtra y selecciona un aula para ver a los apoderados.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por aula, colegio o materia"
                                className="pl-9"
                                value={searchAula}
                                onChange={(event) => setSearchAula(event.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {aulasLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-24" />
                            ))}
                        </div>
                    ) : filteredAulas.length === 0 ? (
                        <Alert>
                            <AlertTitle>Sin resultados</AlertTitle>
                            <AlertDescription>No encontramos aulas que coincidan con la búsqueda.</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredAulas.map((aula) => (
                                <button
                                    key={aula.id}
                                    type="button"
                                    className="rounded-md border p-4 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                        <Link href={`/admin/contacto-apoderados/${aula.id}`} className="flex items-start justify-between gap-2" prefetch>
                                            <div className="space-y-1">
                                                <div className="font-semibold leading-tight" title={aula.nombre_aula}>{aula.nombre_aula}</div>
                                                <div className="text-xs text-muted-foreground" title={`${aula.colegio} · ${aula.nivel}`}>
                                                    {aula.colegio} · {aula.nivel}
                                                </div>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <Badge variant="secondary" className="text-[10px]">{aula.materia}</Badge>
                                                    <Badge variant="outline" className="text-[10px]">{aula.curso}{aula.paralelo}</Badge>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground text-right flex flex-col items-end gap-1">
                                                <div>Cupo: {aula.inscritos}/{aula.max_estudiantes}</div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </Link>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
