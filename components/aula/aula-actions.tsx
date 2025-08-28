"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  FileText,
  RotateCcw,
  Archive,
  AlertTriangle
} from "lucide-react"

interface AulaActionsProps {
  aula: {
    id: number
    nombre_aula: string
    estudiantes: number
    activa?: boolean
  }
  onUpdate: () => void
  canEdit?: boolean
  canDelete?: boolean
  canRestore?: boolean
}

export default function AulaActions({ 
  aula, 
  onUpdate, 
  canEdit = true, 
  canDelete = true,
  canRestore = false 
}: AulaActionsProps) {
  const { toast } = useToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/aulas/${aula.id}/delete`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "✅ Aula eliminada",
          description: `El aula "${aula.nombre_aula}" ha sido eliminada exitosamente.`,
        })
        onUpdate()
      } else {
        console.error("Error response:", data)
        toast({
          title: "❌ Error al eliminar",
          description: data.error || "No se pudo eliminar el aula",
          variant: "destructive",
        })
        
        // Log adicional para debug
        if (data.debug) {
          console.log("Debug info:", data.debug)
        }
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "❌ Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const response = await fetch(`/api/aulas/${aula.id}/restore`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "✅ Aula restaurada",
          description: `El aula "${aula.nombre_aula}" ha sido restaurada exitosamente.`,
        })
        onUpdate()
      } else {
        toast({
          title: "❌ Error al restaurar",
          description: data.error || "No se pudo restaurar el aula",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
      setShowRestoreDialog(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {canEdit && aula.activa !== false && (
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Editar aula
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem>
            <Users className="mr-2 h-4 w-4" />
            Ver estudiantes ({aula.estudiantes})
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <FileText className="mr-2 h-4 w-4" />
            Exportar datos
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {canRestore && aula.activa === false && (
            <DropdownMenuItem 
              onClick={() => setShowRestoreDialog(true)}
              className="text-green-600"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar aula
            </DropdownMenuItem>
          )}
          
          {canDelete && aula.activa !== false && (
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar aula
            </DropdownMenuItem>
          )}
          
          {aula.activa === false && (
            <DropdownMenuItem disabled>
              <Archive className="mr-2 h-4 w-4" />
              Aula eliminada
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              ¿Eliminar aula?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Estás a punto de eliminar el aula <strong>"{aula.nombre_aula}"</strong>.
              </p>
              {aula.estudiantes > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-amber-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Esta aula tiene {aula.estudiantes} estudiante(s) inscrito(s).
                    No se puede eliminar hasta que todos los estudiantes sean removidos.
                  </p>
                </div>
              )}
              {aula.estudiantes === 0 && (
                <p className="text-sm text-gray-600">
                  Esta acción se puede deshacer desde el panel de administración.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || aula.estudiantes > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.div>
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para restaurar */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-500" />
              ¿Restaurar aula?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres restaurar el aula <strong>"{aula.nombre_aula}"</strong>?
              Esta acción la hará visible y funcional nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRestoring ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.div>
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {isRestoring ? "Restaurando..." : "Restaurar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}