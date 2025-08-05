import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.id

    // Consultar acciones rápidas personalizadas de la base de datos
    const quickActionsQuery = await db.query(
      `
      SELECT qa.id, qa.etiqueta as label, qa.icono as icon, qa.url as href
      FROM acciones_rapidas qa
      WHERE qa.id_usuario = ?
      ORDER BY qa.orden
      LIMIT 4
    `,
      [userId],
    )

    // Si no hay acciones rápidas en la base de datos, devolver acciones predeterminadas
    if (!quickActionsQuery || quickActionsQuery.length === 0) {
      return NextResponse.json([
        { id: 1, label: "Registrar asistencia", icon: "Clock", href: "/asistencia/registrar" },
        { id: 2, label: "Ingresar notas", icon: "ClipboardList", href: "/notas/ingresar" },
        { id: 3, label: "Ver horario de hoy", icon: "Calendar", href: "/horario" },
        { id: 4, label: "Centralizar notas", icon: "FileSpreadsheet", href: "/admin/central" },
      ])
    }

    // Mapear los iconos de texto a nombres de componentes
    const iconMapping: Record<string, string> = {
      clock: "Clock",
      "clipboard-list": "ClipboardList",
      calendar: "Calendar",
      "file-spreadsheet": "FileSpreadsheet",
      users: "Users",
      "book-open": "BookOpen",
      "file-text": "FileText",
      "bar-chart-3": "BarChart3",
    }

    // Mapear los resultados para asegurar que el campo 'icon' sea el nombre del componente
    const quickActions = quickActionsQuery.map((action) => ({
      ...action,
      icon: iconMapping[action.icon] || "FileText",
    }))

    return NextResponse.json(quickActions)
  } catch (error) {
    console.error("Error al obtener acciones rápidas:", error)

    // En caso de error, devolver acciones predeterminadas
    return NextResponse.json([
      { id: 1, label: "Registrar asistencia", icon: "Clock", href: "/asistencia/registrar" },
      { id: 2, label: "Ingresar notas", icon: "ClipboardList", href: "/notas/ingresar" },
      { id: 3, label: "Ver horario de hoy", icon: "Calendar", href: "/horario" },
      { id: 4, label: "Centralizar notas", icon: "FileSpreadsheet", href: "/admin/central" },
    ])
  }
}
