// Configuración del servicio de email
const EMAIL_API_URL = process.env.EMAIL_API_URL || "https://smtp.maileroo.com/send"
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || "10bd9d8dd6176faf1db4268086623b7571a43a496cee700a2fd5fba72c81fc82"

console.log("🔧 Configuración del servicio de email:")
console.log("- EMAIL_API_URL:", EMAIL_API_URL)
console.log("- EMAIL_API_KEY:", EMAIL_API_KEY ? "✅ Definida" : "❌ No definida")

interface CredentialsEmailData {
  nombreCompleto: string
  usuario: string
  password: string
  email: string
  esTemporal?: boolean
}

export async function enviarCredencialesProfesor(data: CredentialsEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { nombreCompleto, usuario, password, email } = data

    const subject = `Credenciales de acceso - Sistema Escolar`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Credenciales de Acceso</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0; }
          .credential-item { margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { font-family: monospace; background-color: #f1f5f9; padding: 8px; border-radius: 4px; margin-left: 10px; }
          .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sistema Escolar</h1>
            <p>Credenciales de Acceso</p>
          </div>
          
          <div class="content">
            <h2>Hola ${nombreCompleto}</h2>
            <p>Te damos la bienvenida al Sistema Escolar. A continuación encontrarás tus credenciales de acceso:</p>
            
            <div class="credentials">
              <div class="credential-item">
                <span class="label">Usuario:</span>
                <span class="value">${usuario}</span>
              </div>
              <div class="credential-item">
                <span class="label">Contraseña:</span>
                <span class="value">${password}</span>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Importante:</strong> Esta es una contraseña temporal. Te recomendamos cambiar tu contraseña en tu primer acceso al sistema por motivos de seguridad.
            </div>

            <p><strong>Instrucciones:</strong></p>
            <ul>
              <li>Utiliza estas credenciales para acceder al sistema</li>
              <li>Mantén esta información en un lugar seguro</li>
              <li>No compartas tus credenciales con otros usuarios</li>
              <li>Cambia tu contraseña en tu primer acceso</li>
            </ul>

            <p>Si tienes alguna pregunta o necesitas asistencia, no dudes en contactar al administrador del sistema.</p>
          </div>
          
          <div class="footer">
            <p>Este es un mensaje automático del Sistema Escolar. Por favor, no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const form = new FormData()
    form.append('from', 'Sistema Escolar <sistema@3247def9e3910d36.maileroo.org>')
    form.append('to', email)
    form.append('subject', subject)
    form.append('html', html)

    console.log('Enviando email a:', email)
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
        console.log('Email enviado exitosamente')
        return { success: true }
      } else {
        const errorText = await response.text()
        console.error('Error al enviar credenciales:', response.status, errorText)
        return { success: false, error: `Error ${response.status}: ${errorText}` }
      }
    } catch (error) {
      console.error('Error de conexión:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Error de conexión' }
    }

  } catch (error) {
    console.error('Error en enviarCredencialesProfesor:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}
