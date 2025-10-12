"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  Home,
  LogOut,
  Settings,
  User,
  BarChart3,
  Search,
  School,
  GraduationCap,
  Users,
  BookMarked,
  FileText,
  ChevronDown,
  PlusCircle,
  ChevronRight,
  Award,
  Clock,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"
import TrimestreSelector from "@/components/ui/trimestre-selector"
import GestionSelectorGlobal from "@/components/ui/gestion-selector-global"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface TeacherLayoutProps {
  children: React.ReactNode
}



export function TeacherLayout({ children }: TeacherLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [aulas, setAulas] = useState<{ id: number; nombre: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  useEffect(() => {


    // Cargar aulas del profesor
    const fetchAulas = async () => {
      if (user?.roles.includes("PROFESOR")) {
        try {
          const response = await fetch("/api/aulas")
          if (response.ok) {
            const data = await response.json()
            setAulas(
              data.map((aula: any) => ({
                id: aula.id,
                nombre: aula.nombre_aula,
              })),
            )
          }
        } catch (error) {
          console.error("Error al cargar aulas:", error)
        }
      }
      setIsLoading(false)
    }

    fetchAulas()
  }, [user])

  useEffect(() => {
    // Cuando cambia la ruta, limpiar el estado pendiente para reflejar la ruta actual
    setPendingPath(null)
  }, [pathname])

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.nombre_completo) return "U"
    return user.nombre_completo
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }


  const helpTopics = [
    {
      title: "Primeros pasos",
      items: [
        { title: "Cómo registrar asistencia", href: "/ayuda/asistencia" },
        { title: "Cómo ingresar notas", href: "/ayuda/notas" },
        ...(user?.roles.includes("ADMIN") ? [{ title: "Cómo centralizar notas", href: "/ayuda/admin/central" }] : []),
      ],
    },
    {
      title: "Gestión de aulas",
      items: [
        { title: "Gestionar estudiantes", href: "/ayuda/aulas/estudiantes" },
        { title: "Reportes y estadísticas", href: "/ayuda/aulas/reportes" },
        ...(user?.roles.includes("ADMIN") ? [{ title: "Asignar aulas a profesores", href: "/ayuda/admin/asignar-aulas" }] : []),
      ],
    },
  ]

  const isAdmin = user?.roles.includes("ADMIN")
  const isProfesor = user?.roles.includes("PROFESOR")

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full !max-w-none">
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2 px-2">
              <School className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">SisAcadémico</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <SidebarInput placeholder="Buscar..." className="pl-9" onClick={() => setSearchOpen(true)} readOnly />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                    <Link href="/dashboard">
                      <Home className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            {isProfesor && (
              <SidebarGroup>
                <SidebarGroupLabel>Académico</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <Collapsible className="w-full" defaultOpen={pathname.startsWith("/aulas")}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger className="w-full" asChild>
                          <SidebarMenuButton asChild tooltip="Aulas" isActive={pendingPath ? pendingPath.startsWith("/aulas") : pathname.startsWith("/aulas")}>
                            <Link href="/aulas" onClick={(e) => { e.preventDefault(); setPendingPath("/aulas"); router.push("/aulas"); }}>
                              <BookOpen className="h-4 w-4" />
                              <span>Mis Aulas</span>
                              <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </Link>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {aulas.length > 0 && (
                          <SidebarMenuBadge className="bg-primary/10 text-primary">{aulas.length}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pendingPath ? pendingPath === "/aulas" : pathname === "/aulas"}>
                              <Link href="/aulas" onClick={(e) => { e.preventDefault(); setPendingPath("/aulas"); router.push("/aulas"); }}>
                                <span>Todas las aulas</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {isLoading ? (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton>
                                <span>Cargando aulas...</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ) : (
                            <>
                              {aulas.slice(0, 3).map((aula) => (
                                <SidebarMenuSubItem key={aula.id}>
                                  <SidebarMenuSubButton asChild isActive={pendingPath ? pendingPath === `/aulas/${aula.id}` : pathname === `/aulas/${aula.id}`}>
                                    <Link href={`/aulas/${aula.id}`} onClick={(e) => { e.preventDefault(); setPendingPath(`/aulas/${aula.id}`); router.push(`/aulas/${aula.id}`); }}>
                                      <span>{aula.nombre}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}

                              {aulas.length > 3 && (
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild size="sm" isActive={pendingPath ? pendingPath === "/aulas" : pathname === "/aulas"}>
                                    <Link href="/aulas" onClick={(e) => { e.preventDefault(); setPendingPath("/aulas"); router.push("/aulas"); }}>
                                      <PlusCircle className="h-3 w-3 mr-1" />
                                      <span>Ver todas ({aulas.length})</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )}
                            </>
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>




                    {/* <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith("/horario")} tooltip="Mi Horario">
                        <Link href="/horario">
                          <Calendar className="h-4 w-4" />
                          <span>Mi Horario</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem> */}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isProfesor && (
              <SidebarGroup>
                <SidebarGroupLabel>Reportes</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Reportes">
                          <FileText className="h-4 w-4" />
                          <span>Reportes</span>
                          <ChevronRight className="ml-auto h-4 w-4" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname === "/reportes"}>
                              <Link href="/reportes">
                                <BarChart3 className="h-4 w-4" />
                                <span>Reporte General</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname === "/reportes/mejores-estudiantes"}>
                              <Link href="/reportes/mejores-estudiantes">
                                <Award className="h-4 w-4" />
                                <span>Mejores Estudiantes</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname === "/reportes/asistencia"}>
                              <Link href="/reportes/asistencia">
                                <Clock className="h-4 w-4" />
                                <span>Control de Asistencia</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Administración</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/colegios")} tooltip="Colegios">
                        <Link href="/admin/colegios">
                          <School className="h-4 w-4" />
                          <span>Colegios</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith("/admin/profesores")}
                        tooltip="Usuarios"
                      >
                        <Link href="/admin/profesores">
                          <GraduationCap className="h-4 w-4" />
                          <span>Usuarios</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith("/admin/asignacion-docentes")}
                        tooltip="Asignación de docentes"
                      >
                        <Link href="/admin/asignacion-docentes">
                          <Users className="h-4 w-4" />
                          <span>Asignación de docentes</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/materias")} tooltip="Materias">
                        <Link href="/admin/materias">
                          <BookMarked className="h-4 w-4" />
                          <span>Materias</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith("/admin/asignacion-estudiantes")}
                        tooltip="Asignación de estudiantes"
                      >
                        <Link href="/admin/asignacion-estudiantes">
                          <Users className="h-4 w-4" />
                          <span>Asignación de estudiantes</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>



                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/gestiones")} tooltip="Gestiones">
                        <Link href="/admin/gestiones">
                          <Calendar className="h-4 w-4" />
                          <span>Gestiones</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/central")} tooltip="Central de Notas">
                        <Link href="/admin/central">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>Central de Notas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={pathname.startsWith("/admin/reportes")}
                            tooltip="Reportes administrativos"
                          >
                            <BarChart3 className="h-4 w-4" />
                            <span>Reportes</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href="/admin/reportes/mejores-estudiantes">
                                  <Award className="h-4 w-4" />
                                  <span>Mejores Estudiantes</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href="/admin/reportes/asistencia-general">
                                  <Clock className="h-4 w-4" />
                                  <span>Asistencia General</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href="/admin/reportes/rendimiento-materias">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>Rendimiento por Materias</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <Link href="/admin/reportes/estadisticas-generales">
                                  <BarChart3 className="h-4 w-4" />
                                  <span>Estadísticas Generales</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t p-3">
            {/* User Profile Section */}
            <div className="mb-3">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto p-3 hover:bg-muted/50 rounded-lg"
                onClick={() => router.push("/perfil")}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="text-sm font-medium truncate w-full">{user?.nombre_completo}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">{user?.usuario}</span>
                </div>
              </Button>
            </div>

            {/* Controls Section */}
            <div className="px-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden w-full !max-w-none">
          <header className="h-14 border-b flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background z-10 w-full">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden md:flex items-center gap-2">
                <nav className="flex items-center gap-1 text-sm">
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                    Dashboard
                  </Link>
                  {pathname !== "/dashboard" && (
                    <>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {pathname.startsWith("/aulas")
                          ? "Mis Aulas"
                          : pathname.startsWith("/admin/central")
                            ? "Central de Notas"
                            : pathname.startsWith("/horario")
                              ? "Mi Horario"
                              : pathname.startsWith("/reportes")
                                ? "Reportes"
                                : ""}
                      </span>
                    </>
                  )}
                </nav>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Selectores globales (solo ADMIN) - COMENTADO */}
              {/* {isAdmin && (
                <div className="flex items-center gap-2 mr-2">
                  <GestionSelectorGlobal variant="compact" showLabel={false} />
                  <TrimestreSelector variant="compact" showLabel={false} />
                </div>
              )} */}

              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.nombre_completo}</p>
                      <p className="text-xs text-muted-foreground">{user?.usuario}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/perfil" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Mi perfil
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/configuracion" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuración
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto !w-full !max-w-none p-4 md:p-6">
            <Suspense fallback={<div className="flex items-center justify-center py-10 text-muted-foreground">Cargando…</div>}>
              {children}
            </Suspense>
          </main>

          {/* Search dialog */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverContent className="w-screen max-w-lg p-0 border-none shadow-lg" align="center" sideOffset={10}>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Buscar aulas, estudiantes, reportes..." />
                <CommandList>
                  <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                  <CommandGroup heading="Aulas">
                    {aulas.slice(0, 5).map((aula) => (
                      <CommandItem
                        key={aula.id}
                        onSelect={() => {
                          setPendingPath(`/aulas/${aula.id}`)
                          router.push(`/aulas/${aula.id}`)
                          setSearchOpen(false)
                        }}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>{aula.nombre}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Help dialog */}
          <Popover open={helpOpen} onOpenChange={setHelpOpen}>
            <PopoverContent className="w-80 p-0" align="end" side="left">
              <div className="p-3 border-b">
                <h3 className="font-medium">Centro de ayuda</h3>
              </div>
              <div className="p-4 max-h-96 overflow-auto">
                {helpTopics.map((topic, i) => (
                  <div key={i} className="mb-4">
                    <h4 className="font-medium mb-2">{topic.title}</h4>
                    <ul className="space-y-1">
                      {topic.items.map((item, j) => (
                        <li key={j}>
                          <Link
                            href={item.href}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center"
                          >
                            <ChevronRight className="h-3 w-3 mr-1 text-primary" />
                            {item.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </SidebarProvider>
  )
}
