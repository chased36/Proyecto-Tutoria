// Configuración centralizada para Groq
export const groqConfig = {
  apiHost: process.env.API_HOST,
  apiKey: process.env.KEY,
  model: process.env.MODEL,
}

// Función para validar la configuración
export function validateGroqConfig() {
  const missing = []

  if (!groqConfig.apiHost) missing.push("API_HOST")
  if (!groqConfig.apiKey) missing.push("KEY")
  if (!groqConfig.model) missing.push("MODEL")

  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes para Groq: ${missing.join(", ")}`)
  }

  return true
}

// Función para obtener información de configuración (sin exponer la key)
export function getGroqInfo() {
  return {
    host: groqConfig.apiHost,
    model: groqConfig.model,
    configured: !!(groqConfig.apiHost && groqConfig.apiKey && groqConfig.model),
  }
}
