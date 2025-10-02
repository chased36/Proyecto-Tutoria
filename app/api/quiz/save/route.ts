import { NextResponse } from "next/server"
import { saveQuizResult } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("📥 Datos recibidos en /api/quiz/save:", body)

    const { asignaturaId, calificacion, numPreguntas, preguntasCorrectas, respuestas } = body

    // Validar datos requeridos
    if (!asignaturaId) {
      console.error("❌ Error: falta asignaturaId")
      return NextResponse.json({ error: "Se requiere asignaturaId" }, { status: 400 })
    }

    if (typeof calificacion !== "number") {
      console.error("❌ Error: calificacion debe ser un número", typeof calificacion)
      return NextResponse.json({ error: "La calificación debe ser un número" }, { status: 400 })
    }

    if (!numPreguntas || typeof numPreguntas !== "number") {
      console.error("❌ Error: numPreguntas inválido", numPreguntas)
      return NextResponse.json({ error: "numPreguntas debe ser un número" }, { status: 400 })
    }

    if (preguntasCorrectas === undefined || typeof preguntasCorrectas !== "number") {
      console.error("❌ Error: preguntasCorrectas inválido", preguntasCorrectas)
      return NextResponse.json({ error: "preguntasCorrectas debe ser un número" }, { status: 400 })
    }

    if (!Array.isArray(respuestas)) {
      console.error("❌ Error: respuestas debe ser un array", typeof respuestas)
      return NextResponse.json({ error: "respuestas debe ser un array" }, { status: 400 })
    }

    if (respuestas.length === 0) {
      console.error("❌ Error: no hay respuestas para guardar")
      return NextResponse.json({ error: "No hay respuestas para guardar" }, { status: 400 })
    }

    // Validar estructura de cada respuesta
    for (const respuesta of respuestas) {
      if (!respuesta.preguntaId || !respuesta.respuestaSeleccionada || typeof respuesta.esCorrecta !== "boolean") {
        console.error("❌ Error: estructura de respuesta inválida", respuesta)
        return NextResponse.json({ error: "Estructura de respuesta inválida" }, { status: 400 })
      }
    }

    console.log("✅ Validación exitosa, guardando resultado...")

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
    console.error("❌ Error al guardar resultado del examen:", error)

    // Proporcionar más detalles del error
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("Detalles del error:", {
      message: errorMessage,
      stack: errorStack,
    })

    return NextResponse.json(
      {
        error: "Error al guardar el resultado",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
