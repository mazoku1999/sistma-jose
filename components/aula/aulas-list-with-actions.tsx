"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import AulaActions from "./aula-actions"
import {
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  Archive,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck
} from "lucide-react"

interface Aula {
  id: number
  nombre_aula: string
  colegio: string
  nivel: string
  curso: string
  paralelo: string
  materia: string
  estudiantes: number
  progreso?: number
  pendientes?: number
  activa?: boolean
  fecha_eliminacion?: string
  gestion_nombre?: string
  gestion_activa?: boolean
}

interface AulasListWithActionsProps {
  aulas: Aula[]
  onUpdate: () => void
  showDeleted?: boolean
  onToggleDeleted?: (show: boolean) => void
  isAdmin?: boolean
}

const trimestres = {
  '1': { label: '1er Trimestre', icon: '🌱', periodo: '5 Feb - 10 May' },
  '2': { label: '2do Trimestre', icon: '☀️', periodo: '13 May - 30 Ago' },
  '3': { label: '3er Trimestre', icon: '🍂', periodo: '2 Sep - 10 Dic' }
}

export default function AulasListWithActions({
  aulas,
  onUpdate,
  showDeleted = false,
  onToggleDeleted,
  isAdmin = false
}: AulasListWithActionsProps) {
  const router = useRouter()

  const handleAulaClick = (aulaId: number, activa?: boolean) => {
    // Solo permitir ingresar a aulas activas
    if (activa !== false) {
      router.push(`/aulas/${aulaId}`)
    }
  }

  const activeAulas = aulas.filter(aula => aula.activa !== false)
  const deletedAulas = aulas.filter(aula => aula.activa === false)

  const getStatusBadge = (aula: Aula) => {
    if (aula.activa === false) {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
          <Archive className="h-3 w-3 mr-1" />
          Eliminada
        </Badge>
      )
    }

    if (aula.gestion_activa === false) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Gestión Inactiva
        </Badge>
      )
    }

    return null // No mostrar badge para aulas activas
  }

  const renderAulaCard = (aula: Aula, index: number) => (
    <motion.div
      key={aula.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${aula.activa === false ? 'opacity-75' : ''}`}
    >
      <Card className={`hover:shadow-lg transition-all duration-200 ${aula.activa === false ? 'border-red-200 bg-red-50/30' : 'hover:shadow-md'
        }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className={`text-lg ${aula.activa === false ? 'text-gray-600' : ''}`}>
                {aula.nombre_aula}
              </CardTitle>
              <CardDescription className="mt-1">
                {aula.colegio} • {aula.nivel} • {aula.curso} {aula.paralelo}
              </CardDescription>
              {aula.gestion_nombre && (
                <CardDescription className="text-xs mt-1">
                  📅 {aula.gestion_nombre}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(aula)}
              <AulaActions
                aula={aula}
                onUpdate={onUpdate}
                canEdit={aula.activa !== false}
                canDelete={aula.activa !== false}
                canRestore={aula.activa === false && isAdmin}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Solo información esencial */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>{aula.estudiantes} estudiantes</span>
                </div>
                {aula.pendientes !== undefined && aula.pendientes > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-600">{aula.pendientes} pendientes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Información de eliminación */}
            {aula.activa === false && aula.fecha_eliminacion && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <Archive className="h-4 w-4 inline mr-1" />
                  Eliminada el {new Date(aula.fecha_eliminacion).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Acciones principales */}
            {aula.activa !== false && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAulaClick(aula.id, aula.activa)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs hover:bg-blue-50 hover:text-blue-700"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Ver Aula
                  </Button>
                  <Button
                    onClick={() => router.push(`/aulas/${aula.id}/asistencias`)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs hover:bg-orange-50 hover:text-orange-700"
                  >
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    Asistencia
                  </Button>
                  <Button
                    onClick={() => router.push(`/aulas/${aula.id}/notas`)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs hover:bg-purple-50 hover:text-purple-700"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Notas
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Control para mostrar/ocultar eliminadas */}
      {onToggleDeleted && deletedAulas.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={onToggleDeleted}
            />
            <Label htmlFor="show-deleted" className="text-sm font-medium">
              {showDeleted ? (
                <>
                  <EyeOff className="h-4 w-4 inline mr-1" />
                  Ocultar aulas eliminadas
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 inline mr-1" />
                  Mostrar aulas eliminadas ({deletedAulas.length})
                </>
              )}
            </Label>
          </div>
          {showDeleted && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {deletedAulas.length} eliminada{deletedAulas.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Lista de aulas activas */}
      {activeAulas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Aulas Activas ({activeAulas.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {activeAulas.map((aula, index) => renderAulaCard(aula, index))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Lista de aulas eliminadas */}
      {showDeleted && deletedAulas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-600 flex items-center gap-2">
            <Archive className="h-5 w-5 text-red-500" />
            Aulas Eliminadas ({deletedAulas.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {deletedAulas.map((aula, index) => renderAulaCard(aula, index))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {activeAulas.length === 0 && (!showDeleted || deletedAulas.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay aulas disponibles
          </h3>
          <p className="text-gray-600 mb-4">
            Comienza creando tu primera aula para gestionar estudiantes y notas.
          </p>
        </motion.div>
      )}

    </div>
  )
}