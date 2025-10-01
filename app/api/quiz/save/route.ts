import { type NextRequest, NextResponse } from "next/server"
import { saveQuizResult } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asignaturaId, calificacion, numPreguntas, preguntasCorrectas, respuestas } = body

    // Validar datos requeridos
    if (
      !asignaturaId ||
      typeof calificacion !== "number" ||
      !numPreguntas ||
      !preguntasCorrectas ||
      !Array.isArray(respuestas)
    ) {
      return NextResponse.json({ error: "Datos incompletos o inválidos" }, { status: 400 })
    }

    // Guardar el resultado en la base de datos
    const resultado = await saveQuizResult(asignaturaId, calificacion, numPreguntas, preguntasCorrectas, respuestas)

    console.log(
      `✅ Resultado de examen guardado: ${preguntasCorrectas}/${numPreguntas} (${calificacion.toFixed(1)}/10)`,
    )

    return NextResponse.json({
      success: true,
      resultado,
    })
  } catch (error) {
    console.error("Error al guardar resultado del examen:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
