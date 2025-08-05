"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTrimestreGlobal } from "@/hooks/use-trimestre-global"
import { useAuth } from "@/lib/auth-provider"
import { Settings, Check, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrimestreSelectorProps {
  showLabel?: boolean
  variant?: "default" | "compact"
}

export default function TrimestreSelector({ 
  showLabel = true, 
  variant = "default" 
}: TrimestreSelectorProps) {
  const { user } = useAuth()
  const { trimestreGlobal, setTrimestreGlobal, trimestres } = useTrimestreGlobal()
  const [showModal, setShowModal] = useState(false)
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState("")
  
  const isAdmin = user?.roles.includes("ADMIN")

  const handleOpenModal = () => {
    setTrimestreSeleccionado(trimestreGlobal)
    setShowModal(true)
  }

  const handleConfirmar = () => {
    if (trimestreSeleccionado) {
      setTrimestreGlobal(trimestreSeleccionado)
      setShowModal(false)
    }
  }

  if (!trimestreGlobal) return null

  const trimestreActual = trimestres[trimestreGlobal]

  if (variant === "compact") {
    if (!isAdmin) {
      // Para profesores: solo mostrar texto simple
      return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{trimestreActual?.icon}</span>
          <span>{trimestreActual?.label}</span>
        </div>
      )
    }

    // Para administradores: botón interactivo
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenModal}
          className="h-8 px-2 text-xs"
        >
          <span className="mr-1">{trimestreActual?.icon}</span>
          {trimestreActual?.label}
          <Settings className="h-3 w-3 ml-1" />
        </Button>

        {isAdmin && (
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Cambiar Período Académico
                </DialogTitle>
                <DialogDescription>
                  Selecciona el trimestre que deseas usar en toda la aplicación
                </DialogDescription>
              </DialogHeader>

            <div className="space-y-3 py-4">
              {Object.entries(trimestres).map(([key, trimestre]) => (
                <Card
                  key={key}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    key === '1' && "bg-green-50 border-green-200",
                    key === '2' && "bg-blue-50 border-blue-200", 
                    key === '3' && "bg-orange-50 border-orange-200",
                    trimestreSeleccionado === key && "ring-2 ring-primary"
                  )}
                  onClick={() => setTrimestreSeleccionado(key)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{trimestre.icon}</span>
                        <div>
                          <h4 className="font-medium text-sm">{trimestre.label}</h4>
                          <p className="text-xs text-muted-foreground">{trimestre.periodo}</p>
                        </div>
                      </div>
                      {trimestreSeleccionado === key && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmar} disabled={!trimestreSeleccionado}>
                Aplicar Cambio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </>
    )
  }

  if (!isAdmin) {
    // Para profesores: solo mostrar texto simple
    return (
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
        )}
        <div className="flex items-center gap-1 text-sm">
          <span>{trimestreActual?.icon}</span>
          <span className="font-medium">{trimestreActual?.label}</span>
        </div>
      </div>
    )
  }

  // Para administradores: interfaz completa con botón
  return (
    <>
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
        )}
        <Badge variant="outline" className="text-sm">
          <span className="mr-1">{trimestreActual?.icon}</span>
          {trimestreActual?.label}
        </Badge>
        <Button variant="ghost" size="sm" onClick={handleOpenModal}>
          <Settings className="h-4 w-4 mr-1" />
          Cambiar
        </Button>
      </div>

      {isAdmin && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Cambiar Período Académico
              </DialogTitle>
              <DialogDescription>
                Selecciona el trimestre que deseas usar en toda la aplicación
              </DialogDescription>
            </DialogHeader>

          <div className="space-y-4 py-4">
            {Object.entries(trimestres).map(([key, trimestre]) => (
              <Card
                key={key}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  key === '1' && "bg-green-50 border-green-200",
                  key === '2' && "bg-blue-50 border-blue-200", 
                  key === '3' && "bg-orange-50 border-orange-200",
                  trimestreSeleccionado === key && "ring-2 ring-primary"
                )}
                onClick={() => setTrimestreSeleccionado(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{trimestre.icon}</span>
                      <div>
                        <h3 className="font-semibold">{trimestre.label}</h3>
                        <p className="text-sm text-muted-foreground">{trimestre.periodo}</p>
                      </div>
                    </div>
                    {trimestreSeleccionado === key && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={!trimestreSeleccionado}>
              Aplicar Cambio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </>
  )
}