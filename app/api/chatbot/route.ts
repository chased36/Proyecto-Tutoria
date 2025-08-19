import { type NextRequest, NextResponse } from "next/server"
import { streamText } from "ai" // Importar streamText del AI SDK
import { groq } from "@ai-sdk/groq" // Importar groq del AI SDK Groq provider
import type { CoreMessage } from "ai" // Importar CoreMessage para tipado

// Permitir respuestas hasta 5 minutos (para evitar timeouts en respuestas largas)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  console.log("🚀 Iniciando request al chatbot (AI SDK Groq)...")

  try {
    // Obtener el cuerpo completo de la solicitud
    const requestBody = await request.json()
    console.log("Incoming request body:", JSON.stringify(requestBody, null, 2))

    // Extraer 'messages' y 'subjectId' del cuerpo de la solicitud
    // Asegurarse de que 'messages' sea un array, si no, usar un array vacío
    const messages: CoreMessage[] = Array.isArray(requestBody.messages) ? requestBody.messages : []
    const subjectId: string | undefined = requestBody.subjectId // Capturar subjectId si se envía

    // Si 'messages' no es un array válido, devolver un error 400
    if (!Array.isArray(messages)) {
      console.error("❌ 'messages' no es un array o está ausente en el cuerpo de la solicitud.")
      return NextResponse.json(
        { success: false, error: "Formato de solicitud inválido: 'messages' es requerido y debe ser un array." },
        { status: 400 },
      )
    }

    // Configuración de Groq desde variables de entorno
    const apiKey = process.env.KEY || process.env.GROQ_API_KEY // Usar KEY o GROQ_API_KEY
    const model = process.env.MODEL || "llama3-70b-8192"

    if (!apiKey) {
      console.error("❌ GROQ_API_KEY o KEY no está configurada")
      return NextResponse.json(
        { success: false, error: "API Key de Groq no configurada. Contacta al administrador." },
        { status: 500 },
      )
    }

    console.log("🤖 Configuración de Groq (AI SDK):")
    console.log("🧠 Modelo:", model)
    console.log("🔑 API Key configurada:", !!apiKey)
    console.log("🔑 API Key preview:", apiKey.substring(0, 10) + "...")
    console.log("Subject ID recibido:", subjectId || "N/A") // Log subjectId para depuración

    // Prompt del sistema
    const systemPrompt: CoreMessage = {
      role: "system",
      content: `Eres un asistente educativo amigable y útil. Responde a las preguntas de los usuarios de manera concisa y clara, siempre en español. No tienes acceso a documentos específicos ni a información de asignaturas, así que responde de forma general.`,
    }

    // Prepend the system prompt to the messages array
    const messagesWithSystemPrompt = [systemPrompt, ...messages]

    // Usar streamText del AI SDK
    const result = streamText({
      model: groq(model), // Usar el modelo de Groq del AI SDK
      messages: messagesWithSystemPrompt,
      maxTokens: 400, // Mantener un límite razonable
      temperature: 0.7, // Mantener una temperatura para respuestas variadas
    })

    console.log("✅ Stream de Groq iniciado.")

    // Devolver el stream de texto directamente al cliente
    return result.toDataStreamResponse()
  } catch (error) {
    console.error("❌ Error general en chatbot:", error)

    // Respuesta de error simplificada para el cliente
    return NextResponse.json(
      {
        success: false,
        error: `Lo siento, estoy experimentando dificultades técnicas en este momento. (${
          error instanceof Error ? error.message : "Error desconocido"
        })`,
      },
      { status: 500 },
    )
  }
}
