"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Pencil, Plus, Trash } from "lucide-react"

interface Materia {
  id: number
  nombre_corto: string
  nombre_completo: string
}

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newMateria, setNewMateria] = useState({
    nombre_corto: "",
    nombre_completo: "",
  })
  const [editMateria, setEditMateria] = useState<Materia | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchMaterias()
  }, [])

  const fetchMaterias = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/materias")
      if (response.ok) {
        const data = await response.json()
        setMaterias(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las materias",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching materias:", error)
      toast({
        title: "Error",
        description: "Error al cargar las materias",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMateria = async () => {
    if (!newMateria.nombre_corto.trim() || !newMateria.nombre_completo.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/materias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newMateria),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Materia agregada correctamente",
        })
        setNewMateria({ nombre_corto: "", nombre_completo: "" })
        setIsDialogOpen(false)
        fetchMaterias()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al agregar la materia",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding materia:", error)
      toast({
        title: "Error",
        description: "Error al agregar la materia",
        variant: "destructive",
      })
    }
  }

  const handleEditMateria = async () => {
    if (!editMateria || !editMateria.nombre_corto.trim() || !editMateria.nombre_completo.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/materias/${editMateria.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_corto: editMateria.nombre_corto,
          nombre_completo: editMateria.nombre_completo,
        }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Materia actualizada correctamente",
        })
        setEditMateria(null)
        setIsEditDialogOpen(false)
        fetchMaterias()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al actualizar la materia",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating materia:", error)
      toast({
        title: "Error",
        description: "Error al actualizar la materia",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMateria = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta materia?")) {
      return
    }

    try {
      const response = await fetch(`/api/materias/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Materia eliminada correctamente",
        })
        fetchMaterias()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al eliminar la materia",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting materia:", error)
      toast({
        title: "Error",
        description: "Error al eliminar la materia",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Materias</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Materia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nueva Materia</DialogTitle>
              <DialogDescription>Ingrese los datos de la nueva materia.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre-corto">Nombre Corto</Label>
                <Input
                  id="nombre-corto"
                  value={newMateria.nombre_corto}
                  onChange={(e) =>
                    setNewMateria({
                      ...newMateria,
                      nombre_corto: e.target.value,
                    })
                  }
                  placeholder="Ej: MAT"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre-completo">Nombre Completo</Label>
                <Input
                  id="nombre-completo"
                  value={newMateria.nombre_completo}
                  onChange={(e) =>
                    setNewMateria({
                      ...newMateria,
                      nombre_completo: e.target.value,
                    })
                  }
                  placeholder="Ej: Matemáticas"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMateria}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materias</CardTitle>
          <CardDescription>Lista de materias registradas en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p>Cargando materias...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre Corto</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No hay materias registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  materias.map((materia) => (
                    <TableRow key={materia.id}>
                      <TableCell>{materia.id}</TableCell>
                      <TableCell>{materia.nombre_corto}</TableCell>
                      <TableCell>{materia.nombre_completo}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditMateria(materia)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMateria(materia.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Materia</DialogTitle>
            <DialogDescription>Modifique los datos de la materia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre-corto">Nombre Corto</Label>
              <Input
                id="edit-nombre-corto"
                value={editMateria?.nombre_corto || ""}
                onChange={(e) => setEditMateria(editMateria ? { ...editMateria, nombre_corto: e.target.value } : null)}
                placeholder="Ej: MAT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nombre-completo">Nombre Completo</Label>
              <Input
                id="edit-nombre-completo"
                value={editMateria?.nombre_completo || ""}
                onChange={(e) =>
                  setEditMateria(editMateria ? { ...editMateria, nombre_completo: e.target.value } : null)
                }
                placeholder="Ej: Matemáticas"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMateria}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
