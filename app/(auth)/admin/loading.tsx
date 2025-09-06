"use client"

import { Loader2 } from "lucide-react"

export default function AdminLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando administración…</p>
      </div>
    </div>
  )
}

