"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import {
    ArrowLeft,
    Users,
    Loader2,
    Plus,
    Search,
    GraduationCap
} from "lucide-react"
import StudentImportExport from "@/components/aula/student-import-export"
import AddStudentModal from "@/components/aula/add-student-modal"

interface Estudiante {
    id: number
    inscripcion_id: number
    nombres: string
    apellidos: string
    nombre_completo: string
    fecha_registro: string
}

interface Aula {
    id: number
    nombre_aula: string
    colegio: string
    nivel: string
    curso: string
    paralelo: string
    materia: string
}

export default function EstudiantesPage() {
    const params = useParams()
    const router = useRouter()
    const aulaId = params?.id as string
    const { toast } = useToast()

    const [aula, setAula] = useState<Aula | null>(null)
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
    const [filteredEstudiantes, setFilteredEstudiantes] = useState<Estudiante[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showAddModal, setShowAddModal] = useState(false)

    useEffect(() => {
        if (!aulaId || aulaId === 'undefined') {
            router.push('/aulas')
            return
        }
        fetchAula()
        fetchEstudiantes()
    }, [aulaId, router])

    useEffect(() => {
        const filtered = estudiantes.filter(estudiante =>
            estudiante.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredEstudiantes(filtered)
    }, [estudiantes, searchTerm])

    const fetchAula = async () => {
        if (!aulaId) return
        try {
            const response = await fetch(`/api/aulas/${aulaId}`)
            if (response.ok) {
                const data = await response.json()
                setAula(data)
            }
        } catch (error) {
            console.error("Error al cargar aula:", error)
        }
    }

    const fetchEstudiantes = async () => {
        if (!aulaId) return
        setIsLoading(true)
        try {
            const response = await fetch(`/api/aulas/${aulaId}/estudiantes`)
            if (response.ok) {
                const data = await response.json()
                setEstudiantes(data)
            } else {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los estudiantes",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al cargar estudiantes:", error)
            toast({
                title: "Error",
                description: "Error al cargar los estudiantes",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefreshStudents = () => {
        fetchEstudiantes()
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando estudiantes...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/aulas/${aulaId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Estudiantes</h1>
                    <p className="text-muted-foreground">
                        {aula?.nombre_aula} - {aula?.curso} {aula?.paralelo}
                    </p>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2">
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Estudiante
                    </Button>
                    
                    {/* Componente de Import/Export */}
                    {aula && (
                        <StudentImportExport
                            aulaId={aulaId}
                            aula={{
                                nombre_aula: aula.nombre_aula,
                                colegio: aula.colegio,
                                nivel: aula.nivel,
                                curso: aula.curso,
                                paralelo: aula.paralelo,
                                materia: aula.materia
                            }}
                            estudiantes={estudiantes.map(e => ({
                                id: e.id,
                                nombres: e.nombres,
                                apellidos: e.apellidos
                            }))}
                            onImportComplete={handleRefreshStudents}
                        />
                    )}
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Buscar estudiantes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-80"
                    />
                </div>
            </div>

            {/* Students List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Lista de Estudiantes ({filteredEstudiantes.length})
                    </CardTitle>
                    <CardDescription>
                        Gestiona los estudiantes inscritos en esta aula
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredEstudiantes.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                {searchTerm ? "No se encontraron estudiantes" : "No hay estudiantes registrados"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredEstudiantes.map((estudiante, index) => (
                                <div
                                    key={estudiante.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                            <GraduationCap className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{estudiante.nombre_completo}</p>
                                            <p className="text-sm text-muted-foreground">
                                                📅 Inscrito: {new Date(estudiante.fecha_registro).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">Activo</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Student Modal */}
            <AddStudentModal
                aulaId={aulaId}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onStudentAdded={handleRefreshStudents}
            />
        </div>
    )
}