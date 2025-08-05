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

interface Colegio {
  id: number
  nombre: string
}

export default function ColegiosPage() {
  const [colegios, setColegios] = useState<Colegio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newColegio, setNewColegio] = useState("")
  const [editColegio, setEditColegio] = useState<Colegio | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchColegios()
  }, [])

  const fetchColegios = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/colegios")
      if (response.ok) {
        const data = await response.json()
        setColegios(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los colegios",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching colegios:", error)
      toast({
        title: "Error",
        description: "Error al cargar los colegios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddColegio = async () => {
    if (!newColegio.trim()) {
      toast({
        title: "Error",
        description: "El nombre del colegio es requerido",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/colegios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre: newColegio }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Colegio agregado correctamente",
        })
        setNewColegio("")
        setIsDialogOpen(false)
        fetchColegios()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al agregar el colegio",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding colegio:", error)
      toast({
        title: "Error",
        description: "Error al agregar el colegio",
        variant: "destructive",
      })
    }
  }

  const handleEditColegio = async () => {
    if (!editColegio || !editColegio.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del colegio es requerido",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/colegios/${editColegio.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre: editColegio.nombre }),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Colegio actualizado correctamente",
        })
        setEditColegio(null)
        setIsEditDialogOpen(false)
        fetchColegios()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al actualizar el colegio",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating colegio:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el colegio",
        variant: "destructive",
      })
    }
  }

  const handleDeleteColegio = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este colegio?")) {
      return
    }

    try {
      const response = await fetch(`/api/colegios/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Colegio eliminado correctamente",
        })
        fetchColegios()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al eliminar el colegio",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting colegio:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el colegio",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Colegios</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Colegio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Colegio</DialogTitle>
              <DialogDescription>Ingrese el nombre del nuevo colegio.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Colegio</Label>
                <Input
                  id="nombre"
                  value={newColegio}
                  onChange={(e) => setNewColegio(e.target.value)}
                  placeholder="Nombre del colegio"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddColegio}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Colegios</CardTitle>
          <CardDescription>Lista de colegios registrados en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p>Cargando colegios...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colegios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No hay colegios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  colegios.map((colegio) => (
                    <TableRow key={colegio.id}>
                      <TableCell>{colegio.id}</TableCell>
                      <TableCell>{colegio.nombre}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditColegio(colegio)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteColegio(colegio.id)}>
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
            <DialogTitle>Editar Colegio</DialogTitle>
            <DialogDescription>Modifique el nombre del colegio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre del Colegio</Label>
              <Input
                id="edit-nombre"
                value={editColegio?.nombre || ""}
                onChange={(e) => setEditColegio(editColegio ? { ...editColegio, nombre: e.target.value } : null)}
                placeholder="Nombre del colegio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditColegio}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
