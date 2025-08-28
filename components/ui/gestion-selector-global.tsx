"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useGestionGlobal } from "@/hooks/use-gestion-global"
import { useAuth } from "@/lib/auth-provider"
import { Settings, Check, Calendar, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface GestionSelectorGlobalProps {
  showLabel?: boolean
  variant?: "default" | "compact"
}

export default function GestionSelectorGlobal({
  showLabel = true,
  variant = "default"
}: GestionSelectorGlobalProps) {
  const { user } = useAuth()
  const { gestionGlobal, setGestionGlobal, gestiones, gestionActual, isLoading } = useGestionGlobal()
  const [showModal, setShowModal] = useState(false)
  const [gestionSeleccionada, setGestionSeleccionada] = useState<number | null>(null)
  
  const isAdmin = user?.roles.includes("ADMIN")



  const handleOpenModal = () => {
    setGestionSeleccionada(gestionGlobal)
    setShowModal(true)
  }

  const handleConfirmar = () => {
    if (gestionSeleccionada) {
      setGestionGlobal(gestionSeleccionada)
      setShowModal(false)
    }
  }

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-8 px-2 text-xs animate-pulse"
      >
        <Calendar className="h-3 w-3 mr-1" />
        Cargando...
      </Button>
    )
  }

  if (!gestionActual) {
    if (!isAdmin) {
      // Para profesores: solo mostrar texto simple
      return (
        <div className="flex items-center gap-1 text-sm text-amber-700">
          <Calendar className="h-3 w-3" />
          <span>{gestiones.length === 0 ? 'Cargando gestiones...' : 'Sin gestión activa'}</span>
        </div>
      )
    }

    // Para administradores: botón interactivo
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenModal}
        className="h-8 px-2 text-xs border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
        disabled={gestiones.length === 0}
      >
        <Calendar className="h-3 w-3 mr-1" />
        {gestiones.length === 0 ? 'Cargando gestiones...' : 'Sin gestión activa'}
      </Button>
    )
  }

  if (variant === "compact") {
    if (!isAdmin) {
      // Para profesores: solo mostrar texto simple
      return (
        <div className={cn(
          "flex items-center gap-1 text-sm",
          gestionActual.activa ? "text-green-700" : "text-amber-700"
        )}>
          <Calendar className="h-3 w-3" />
          <span>{gestionActual.nombre}</span>
          {gestionActual.activa ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <Clock className="h-3 w-3 text-amber-500" />
          )}
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
          className={cn(
            "h-8 px-2 text-xs",
            gestionActual.activa
              ? "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          )}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {gestionActual.nombre}
          {gestionActual.activa ? (
            <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
          ) : (
            <Clock className="h-3 w-3 ml-1 text-amber-500" />
          )}
          <Settings className="h-3 w-3 ml-1" />
        </Button>

        {isAdmin && (
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Cambiar Gestión Académica
                </DialogTitle>
                <DialogDescription>
                  Selecciona la gestión académica que deseas usar en toda la aplicación
                </DialogDescription>
              </DialogHeader>

            <div className="space-y-3 py-4">
              {gestiones.map((gestion) => (
                <Card
                  key={gestion.id_gestion}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    gestion.activa ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200",
                    gestionSeleccionada === gestion.id_gestion && "ring-2 ring-primary"
                  )}
                  onClick={() => setGestionSeleccionada(gestion.id_gestion)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {gestion.activa ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <h4 className="font-medium text-sm">{gestion.nombre}</h4>
                            <p className="text-xs text-muted-foreground">
                              Año {gestion.anio}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {gestion.activa ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            Activa
                          </Badge>
                        ) : null}
                        {gestionSeleccionada === gestion.id_gestion ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmar} disabled={!gestionSeleccionada}>
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
          <span className="text-sm font-medium text-muted-foreground">Gestión:</span>
        )}
        <div className={cn(
          "flex items-center gap-1 text-sm",
          gestionActual.activa ? "text-green-700" : "text-amber-700"
        )}>
          <Calendar className="h-3 w-3" />
          <span className="font-medium">{gestionActual.nombre}</span>
          {gestionActual.activa && (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          )}
        </div>
      </div>
    )
  }

  // Para administradores: interfaz completa con botón
  return (
    <>
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className="text-sm font-medium text-muted-foreground">Gestión:</span>
        )}
        <Badge variant="outline" className="text-sm">
          <Calendar className="h-3 w-3 mr-1" />
          {gestionActual.nombre}
          {gestionActual.activa && (
            <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
          )}
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
                Cambiar Gestión Académica
              </DialogTitle>
              <DialogDescription>
                Selecciona la gestión académica que deseas usar en toda la aplicación
              </DialogDescription>
            </DialogHeader>

          <div className="space-y-4 py-4">
            {gestiones.map((gestion) => (
              <Card
                key={gestion.id_gestion}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  gestion.activa ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200",
                  gestionSeleccionada === gestion.id_gestion && "ring-2 ring-primary"
                )}
                onClick={() => setGestionSeleccionada(gestion.id_gestion)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {gestion.activa ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <h3 className="font-semibold">{gestion.nombre}</h3>
                          <p className="text-sm text-muted-foreground">
                            Año {gestion.anio}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {gestion.activa && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Activa
                        </Badge>
                      )}
                      {gestionSeleccionada === gestion.id_gestion && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={!gestionSeleccionada}>
              Aplicar Cambio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </>
  )
}