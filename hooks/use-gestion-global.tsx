"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from "react"

interface Gestion {
  id_gestion: number
  nombre: string
  anio: number
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
  descripcion?: string
  fecha_creacion?: string
}

interface GestionContextType {
  gestionGlobal: number | null
  setGestionGlobal: (gestionId: number | null) => void
  gestiones: Gestion[]
  gestionActual: Gestion | null
  isGestionActiva: boolean
  isLoading: boolean
  refreshGestiones: () => Promise<void>
  clearGestionConfig: () => void
}

const GestionContext = createContext<GestionContextType | undefined>(undefined)

export function GestionProvider({ children }: { children: ReactNode }) {
  const [gestionGlobal, setGestionGlobalState] = useState<number | null>(null)
  const [gestiones, setGestiones] = useState<Gestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchGestiones = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/gestiones')
      if (response.ok) {
        const data = await response.json()
        setGestiones(data)
      }
    } catch (error) {
      console.error("Error al cargar gestiones:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Inicializar gestión seleccionada
  const initializeGestion = (gestiones: Gestion[]) => {
    const gestionGuardada = localStorage.getItem('gestion_global')
    
    if (gestionGuardada) {
      const gestionGuardadaId = parseInt(gestionGuardada)
      const gestionExiste = gestiones.find(g => g.id_gestion === gestionGuardadaId)
      
      if (gestionExiste) {
        setGestionGlobalState(gestionGuardadaId)
        return
      }
    }
    
    // No hay gestión guardada o no existe, usar la activa
    const gestionActiva = gestiones.find(g => g.activa)
    
    if (gestionActiva) {
      setGestionGlobalState(gestionActiva.id_gestion)
      localStorage.setItem('gestion_global', gestionActiva.id_gestion.toString())
    } else {
      setGestionGlobalState(null)
      localStorage.removeItem('gestion_global')
    }
  }

  useEffect(() => {
    fetchGestiones()
  }, [])

  // Inicializar gestión cuando se cargan las gestiones
  useEffect(() => {
    if (gestiones.length > 0 && gestionGlobal === null) {
      initializeGestion(gestiones)
    }
  }, [gestiones, gestionGlobal])

  // Escuchar cambios en localStorage (entre pestañas)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gestion_global') {
        if (e.newValue === null) {
          // Configuración limpiada, usar gestión activa
          const gestionActiva = gestiones.find(g => g.activa)
          if (gestionActiva) {
            setGestionGlobalState(gestionActiva.id_gestion)
          } else {
            setGestionGlobalState(null)
          }
        } else {
          // Configuración cambiada, actualizar estado
          setGestionGlobalState(parseInt(e.newValue))
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [gestiones])

  const setGestionGlobal = (gestionId: number | null) => {
    setGestionGlobalState(gestionId)
    if (gestionId) {
      localStorage.setItem('gestion_global', gestionId.toString())
    } else {
      localStorage.removeItem('gestion_global')
    }
  }

  const clearGestionConfig = () => {
    localStorage.removeItem('gestion_global')
    // Volver a la gestión activa por defecto
    const gestionActiva = gestiones.find(g => g.activa)
    if (gestionActiva) {
      setGestionGlobalState(gestionActiva.id_gestion)
    } else {
      setGestionGlobalState(null)
    }
  }

  const gestionActual = gestiones.find(g => g.id_gestion === gestionGlobal) || null
  const isGestionActiva = gestionActual?.activa || false

  return (
    <GestionContext.Provider value={{
      gestionGlobal,
      setGestionGlobal,
      gestiones,
      gestionActual,
      isGestionActiva,
      isLoading,
      refreshGestiones: fetchGestiones,
      clearGestionConfig
    }}>
      {children}
    </GestionContext.Provider>
  )
}

export function useGestionGlobal() {
  const context = useContext(GestionContext)
  if (context === undefined) {
    throw new Error('useGestionGlobal must be used within a GestionProvider')
  }
  return context
}