"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-provider"

interface NotasTabProps {
  aulaId: number
}

interface Estudiante {
  id: number
  inscripcion_id: number
  nombre_completo: string
  notas: {
    [trimestre: number]: number | null
  }
}

export default function NotasTab({ aulaId }: NotasTabProps) {
  const { user } = useAuth()
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [trimestreActivo, setTrimestreActivo] = useState("1")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [notasModificadas, setNotasModificadas] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    fetchEstudiantes()
  }, [aulaId])

  const fetchEstudiantes = async () => {
    setIsLoading(true)
    try {
      // Obtener estudiantes del aula
      const response = await fetch(`/api/aulas/${aulaId}/estudiantes`)
      if (response.ok) {
        const estudiantesData = await response.json()

        // Obtener notas de los estudiantes
        const notasResponse = await fetch(`/api/aulas/${aulaId}/notas`)
        if (notasResponse.ok) {
          const notasData = await notasResponse.json()

          // Mapear estudiantes con sus notas
          const estudiantesConNotas = estudiantesData.map((estudiante: any) => {
            const notasEstudiante = notasData.filter((nota: any) => nota.id_inscripcion === estudiante.inscripcion_id)

            // Crear objeto de notas por trimestre
            const notas: { [trimestre: number]: number | null } = {
              1: null,
              2: null,
              3: null,
            }

            notasEstudiante.forEach((nota: any) => {
              notas[nota.trimestre] = nota.promedio_final_trimestre
            })

            return {
              ...estudiante,
              notas,
            }
          })

          setEstudiantes(estudiantesConNotas)
        }
      } else {
        console.error("Error al cargar estudiantes")
      }
    } catch (error) {
      console.error("Error al cargar estudiantes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotaChange = (estudianteId: number, valor: string) => {
    // Validar que sea un número entre 0 y 10
    const notaValue = Number.parseFloat(valor)
    if (isNaN(notaValue) || notaValue < 0 || notaValue > 10) {
      return
    }

    setEstudiantes((prev) =>
      prev.map((estudiante) => {
        if (estudiante.id === estudianteId) {
          return {
            ...estudiante,
            notas: {
              ...estudiante.notas,
              [Number.parseInt(trimestreActivo)]: notaValue,
            },
          }
        }
        return estudiante
      }),
    )

    // Marcar como modificada
    setNotasModificadas({
      ...notasModificadas,
      [`${estudianteId}-${trimestreActivo}`]: true,
    })
  }

  const guardarNotas = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError("")

    try {
      // Preparar datos para enviar
      const notasParaGuardar = estudiantes
        .map((estudiante) => ({
          id_inscripcion: estudiante.inscripcion_id,
          trimestre: Number.parseInt(trimestreActivo),
          promedio_final_trimestre: estudiante.notas[Number.parseInt(trimestreActivo)],
        }))
        .filter((nota) => nota.promedio_final_trimestre !== null)

      // Enviar notas al servidor
      const response = await fetch(`/api/aulas/${aulaId}/notas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notas: notasParaGuardar,
        }),
      })

      if (response.ok) {
        setSaveSuccess(true)
        // Limpiar estado de modificaciones
        setNotasModificadas({})
        // Recargar datos
        fetchEstudiantes()
      } else {
        const error = await response.json()
        setSaveError(error.error || "Error al guardar las notas")
      }
    } catch (error) {
      console.error("Error al guardar notas:", error)
      setSaveError("Error al guardar las notas")
    } finally {
      setIsSaving(false)
    }
  }

  const centralizarNotas = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError("")

    try {
      // Enviar solicitud para centralizar notas
      const response = await fetch(`/api/aulas/${aulaId}/centralizar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trimestre: Number.parseInt(trimestreActivo),
        }),
      })

      if (response.ok) {
        setSaveSuccess(true)
      } else {
        const error = await response.json()
        setSaveError(error.error || "Error al centralizar las notas")
      }
    } catch (error) {
      console.error("Error al centralizar notas:", error)
      setSaveError("Error al centralizar las notas")
    } finally {
      setIsSaving(false)
    }
  }

  const calcularPromedio = (trimestre: string) => {
    const notasValidas = estudiantes
      .map((e) => e.notas[Number.parseInt(trimestre)])
      .filter((nota) => nota !== null) as number[]

    if (notasValidas.length === 0) return 0

    const suma = notasValidas.reduce((acc, nota) => acc + nota, 0)
    return (suma / notasValidas.length).toFixed(2)
  }

  const calcularCompletitud = (trimestre: string) => {
    const total = estudiantes.length
    if (total === 0) return 0

    const conNotas = estudiantes.filter((e) => e.notas[Number.parseInt(trimestre)] !== null).length
    return Math.round((conNotas / total) * 100)
  }

  const getEstadoNota = (nota: number | null) => {
    if (nota === null) return null
    if (nota >= 7) return "aprobado"
    if (nota >= 5) return "regular"
    return "reprobado"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Cargando estudiantes y notas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Registro de Notas</h2>
          <p className="text-muted-foreground">Gestiona las calificaciones de tus estudiantes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={isSaving}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" disabled={isSaving}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          {user?.roles.includes("ADMIN") && (
            <Button onClick={centralizarNotas} disabled={isSaving}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Centralizar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promedio General</CardTitle>
            <CardDescription>Trimestre {trimestreActivo}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calcularPromedio(trimestreActivo)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completitud</CardTitle>
            <CardDescription>Notas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calcularCompletitud(trimestreActivo)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <CardDescription>Total en el aula</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estudiantes.length}</div>
          </CardContent>
        </Card>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>¡Éxito!</AlertTitle>
          <AlertDescription>Las notas han sido guardadas correctamente.</AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Notas por Trimestre</CardTitle>
              <CardDescription>Ingresa las calificaciones de los estudiantes</CardDescription>
            </div>
            <Tabs value={trimestreActivo} onValueChange={setTrimestreActivo} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-[300px]">
                <TabsTrigger value="1">Trimestre 1</TabsTrigger>
                <TabsTrigger value="2">Trimestre 2</TabsTrigger>
                <TabsTrigger value="3">Trimestre 3</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {estudiantes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay estudiantes inscritos en esta aula.</p>
              <Button className="mt-4" asChild>
                <a href={`/aulas/${aulaId}/estudiantes`}>Inscribir estudiantes</a>
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead className="w-32 text-center">Nota Final</TableHead>
                      <TableHead className="w-32 text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estudiantes.map((estudiante, index) => (
                      <TableRow key={estudiante.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{estudiante.nombre_completo}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={estudiante.notas[Number.parseInt(trimestreActivo)] ?? ""}
                            onChange={(e) => handleNotaChange(estudiante.id, e.target.value)}
                            className={
                              notasModificadas[`${estudiante.id}-${trimestreActivo}`] ? "border-amber-500" : ""
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {estudiante.notas[Number.parseInt(trimestreActivo)] !== null && (
                            <Badge
                              variant="outline"
                              className={
                                getEstadoNota(estudiante.notas[Number.parseInt(trimestreActivo)]) === "aprobado"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : getEstadoNota(estudiante.notas[Number.parseInt(trimestreActivo)]) === "regular"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                              }
                            >
                              {getEstadoNota(estudiante.notas[Number.parseInt(trimestreActivo)]) === "aprobado"
                                ? "Aprobado"
                                : getEstadoNota(estudiante.notas[Number.parseInt(trimestreActivo)]) === "regular"
                                  ? "Regular"
                                  : "Reprobado"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
