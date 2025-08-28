"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from "react"

interface TrimestreContextType {
  trimestreGlobal: string
  setTrimestreGlobal: (trimestre: string) => void
  trimestres: Record<string, { label: string; periodo: string; icon: string }>
  getTrimestreDefault: () => string
  clearTrimestreConfig: () => void
}

const TrimestreContext = createContext<TrimestreContextType | undefined>(undefined)

const trimestres = {
  '1': {
    label: '1er Trimestre',
    periodo: '5 Feb - 10 May',
    icon: '🌱'
  },
  '2': {
    label: '2do Trimestre',
    periodo: '13 May - 30 Ago',
    icon: '☀️'
  },
  '3': {
    label: '3er Trimestre',
    periodo: '2 Sep - 10 Dic',
    icon: '🍂'
  }
}

const getTrimestreDefault = () => {
  const now = new Date()
  const mes = now.getMonth() + 1 // 1-12
  const dia = now.getDate()
  
  // 1er Trimestre: 5 de febrero al 10 de mayo
  if ((mes === 2 && dia >= 5) || mes === 3 || mes === 4 || (mes === 5 && dia <= 10)) {
    return "1"
  }
  
  // 2do Trimestre: 13 de mayo al 30 de agosto
  if ((mes === 5 && dia >= 13) || mes === 6 || mes === 7 || (mes === 8 && dia <= 30)) {
    return "2"
  }
  
  // 3er Trimestre: 2 de septiembre al 10 de diciembre
  if ((mes === 9 && dia >= 2) || mes === 10 || mes === 11 || (mes === 12 && dia <= 10)) {
    return "3"
  }
  
  // Períodos de transición/vacaciones
  if (mes === 1 || (mes === 2 && dia < 5)) {
    return "1" // Vacaciones de verano, próximo trimestre
  }
  if (mes === 5 && dia >= 11 && dia < 13) {
    return "1" // Transición 1er a 2do trimestre, mantener 1er trimestre
  }
  if (mes === 8 && dia > 30) {
    return "2" // Transición 2do a 3er trimestre, mantener 2do trimestre
  }
  if (mes === 12 && dia > 10) {
    return "1" // Vacaciones de verano, próximo año
  }
  
  return "1" // Por defecto
}

export function TrimestreProvider({ children }: { children: ReactNode }) {
  const [trimestreGlobal, setTrimestreGlobalState] = useState<string>("")

  useEffect(() => {
    // Cargar trimestre guardado (persiste entre pestañas) o usar el default
    const trimestreGuardado = localStorage.getItem('trimestre_global')
    if (trimestreGuardado) {
      setTrimestreGlobalState(trimestreGuardado)
    } else {
      const defaultTrimestre = getTrimestreDefault()
      setTrimestreGlobalState(defaultTrimestre)
      localStorage.setItem('trimestre_global', defaultTrimestre)
    }
  }, [])

  // Efecto para detectar cuando la configuración ha sido limpiada
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'trimestre_global' && e.newValue === null) {
        // La configuración fue limpiada, restablecer al trimestre por defecto
        const defaultTrimestre = getTrimestreDefault()
        setTrimestreGlobalState(defaultTrimestre)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const setTrimestreGlobal = (trimestre: string) => {
    setTrimestreGlobalState(trimestre)
    localStorage.setItem('trimestre_global', trimestre)
  }

  const clearTrimestreConfig = () => {
    localStorage.removeItem('trimestre_global')
    // Volver al trimestre por defecto basado en la fecha actual
    const defaultTrimestre = getTrimestreDefault()
    setTrimestreGlobalState(defaultTrimestre)
  }

  return (
    <TrimestreContext.Provider value={{
      trimestreGlobal,
      setTrimestreGlobal,
      trimestres,
      getTrimestreDefault,
      clearTrimestreConfig
    }}>
      {children}
    </TrimestreContext.Provider>
  )
}

export function useTrimestreGlobal() {
  const context = useContext(TrimestreContext)
  if (context === undefined) {
    throw new Error('useTrimestreGlobal must be used within a TrimestreProvider')
  }
  return context
}