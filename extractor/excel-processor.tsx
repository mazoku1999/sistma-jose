"use client"

import * as XLSX from "xlsx"

// Utilidad para procesar archivos Excel
// En una implementación real, usarías la librería 'xlsx' para leer archivos Excel

export interface ExcelData {
  numero: number
  nombre: string
  ser: number
  saber: number
  hacer: number
  decidir: number
  puntajeTrimestral: number
}

export class ExcelProcessor {
  static async processFile(file: File): Promise<ExcelData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          // Convertir a JSON para facilitar el procesamiento
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          const students: ExcelData[] = []

          for (let i = 10; i < jsonData.length; i++) {
            const row = jsonData[i] as any[]

            // Verificar que la fila tenga datos válidos
            if (!row || !row[0] || !row[1]) continue

            // Extraer datos según las columnas especificadas
            const numero = row[0] // Columna A
            const nombre = row[1] // Columna B
            const ser = row[6] || 0 // Columna G (índice 6)
            const saber = row[14] || 0 // Columna O (índice 14)
            const hacer = row[23] || 0 // Columna X (índice 23)
            const decidir = row[26] || 0 // Columna AA (índice 26)
            const puntajeTrimestral = row[29] || 0 // Columna AD (índice 29)

            // Validar que tengamos al menos número y nombre
            if (numero && nombre) {
              students.push({
                numero: Number(numero),
                nombre: String(nombre).trim(),
                ser: Number(ser) || 0,
                saber: Number(saber) || 0,
                hacer: Number(hacer) || 0,
                decidir: Number(decidir) || 0,
                puntajeTrimestral: Number(puntajeTrimestral) || 0,
              })
            }
          }

          console.log(`[v0] Procesados ${students.length} estudiantes del Excel`)
          resolve(students)
        } catch (error) {
          console.error("[v0] Error procesando Excel:", error)
          reject(new Error("Error al procesar el archivo Excel"))
        }
      }

      reader.onerror = () => {
        reject(new Error("Error al leer el archivo"))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    const sum = values.reduce((acc, val) => acc + val, 0)
    return Math.round((sum / values.length) * 100) / 100
  }
}
