import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function getTrimestreLabel(trimestre: number): string {
  switch (trimestre) {
    case 1:
      return "Primer Trimestre"
    case 2:
      return "Segundo Trimestre"
    case 3:
      return "Tercer Trimestre"
    default:
      return "Trimestre Desconocido"
  }
}

export function getSituacionLabel(situacion: string): string {
  switch (situacion) {
    case "E":
      return "Efectivo"
    case "R":
      return "Retirado"
    case "NI":
      return "No Incorporado"
    default:
      return situacion
  }
}

export function getAsistenciaLabel(asistencia: string): string {
  switch (asistencia) {
    case "A":
      return "Asistencia"
    case "R":
      return "Retraso"
    case "L":
      return "Licencia"
    case "F":
      return "Falta"
    default:
      return asistencia
  }
}

export function calculatePromedio(notas: number[]): number {
  if (notas.length === 0) return 0
  const sum = notas.reduce((acc, nota) => acc + nota, 0)
  return Number.parseFloat((sum / notas.length).toFixed(2))
}
