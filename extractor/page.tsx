"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, Users, Calculator } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ExcelProcessor, type ExcelData } from "@/components/excel-processor"

interface Student {
  numero: number
  nombre: string
  ser: number
  saber: number
  hacer: number
  decidir: number
  puntajeTrimestral: number
  promedio: number
}

export default function StudentGradesApp() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({
        title: "Error de archivo",
        description: "Por favor selecciona un archivo Excel válido (.xlsx o .xls)",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const excelData: ExcelData[] = await ExcelProcessor.processFile(file)

      // Convertir los datos del Excel al formato de Student con cálculo de promedio
      const processedStudents: Student[] = excelData.map((data) => {
        const promedio = ExcelProcessor.calculateAverage([data.ser, data.saber, data.hacer, data.decidir])
        return {
          numero: data.numero,
          nombre: data.nombre,
          ser: data.ser,
          saber: data.saber,
          hacer: data.hacer,
          decidir: data.decidir,
          puntajeTrimestral: data.puntajeTrimestral,
          promedio: promedio,
        }
      })

      setStudents(processedStudents)
      toast({
        title: "Archivo procesado exitosamente",
        description: `Se cargaron ${processedStudents.length} estudiantes correctamente.`,
      })
    } catch (error) {
      console.error("[v0] Error procesando archivo:", error)
      toast({
        title: "Error al procesar archivo",
        description: "Hubo un problema al leer el archivo Excel. Verifica el formato.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getGradeColor = (grade: number, max = 100) => {
    const percentage = (grade / max) * 100
    if (percentage >= 80) return "bg-green-100 text-green-800"
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const calculateStats = () => {
    if (students.length === 0) return { avgSer: 0, avgSaber: 0, avgHacer: 0, avgDecidir: 0, avgTotal: 0 }

    const totals = students.reduce(
      (acc, student) => ({
        ser: acc.ser + student.ser,
        saber: acc.saber + student.saber,
        hacer: acc.hacer + student.hacer,
        decidir: acc.decidir + student.decidir,
        total: acc.total + student.puntajeTrimestral,
      }),
      { ser: 0, saber: 0, hacer: 0, decidir: 0, total: 0 },
    )

    return {
      avgSer: Math.round((totals.ser / students.length) * 100) / 100,
      avgSaber: Math.round((totals.saber / students.length) * 100) / 100,
      avgHacer: Math.round((totals.hacer / students.length) * 100) / 100,
      avgDecidir: Math.round((totals.decidir / students.length) * 100) / 100,
      avgTotal: Math.round((totals.total / students.length) * 100) / 100,
    }
  }

  const stats = calculateStats()

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Sistema de Gestión de Calificaciones</h1>
          <p className="text-muted-foreground">
            Carga y visualiza las calificaciones de estudiantes desde archivos Excel
          </p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Cargar Archivo Excel
            </CardTitle>
            <CardDescription>
              Selecciona un archivo Excel con las calificaciones. Los datos deben comenzar en la fila 11.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="excel-file">Archivo Excel</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Procesando archivo...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {students.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Estudiantes</p>
                    <p className="text-2xl font-bold">{students.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-chart-1" />
                  <div>
                    <p className="text-sm font-medium">Promedio SER</p>
                    <p className="text-2xl font-bold">{stats.avgSer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-chart-2" />
                  <div>
                    <p className="text-sm font-medium">Promedio SABER</p>
                    <p className="text-2xl font-bold">{stats.avgSaber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-chart-3" />
                  <div>
                    <p className="text-sm font-medium">Promedio HACER</p>
                    <p className="text-2xl font-bold">{stats.avgHacer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-chart-4" />
                  <div>
                    <p className="text-sm font-medium">Promedio DECIDIR</p>
                    <p className="text-2xl font-bold">{stats.avgDecidir}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Students Table */}
        {students.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Calificaciones de Estudiantes
              </CardTitle>
              <CardDescription>Visualización de las calificaciones por dimensión y puntaje trimestral</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">N°</TableHead>
                      <TableHead className="min-w-[250px]">Apellidos y Nombres</TableHead>
                      <TableHead className="text-center">SER</TableHead>
                      <TableHead className="text-center">SABER</TableHead>
                      <TableHead className="text-center">HACER</TableHead>
                      <TableHead className="text-center">DECIDIR</TableHead>
                      <TableHead className="text-center">Promedio</TableHead>
                      <TableHead className="text-center">Puntaje Trimestral</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.numero}>
                        <TableCell className="font-medium">{student.numero}</TableCell>
                        <TableCell className="font-medium">{student.nombre}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getGradeColor(student.ser, 5)}>
                            {student.ser}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getGradeColor(student.saber, 50)}>
                            {student.saber}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getGradeColor(student.hacer, 50)}>
                            {student.hacer}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getGradeColor(student.decidir, 5)}>
                            {student.decidir}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{student.promedio}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getGradeColor(student.puntajeTrimestral, 100)}>
                            {student.puntajeTrimestral}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {students.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay datos cargados</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Carga un archivo Excel para comenzar a visualizar las calificaciones de los estudiantes. Asegúrate de
                que los datos comiencen en la fila 11 según el formato especificado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  )
}
