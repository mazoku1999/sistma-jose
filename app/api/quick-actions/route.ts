import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es profesor o admin para mostrar acciones apropiadas
    const userId = session.user.id
    const userRole = session.user.role

    let quickActions = []

    if (userRole === 'PROFESOR') {
      // Acciones para profesores
      quickActions = [
        { id: 1, label: "Mis aulas", icon: "BookOpen", href: "/aulas" },
        { id: 2, label: "Ingresar notas", icon: "ClipboardList", href: "/mis-notas" },
        { id: 3, label: "Registrar asistencia", icon: "Clock", href: "/asistencia" },
        { id: 4, label: "Ver horario", icon: "Calendar", href: "/horario" },
      ]
    } else if (userRole === 'ADMIN') {
      // Acciones para administradores
      quickActions = [
        { id: 1, label: "Gestionar aulas", icon: "BookOpen", href: "/admin/aulas" },
        { id: 2, label: "Gestionar profesores", icon: "Users", href: "/admin/profesores" },
        { id: 3, label: "Centralizar notas", icon: "FileSpreadsheet", href: "/admin/central" },
        { id: 4, label: "Dashboard", icon: "BarChart3", href: "/dashboard" },
      ]
    } else {
      // Acciones predeterminadas para otros roles
      quickActions = [
        { id: 1, label: "Mis notas", icon: "ClipboardList", href: "/mis-notas" },
        { id: 2, label: "Mi horario", icon: "Calendar", href: "/horario" },
        { id: 3, label: "Notificaciones", icon: "Bell", href: "/notificaciones" },
        { id: 4, label: "Dashboard", icon: "BarChart3", href: "/dashboard" },
      ]
    }

    return NextResponse.json(quickActions)
  } catch (error) {
    console.error("Error al obtener acciones rápidas:", error)

    // En caso de error, devolver acciones básicas
    return NextResponse.json([
      { id: 1, label: "Dashboard", icon: "BarChart3", href: "/dashboard" },
      { id: 2, label: "Mis aulas", icon: "BookOpen", href: "/aulas" },
      { id: 3, label: "Notificaciones", icon: "Bell", href: "/notificaciones" },
      { id: 4, label: "Perfil", icon: "User", href: "/perfil" },
    ])
  }
}
