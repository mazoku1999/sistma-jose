"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { clearUserConfig } from "./config-utils"

type User = {
  id: number
  nombre_completo: string
  usuario: string
  roles: string[]
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if user is logged in (solo al montar o cuando se fuerce)
    const controller = new AbortController()
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session", { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
          } else {
            setUser(null)
            if (!pathname.includes("/login")) {
              router.push("/login")
            }
          }
        } else {
          setUser(null)
          if (!pathname.includes("/login")) {
            router.push("/login")
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
    return () => controller.abort()
  // No revalidar en cada navegación: el middleware protege rutas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        router.push("/dashboard")
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })

      // Limpiar configuración global del usuario
      clearUserConfig()

      setUser(null)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)

      // Limpiar configuración incluso si hay error en el logout
      clearUserConfig()
      setUser(null)
      router.push("/login")
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
