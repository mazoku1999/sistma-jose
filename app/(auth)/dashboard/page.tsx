"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    // Redirigir según el rol del usuario
    if (user.roles.includes("ADMIN")) {
      router.replace("/dashboard/admin")
    } else if (user.roles.includes("PROFESOR")) {
      router.replace("/dashboard/profesor")
      } else {
      // Si no tiene roles específicos, redirigir al dashboard de profesor por defecto
      router.replace("/dashboard/profesor")
    }
  }, [user, router])

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Redirigiendo a tu panel...</p>
      </div>
    </div>
  )
}