"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BookOpen,
  CheckCircle,
  Loader2,
  X,
  Lock,
  School,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface CreateAulaWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentGestionId: number | null
}

interface FormData {
  id_materia: string
  id_colegio: string
  id_nivel: string
  id_curso: string
  id_paralelo: string
  nombre_aula: string
  max_estudiantes: string
}

interface AvailableOption {
  id: number
  nombre: string
  nombre_completo?: string
  disponible: boolean
  profesor_asignado?: string
  profesor_email?: string
  aula_existente?: string
}

export default function CreateAulaWizard({
  isOpen,
  onClose,
  onSuccess,
  currentGestionId
}: CreateAulaWizardProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    id_materia: "",
    id_colegio: "",
    id_nivel: "",
    id_curso: "",
    id_paralelo: "",
    nombre_aula: "",
    max_estudiantes: "30",
  })

  // Data states
  const [materias, setMaterias] = useState<any[]>([])
  const [colegios, setColegios] = useState<AvailableOption[]>([])
  const [niveles, setNiveles] = useState<AvailableOption[]>([])
  const [cursos, setCursos] = useState<AvailableOption[]>([])
  const [paralelos, setParalelos] = useState<AvailableOption[]>([])

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const steps = [
    { id: 1, title: "Materia", icon: BookOpen, color: "from-blue-500 to-cyan-500" },
    { id: 2, title: "Ubicación", icon: School, color: "from-purple-500 to-pink-500" },
    { id: 3, title: "Curso", icon: GraduationCap, color: "from-green-500 to-emerald-500" },
    { id: 4, title: "Finalizar", icon: Sparkles, color: "from-orange-500 to-red-500" }
  ]

  // Check if component is mounted (for portal)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchMaterias()
    }
  }, [isOpen])

  // Fetch available options when materia changes
  useEffect(() => {
    if (formData.id_materia) {
      fetchAvailableOptions()
    }
  }, [formData.id_materia, currentGestionId])

  // Check combinations dynamically as user selects options
  // NO incluir id_paralelo para evitar que se actualice cuando solo cambia el paralelo
  useEffect(() => {
    if (formData.id_materia) {
      checkCombination()
    }
  }, [formData.id_materia, formData.id_colegio, formData.id_nivel, formData.id_curso, currentGestionId])

  // Verificar conflicto específico solo cuando se selecciona un paralelo completo
  useEffect(() => {
    if (formData.id_materia && formData.id_colegio && formData.id_nivel && formData.id_curso && formData.id_paralelo) {
      checkSpecificCombination()
    }
  }, [formData.id_paralelo])

  const fetchMaterias = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/materias")
      if (response.ok) {
        const data = await response.json()
        setMaterias(data)
      }
    } catch (error) {
      console.error("Error loading materias:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableOptions = async () => {
    setIsLoadingOptions(true)
    try {
      const response = await fetch(`/api/aulas/available-options?materia=${formData.id_materia}&gestion=${currentGestionId}`)
      if (response.ok) {
        const data = await response.json()
        setColegios(data.colegios || [])
        setNiveles(data.niveles || [])
        setCursos(data.cursos || [])
        setParalelos(data.paralelos || [])
      }
    } catch (error) {
      console.error("Error loading available options:", error)
    } finally {
      setIsLoadingOptions(false)
    }
  }

  const checkCombination = async () => {
    try {
      const response = await fetch("/api/aulas/check-combination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_materia: formData.id_materia,
          id_colegio: formData.id_colegio,
          id_nivel: formData.id_nivel,
          id_curso: formData.id_curso,
          id_paralelo: "", // No enviar paralelo específico para obtener todos los ocupados
          id_gestion: currentGestionId
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Mantener todos los cursos disponibles - no bloquear cursos
        if (formData.id_colegio && formData.id_nivel) {
          setCursos(prev => prev.map(curso => ({
            ...curso,
            disponible: true // Siempre mantener cursos disponibles
          })))
        }

        // Solo bloquear paralelos específicos que estén ocupados
        if (formData.id_colegio && formData.id_nivel && formData.id_curso) {
          setParalelos(prev => prev.map(paralelo => {
            const ocupado = data.ocupadas && data.ocupadas.find((o: any) =>
              o.id_colegio.toString() === formData.id_colegio &&
              o.id_nivel.toString() === formData.id_nivel &&
              o.id_curso.toString() === formData.id_curso &&
              o.id_paralelo === paralelo.id
            )
            return {
              ...paralelo,
              disponible: !ocupado,
              profesor_asignado: ocupado?.profesor_nombre,
              profesor_email: ocupado?.profesor_email,
              aula_existente: ocupado?.nombre_aula
            }
          }))
        }
      }
    } catch (error) {
      console.error("Error checking combination:", error)
    }
  }

  // Función separada para verificar conflicto específico cuando se selecciona un paralelo
  const checkSpecificCombination = async () => {
    try {
      const response = await fetch("/api/aulas/check-combination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_materia: formData.id_materia,
          id_colegio: formData.id_colegio,
          id_nivel: formData.id_nivel,
          id_curso: formData.id_curso,
          id_paralelo: formData.id_paralelo,
          id_gestion: currentGestionId
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Solo mostrar alerta si hay conflicto exacto
        if (data.hasConflict) {
          toast({
            title: "⚠️ Combinación ocupada",
            description: `Esta combinación ya está asignada a ${data.conflictDetails.profesor_nombre}`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error checking specific combination:", error)
    }
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Auto-generate aula name when we have enough info
    if (field === 'id_paralelo' && formData.id_materia && formData.id_curso) {
      generateAulaName({ ...formData, [field]: value })
    }

    // Reset dependent fields when parent changes
    if (field === 'id_materia') {
      setFormData(prev => ({
        ...prev,
        id_colegio: "",
        id_nivel: "",
        id_curso: "",
        id_paralelo: "",
        nombre_aula: "",
      }))
    }
  }

  const generateAulaName = (data: FormData) => {
    const materia = materias.find(m => m.id.toString() === data.id_materia)
    const curso = cursos.find(c => c.id.toString() === data.id_curso)
    const paralelo = paralelos.find(p => p.id.toString() === data.id_paralelo)

    if (materia && curso && paralelo) {
      const name = `${materia.nombre_completo} - ${curso.nombre} ${paralelo.nombre}`
      setFormData(prev => ({ ...prev, nombre_aula: name }))
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Asegurar que el nombre del aula esté generado
      let finalFormData = { ...formData }
      if (!finalFormData.nombre_aula) {
        const materia = materias.find(m => m.id.toString() === formData.id_materia)
        const curso = cursos.find(c => c.id.toString() === formData.id_curso)
        const paralelo = paralelos.find(p => p.id.toString() === formData.id_paralelo)

        if (materia && curso && paralelo) {
          finalFormData.nombre_aula = `${materia.nombre_completo} - ${curso.nombre} ${paralelo.nombre}`
        }
      }

      const response = await fetch("/api/aulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...finalFormData,
          id_gestion: currentGestionId
        }),
      })

      if (response.ok) {
        toast({
          title: "¡Aula creada exitosamente!",
          description: `El aula "${finalFormData.nombre_aula}" ha sido creada.`,
        })
        onSuccess()
        onClose()
        // Reset form
        setFormData({
          id_materia: "",
          id_colegio: "",
          id_nivel: "",
          id_curso: "",
          id_paralelo: "",
          nombre_aula: "",
          max_estudiantes: "30",
        })
        setCurrentStep(1)
      } else {
        const error = await response.json()
        toast({
          title: "Error al crear aula",
          description: error.error || "Ocurrió un error inesperado",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return formData.id_materia !== ""
      case 2: return formData.id_colegio !== "" && formData.id_nivel !== ""
      case 3: return formData.id_curso !== "" && formData.id_paralelo !== ""
      case 4: return formData.nombre_aula !== "" && formData.max_estudiantes !== ""
      default: return false
    }
  }
  const renderStepContent = () => {
    if (isLoading) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600">Cargando materias...</p>
        </motion.div>
      )
    }

    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center"
              >
                <BookOpen className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">¿Qué materia vas a enseñar?</h3>
              <p className="text-gray-600">Selecciona la asignatura para tu nueva aula</p>
            </div>

            <div className="grid gap-3 max-w-2xl mx-auto">
              {materias.map((materia, index) => (
                <motion.div
                  key={materia.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-200 ${formData.id_materia === materia.id.toString()
                      ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg'
                      : 'hover:bg-gray-50 hover:shadow-md'
                      }`}
                    onClick={() => handleSelectChange('id_materia', materia.id.toString())}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{materia.nombre_completo}</h4>
                            <p className="text-sm text-gray-500">{materia.nombre_corto}</p>
                          </div>
                        </div>
                        {formData.id_materia === materia.id.toString() && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          >
                            <CheckCircle className="h-6 w-6 text-blue-600" />
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
              >
                <School className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">¿Dónde vas a enseñar?</h3>
              <p className="text-gray-600">Selecciona el colegio y nivel educativo</p>
            </div>

            {isLoadingOptions ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-purple-500 mb-4" />
                <p className="text-gray-600">Cargando opciones disponibles...</p>
              </motion.div>
            ) : (
              <div className="space-y-8 max-w-3xl mx-auto">
                <div>
                  <Label className="text-lg font-semibold mb-4 block text-gray-800">Colegio</Label>
                  <div className="grid gap-3">
                    {colegios.map((colegio, index) => (
                      <motion.div
                        key={colegio.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-200 ${formData.id_colegio === colegio.id.toString()
                            ? 'ring-2 ring-purple-500 bg-purple-50 shadow-lg'
                            : 'hover:bg-gray-50 hover:shadow-md'
                            }`}
                          onClick={() => handleSelectChange('id_colegio', colegio.id.toString())}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <School className="h-5 w-5 text-purple-600" />
                                <span className="font-medium text-gray-800">{colegio.nombre}</span>
                              </div>
                              {formData.id_colegio === colegio.id.toString() && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500 }}
                                >
                                  <CheckCircle className="h-5 w-5 text-purple-600" />
                                </motion.div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-lg font-semibold mb-4 block text-gray-800">Nivel Educativo</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {niveles.map((nivel, index) => (
                      <motion.div
                        key={nivel.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-200 ${formData.id_nivel === nivel.id.toString()
                            ? 'ring-2 ring-purple-500 bg-purple-50 shadow-lg'
                            : 'hover:bg-gray-50 hover:shadow-md'
                            }`}
                          onClick={() => handleSelectChange('id_nivel', nivel.id.toString())}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GraduationCap className="h-5 w-5 text-purple-600" />
                                <span className="font-medium text-gray-800">{nivel.nombre}</span>
                              </div>
                              {formData.id_nivel === nivel.id.toString() && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500 }}
                                >
                                  <CheckCircle className="h-5 w-5 text-purple-600" />
                                </motion.div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center"
              >
                <GraduationCap className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">¿A qué curso enseñarás?</h3>
              <p className="text-gray-600">Selecciona el curso y paralelo específico</p>
            </div>

            <div className="space-y-8 max-w-4xl mx-auto">
              <div>
                <Label className="text-lg font-semibold mb-4 block text-gray-800">Curso</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cursos.map((curso, index) => (
                    <motion.div
                      key={curso.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: curso.disponible ? 1.05 : 1 }}
                      whileTap={{ scale: curso.disponible ? 0.95 : 1 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all duration-200 ${!curso.disponible
                          ? 'opacity-60 cursor-not-allowed bg-gray-100'
                          : formData.id_curso === curso.id.toString()
                            ? 'ring-2 ring-green-500 bg-green-50 shadow-lg'
                            : 'hover:bg-gray-50 hover:shadow-md'
                          }`}
                        onClick={() => curso.disponible && handleSelectChange('id_curso', curso.id.toString())}
                      >
                        <CardContent className="p-4">
                          <div className="text-center">
                            {!curso.disponible && <Lock className="h-4 w-4 mx-auto text-gray-400 mb-2" />}
                            <span className={`font-semibold ${!curso.disponible ? 'text-gray-500' : 'text-gray-800'}`}>
                              {curso.nombre}
                            </span>
                            {!curso.disponible && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2"
                              >
                                <Badge variant="secondary" className="text-xs">
                                  Ocupado por {curso.profesor_asignado}
                                </Badge>
                              </motion.div>
                            )}
                            {curso.disponible && formData.id_curso === curso.id.toString() && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500 }}
                                className="mt-2"
                              >
                                <CheckCircle className="h-5 w-5 mx-auto text-green-600" />
                              </motion.div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-4 block text-gray-800">Paralelo</Label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {paralelos.map((paralelo, index) => (
                    <motion.div
                      key={paralelo.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: paralelo.disponible ? 1.1 : 1 }}
                      whileTap={{ scale: paralelo.disponible ? 0.9 : 1 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all duration-200 ${!paralelo.disponible
                          ? 'opacity-60 cursor-not-allowed bg-gray-100'
                          : formData.id_paralelo === paralelo.id.toString()
                            ? 'ring-2 ring-green-500 bg-green-50 shadow-lg'
                            : 'hover:bg-gray-50 hover:shadow-md'
                          }`}
                        onClick={() => paralelo.disponible && handleSelectChange('id_paralelo', paralelo.id.toString())}
                      >
                        <CardContent className="p-4">
                          <div className="text-center">
                            {!paralelo.disponible && <Lock className="h-4 w-4 mx-auto text-gray-400 mb-1" />}
                            <span className={`font-bold text-lg ${!paralelo.disponible ? 'text-gray-500' : 'text-gray-800'}`}>
                              {paralelo.nombre}
                            </span>
                            {!paralelo.disponible && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-1"
                              >
                                <p className="text-xs text-gray-500">
                                  Ocupado por {paralelo.profesor_asignado}
                                </p>
                              </motion.div>
                            )}
                            {paralelo.disponible && formData.id_paralelo === paralelo.id.toString() && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500 }}
                                className="mt-1"
                              >
                                <CheckCircle className="h-4 w-4 mx-auto text-green-600" />
                              </motion.div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )

      case 4:
        const selectedMateria = materias.find(m => m.id.toString() === formData.id_materia)
        const selectedColegio = colegios.find(c => c.id.toString() === formData.id_colegio)
        const selectedNivel = niveles.find(n => n.id.toString() === formData.id_nivel)
        const selectedCurso = cursos.find(c => c.id.toString() === formData.id_curso)
        const selectedParalelo = paralelos.find(p => p.id.toString() === formData.id_paralelo)

        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center"
              >
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Casi listo!</h3>
              <p className="text-gray-600">Configura los detalles finales de tu aula</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nombre_aula" className="text-base font-medium">Nombre del Aula</Label>
                      <Input
                        id="nombre_aula"
                        value={formData.nombre_aula}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre_aula: e.target.value }))}
                        className="mt-2"
                        placeholder="Ej: Matemáticas - 1ro A"
                      />
                      <p className="text-sm text-gray-500 mt-1">Este nombre se generó automáticamente, pero puedes cambiarlo</p>
                    </div>

                    <div>
                      <Label htmlFor="max_estudiantes" className="text-base font-medium">Máximo de Estudiantes</Label>
                      <Input
                        id="max_estudiantes"
                        type="number"
                        value={formData.max_estudiantes}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_estudiantes: e.target.value }))}
                        className="mt-2"
                        min="1"
                        max="50"
                      />
                      <p className="text-sm text-gray-500 mt-1">Número máximo de estudiantes que pueden inscribirse</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <h4 className="font-bold text-green-800 text-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Resumen del Aula
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-green-700">Materia:</span>
                        <p className="text-green-800">{selectedMateria?.nombre_completo}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Colegio:</span>
                        <p className="text-green-800">{selectedColegio?.nombre}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Nivel:</span>
                        <p className="text-green-800">{selectedNivel?.nombre}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-green-700">Curso:</span>
                        <p className="text-green-800">{selectedCurso?.nombre} {selectedParalelo?.nombre}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Capacidad:</span>
                        <p className="text-green-800">{formData.max_estudiantes} estudiantes</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Nombre:</span>
                        <p className="text-green-800">{formData.nombre_aula}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  // Don't render on server side
  if (!isMounted) return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 bottom-0 bg-white z-[9999] flex flex-col w-screen h-screen"
        >
          {/* Header */}
          <div className="relative bg-white border-b shadow-sm">
            <motion.div
              className={`h-1 bg-gradient-to-r ${steps[currentStep - 1]?.color}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: currentStep / steps.length }}
              transition={{ duration: 0.5 }}
            />

            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <motion.h1
                    key={currentStep}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-bold text-gray-800"
                  >
                    Crear Nueva Aula
                  </motion.h1>
                  <motion.p
                    key={`subtitle-${currentStep}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-gray-600 text-xl mt-2"
                  >
                    {steps[currentStep - 1]?.title} - Paso {currentStep} de {steps.length}
                  </motion.p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-7 w-7 text-gray-500" />
                </motion.button>
              </div>

              {/* Step indicators */}
              <div className="flex items-center justify-center space-x-8">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    className="flex items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex flex-col items-center">
                      <div className={`
                          relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300
                          ${currentStep >= step.id
                          ? `bg-gradient-to-r ${step.color} text-white shadow-xl`
                          : 'bg-gray-200 text-gray-500'
                        }
                        `}>
                        {currentStep > step.id ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          >
                            <CheckCircle className="h-8 w-8" />
                          </motion.div>
                        ) : (
                          <step.icon className="h-8 w-8" />
                        )}

                        {currentStep === step.id && (
                          <motion.div
                            className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-75"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <span className={`mt-3 text-sm font-medium ${currentStep >= step.id ? 'text-gray-800' : 'text-gray-500'
                        }`}>
                        {step.title}
                      </span>
                    </div>

                    {index < steps.length - 1 && (
                      <div className={`
                          w-16 h-1 mx-6 transition-all duration-500 rounded-full
                          ${currentStep > step.id ? 'bg-gradient-to-r from-green-400 to-blue-400' : 'bg-gray-300'}
                        `} />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="container mx-auto px-8 py-12">
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <motion.div
            className="border-t bg-white p-8 flex justify-between items-center shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
            </motion.div>

            <div className="text-sm text-gray-500 font-medium">
              {currentStep} / {steps.length}
            </div>

            {currentStep === steps.length ? (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceedToNext() || isSubmitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Crear Aula
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                  disabled={!canProceedToNext()}
                  className={`flex items-center gap-2 bg-gradient-to-r ${steps[currentStep - 1]?.color} text-white shadow-lg`}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Render modal using portal to bypass layout constraints
  return createPortal(modalContent, document.body)
}