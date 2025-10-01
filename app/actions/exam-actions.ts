"use server"

import { getSubjectById } from "@/lib/db"
import type { Subject } from "@/lib/db"

export async function getExamDataAction(subjectId: string): Promise<{
  success: boolean
  subject?: Subject
  error?: string
}> {
  try {
    console.log(`Cargando datos del examen para asignatura: ${subjectId}`)

    const subject = await getSubjectById(subjectId)

    if (!subject) {
      return {
        success: false,
        error: "Asignatura no encontrada",
      }
    }

    if (!subject.questions || subject.questions.length === 0) {
      return {
        success: false,
        error: "No hay preguntas disponibles para este examen",
      }
    }

    console.log(`✅ Datos del examen cargados: ${subject.questions.length} preguntas`)

    return {
      success: true,
      subject,
    }
  } catch (error) {
    console.error("Error al cargar datos del examen:", error)
    return {
      success: false,
      error: "Error interno del servidor",
    }
  }
}
