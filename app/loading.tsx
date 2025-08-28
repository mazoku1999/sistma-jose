"use client"

import { Loader2 } from "lucide-react"

export default function RootLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando…</p>
            </div>
        </div>
    )
}


