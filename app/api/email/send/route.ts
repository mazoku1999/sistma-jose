import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-server-session"

// Configuración del servicio de email
const EMAIL_API_URL = "https://smtp.maileroo.com/send"
const EMAIL_API_KEY = "10bd9d8dd6176faf1db4268086623b7571a43a496cee700a2fd5fba72c81fc82"

console.log("🔧 Configuración del servicio de email:")
console.log("- EMAIL_API_URL:", EMAIL_API_URL)
console.log("- EMAIL_API_KEY:", EMAIL_API_KEY ? "✅ Definida" : "❌ No definida")

export async function POST(request: Request) {
    try {
        const session = await getServerSession()

        if (!session || !session.user.roles.includes("ADMIN")) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const body = await request.json()
        const { to, subject, html, from = 'sistema@colegio.edu' } = body

        if (!to || !subject || !html) {
            return NextResponse.json({
                error: "Los campos 'to', 'subject' y 'html' son requeridos"
            }, { status: 400 })
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(to)) {
            return NextResponse.json({
                error: "El formato del email de destino no es válido"
            }, { status: 400 })
        }

        const form = new FormData()
        form.append('from', from.includes('@') ? from : `Sistema Escolar <${from}@3247def9e3910d36.maileroo.org>`)
        form.append('to', to)
        form.append('subject', subject)
        form.append('html', html)

        console.log('Enviando email a:', to)
        console.log('Usando URL:', EMAIL_API_URL)

        try {
            const response = await fetch(EMAIL_API_URL, {
                method: 'POST',
                headers: {
                    'X-API-Key': EMAIL_API_KEY
                },
                body: form
            })

            if (response.ok) {
                const result = await response.json()
                console.log('Email enviado exitosamente')
                return NextResponse.json({
                    success: true,
                    message: "Correo enviado exitosamente",
                    data: result
                })
            } else {
                const errorText = await response.text()
                console.error('Error al enviar correo:', response.status, errorText)
                return NextResponse.json({
                    error: `Error al enviar correo: ${response.status} - ${errorText}`
                }, { status: 500 })
            }
        } catch (error) {
            console.error('Error de conexión:', error)
            return NextResponse.json({
                error: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
            }, { status: 500 })
        }

    } catch (error) {
        console.error("Error en el endpoint de email:", error)
        return NextResponse.json({
            error: "Error interno del servidor"
        }, { status: 500 })
    }
}
