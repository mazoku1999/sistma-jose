"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, Lock, Save, Eye, EyeOff } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface UserProfile {
    id_usuario: number
    usuario: string
    nombres: string
    apellido_paterno: string
    apellido_materno: string
    nombre_completo: string
    email: string
    activo: boolean
    fecha_registro: string
    roles: string[]
}

export default function PerfilPage() {
    const { toast } = useToast()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form data para perfil
    const [profileData, setProfileData] = useState({
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
    })

    // Form data para cambio de contraseña
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await fetch("/api/profile")

            if (response.ok) {
                const data = await response.json()
                setProfile(data)
                setProfileData({
                    nombres: data.nombres || "",
                    apellido_paterno: data.apellido_paterno || "",
                    apellido_materno: data.apellido_materno || "",
                })
            } else {
                const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
                setError(errorData.error || "Error al cargar perfil")
                toast({
                    title: "Error",
                    description: errorData.error || "Error al cargar perfil",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error fetching profile:", error)
            const errorMessage = error instanceof Error ? error.message : "Error al cargar perfil"
            setError(errorMessage)
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsUpdating(true)

        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileData),
            })

            if (response.ok) {
                toast({
                    title: "Perfil actualizado",
                    description: "Tu información personal ha sido actualizada exitosamente",
                })
                fetchProfile() // Recargar datos
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al actualizar perfil",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error updating profile:", error)
            toast({
                title: "Error",
                description: "Error al actualizar perfil",
                variant: "destructive",
            })
        } finally {
            setIsUpdating(false)
        }
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                title: "Error",
                description: "Las contraseñas nuevas no coinciden",
                variant: "destructive",
            })
            return
        }

        if (passwordData.newPassword.length < 6) {
            toast({
                title: "Error",
                description: "La nueva contraseña debe tener al menos 6 caracteres",
                variant: "destructive",
            })
            return
        }

        setIsChangingPassword(true)

        try {
            const response = await fetch("/api/profile/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                }),
            })

            if (response.ok) {
                toast({
                    title: "Contraseña actualizada",
                    description: "Tu contraseña ha sido cambiada exitosamente",
                })
                setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                })
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Error al cambiar contraseña",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error changing password:", error)
            toast({
                title: "Error",
                description: "Error al cambiar contraseña",
                variant: "destructive",
            })
        } finally {
            setIsChangingPassword(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando perfil...</p>
                </div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Error al cargar perfil</h3>
                    <p className="text-muted-foreground mb-4">
                        {error || "No se pudo cargar la información del usuario"}
                    </p>
                    <Button onClick={fetchProfile} variant="outline">
                        Reintentar
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                <p className="text-muted-foreground">Gestiona tu información personal y configuración de cuenta</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información del usuario */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Información de la cuenta
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Usuario</Label>
                                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{profile.usuario}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                <p className="text-sm">{profile.email || "No especificado"}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Roles</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {profile.roles.map((role, index) => (
                                        <Badge key={index} variant="secondary">
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                                <Badge variant={profile.activo ? "default" : "secondary"}>
                                    {profile.activo ? "Activo" : "Inactivo"}
                                </Badge>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Miembro desde</Label>
                                <p className="text-sm">{new Date(profile.fecha_registro).toLocaleDateString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Formularios */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Actualizar información personal */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Personal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombres">Nombres *</Label>
                                        <Input
                                            id="nombres"
                                            value={profileData.nombres}
                                            onChange={(e) => setProfileData(prev => ({ ...prev, nombres: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apellido_paterno">Apellido Paterno *</Label>
                                        <Input
                                            id="apellido_paterno"
                                            value={profileData.apellido_paterno}
                                            onChange={(e) => setProfileData(prev => ({ ...prev, apellido_paterno: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apellido_materno">Apellido Materno *</Label>
                                        <Input
                                            id="apellido_materno"
                                            value={profileData.apellido_materno}
                                            onChange={(e) => setProfileData(prev => ({ ...prev, apellido_materno: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isUpdating}>
                                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" />
                                    Actualizar Información
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Cambiar contraseña */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Cambiar Contraseña
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">Contraseña Actual *</Label>
                                    <div className="relative">
                                        <Input
                                            id="currentPassword"
                                            type={showCurrentPassword ? "text" : "password"}
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        >
                                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">Nueva Contraseña *</Label>
                                    <div className="relative">
                                        <Input
                                            id="newPassword"
                                            type={showNewPassword ? "text" : "password"}
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                            required
                                            minLength={6}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña *</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <Button type="submit" disabled={isChangingPassword}>
                                    {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Lock className="mr-2 h-4 w-4" />
                                    Cambiar Contraseña
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
