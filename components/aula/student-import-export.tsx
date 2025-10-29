"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import {
    Download,
    Upload,
    FileSpreadsheet,
    Loader2,
    AlertTriangle,
    CheckCircle,
    XCircle
} from "lucide-react"
import * as XLSX from 'xlsx'
import { exportStudentsToExcel, createImportTemplate, EstudianteExport, AulaInfo } from "@/lib/excel-utils"

interface StudentImportExportProps {
    aulaId: string
    aula: AulaInfo
    estudiantes: EstudianteExport[]
    onImportComplete: () => void
}

export default function StudentImportExport({
    aulaId,
    aula,
    estudiantes,
    onImportComplete
}: StudentImportExportProps) {
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [showImportModal, setShowImportModal] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const [importErrors, setImportErrors] = useState<string[]>([])
    const [importPreview, setImportPreview] = useState<any[]>([])

    const handleExportStudents = () => {
        if (estudiantes.length === 0) {
            toast({
                title: "Sin datos",
                description: "No hay estudiantes para exportar",
                variant: "destructive",
            })
            return
        }

        try {
            const result = exportStudentsToExcel(estudiantes, aula)
            toast({
                title: "✅ Exportación exitosa",
                description: `${result.count} estudiantes exportados en ${result.fileName}`,
            })
        } catch (error) {
            console.error("Error al exportar:", error)
            toast({
                title: "Error",
                description: "Error al exportar estudiantes",
                variant: "destructive",
            })
        }
    }

    const handleDownloadTemplate = () => {
        try {
            const result = createImportTemplate(aula)
            toast({
                title: "📋 Template descargado",
                description: `Archivo ${result.fileName} listo para usar`,
            })
        } catch (error) {
            console.error("Error al crear template:", error)
            toast({
                title: "Error",
                description: "Error al crear template",
                variant: "destructive",
            })
        }
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const normalizeValue = (value: string | undefined | null) => (value ?? '').toString().trim()
            const compareBy = (fields: Array<'ApellidoPaterno' | 'ApellidoMaterno' | 'Nombres'>) => (a: any, b: any) => {
                for (const field of fields) {
                    const va = normalizeValue(a[field]).toLocaleLowerCase()
                    const vb = normalizeValue(b[field]).toLocaleLowerCase()
                    const cmp = va.localeCompare(vb, 'es', { sensitivity: 'base' })
                    if (cmp !== 0) return cmp
                }
                return 0
            }
            const sortStudents = (rows: any[]) => {
                const soloMaterno = rows.filter(row => !normalizeValue(row.ApellidoPaterno))
                const conPaterno = rows.filter(row => normalizeValue(row.ApellidoPaterno))

                soloMaterno.sort(compareBy(['ApellidoMaterno', 'Nombres']))
                conPaterno.sort(compareBy(['ApellidoPaterno', 'ApellidoMaterno', 'Nombres']))

                return [...soloMaterno, ...conPaterno]
            }

            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]

                const rows: any[] = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '',
                    blankrows: false
                })

                const startRow = 11 // fila 12 (0-indexed)
                const paternoColIndex = 2 // columna C
                const maternoColIndex = 3 // columna D
                const nombresColIndex = 4 // columna E
                const telefonoColIndex = 70 // columna BS (0-indexed)

                const convertedData: any[] = []
                for (let i = startRow; i < rows.length; i++) {
                    const row = rows[i] as any[]
                    if (!Array.isArray(row)) continue

                    const apellidoPaterno = (row[paternoColIndex] || '').toString().trim()
                    const apellidoMaterno = (row[maternoColIndex] || '').toString().trim()
                    const nombres = (row[nombresColIndex] || '').toString().trim()
                    const telefonoApoderado = (row[telefonoColIndex] || '').toString().trim()

                    if (!apellidoPaterno && !apellidoMaterno && !nombres) continue
                    convertedData.push({
                        Nombres: nombres,
                        ApellidoPaterno: apellidoPaterno,
                        ApellidoMaterno: apellidoMaterno,
                        TelefonoApoderado: telefonoApoderado,
                    })
                }

                const finalJsonData = convertedData.filter(item => item.Nombres || item.ApellidoPaterno || item.ApellidoMaterno)

                if (finalJsonData.length === 0) {
                    toast({
                        title: "❌ Sin datos válidos",
                        description: "No se encontraron estudiantes válidos en el archivo",
                        variant: "destructive",
                    })
                    return
                }

                const normalizedData = finalJsonData.map(item => ({
                    ApellidoPaterno: (item.ApellidoPaterno || '').toString().trim(),
                    ApellidoMaterno: (item.ApellidoMaterno || '').toString().trim(),
                    Nombres: (item.Nombres || '').toString().trim(),
                    TelefonoApoderado: (item.TelefonoApoderado || '').toString().trim(),
                }))

                const sortedData = sortStudents(normalizedData)

                setImportData(sortedData)
                setImportPreview(sortedData.slice(0, 10)) // Mostrar solo los primeros 10
                setImportErrors([])
                setShowImportModal(true)

                toast({
                    title: "📁 Archivo cargado",
                    description: `${normalizedData.length} estudiantes encontrados`,
                })
            } catch (error) {
                console.error("Error al leer archivo:", error)
                toast({
                    title: "Error",
                    description: "Error al leer el archivo. Verifica que sea un archivo Excel válido.",
                    variant: "destructive",
                })
            }
        }
        reader.readAsArrayBuffer(file)

        // Limpiar input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleImportStudents = async () => {
        if (importData.length === 0) return

        setIsImporting(true)
        try {
            const response = await fetch(`/api/aulas/${aulaId}/estudiantes/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ estudiantes: importData })
            })

            if (response.ok) {
                const result = await response.json()

                toast({
                    title: "🎉 Importación exitosa",
                    description: `${result.imported} estudiantes importados correctamente`,
                })

                if (result.errors && result.errors.length > 0) {
                    toast({
                        title: "⚠️ Advertencias",
                        description: `${result.errors.length} registros omitidos (duplicados o errores)`,
                        variant: "default",
                    })
                }

                setShowImportModal(false)
                setImportData([])
                setImportPreview([])
                onImportComplete()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al importar estudiantes",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error al importar estudiantes:", error)
            toast({
                title: "Error",
                description: "Error al importar estudiantes",
                variant: "destructive",
            })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <>
            {/* Botones de acción */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={handleExportStudents}
                    disabled={estudiantes.length === 0}
                >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar ({estudiantes.length})
                </Button>

                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                </Button>

                <Button
                    variant="ghost"
                    onClick={handleDownloadTemplate}
                >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Template
                </Button>
            </div>

            {/* Modal de importación */}
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-blue-600" />
                            Confirmar Importación de Estudiantes
                        </DialogTitle>
                        <DialogDescription>
                            Revisa los datos antes de importar a {aula.nombre_aula}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Resumen */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium text-blue-800">Estudiantes a importar</p>
                                        <p className="text-2xl font-bold text-blue-600">{importData.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="font-medium text-green-800">Estudiantes actuales</p>
                                        <p className="text-2xl font-bold text-green-600">{estudiantes.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-purple-600" />
                                    <div>
                                        <p className="font-medium text-purple-800">Total después</p>
                                        <p className="text-2xl font-bold text-purple-600">~{estudiantes.length + importData.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Información del aula */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-800 mb-2">Destino de importación:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Aula:</span>
                                    <p className="font-medium">{aula.nombre_aula}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Curso:</span>
                                    <p className="font-medium">{aula.curso} {aula.paralelo}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Materia:</span>
                                    <p className="font-medium">{aula.materia}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Colegio:</span>
                                    <p className="font-medium">{aula.colegio}</p>
                                </div>
                            </div>
                        </div>

                        {/* Preview de datos */}
                        <div>
                            <h4 className="font-medium mb-3">Vista previa de estudiantes:</h4>
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b">
                                    <div className="grid grid-cols-5 gap-4 font-medium text-sm text-gray-700">
                                        <span>N°</span>
                                        <span>Apellido paterno</span>
                                        <span>Apellido materno</span>
                                        <span>Nombres</span>
                                        <span>Tel. apoderado</span>
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {importPreview.map((row: any, index) => (
                                        <div key={index} className="px-4 py-2 border-b last:border-b-0 hover:bg-gray-50">
                                            <div className="grid grid-cols-5 gap-4 text-sm">
                                                <span className="text-gray-600">{index + 1}</span>
                                                <span className="font-medium">{row.ApellidoPaterno}</span>
                                                <span className="font-medium">{row.ApellidoMaterno}</span>
                                                <span className="font-medium">{row.Nombres}</span>
                                                <span className="font-medium">{row.TelefonoApoderado}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {importData.length > 10 && (
                                        <div className="px-4 py-3 text-center text-sm text-gray-500 bg-gray-50">
                                            ... y {importData.length - 10} estudiantes más
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Advertencias */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                <div className="space-y-2">
                                    <h4 className="font-medium text-yellow-800">Información importante:</h4>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        <li>• Los estudiantes duplicados serán omitidos automáticamente</li>
                                        <li>• Se verificarán los cupos disponibles en el aula</li>
                                        <li>• La importación puede tomar unos segundos</li>
                                        <li>• Recibirás un reporte detallado al finalizar</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setShowImportModal(false)}
                            disabled={isImporting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleImportStudents}
                            disabled={isImporting || importData.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Importar {importData.length} Estudiantes
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Input oculto para archivos */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />
        </>
    )
}