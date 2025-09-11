"use server"

import { revalidatePath } from "next/cache"
import {
  getSemesters,
  createSemester,
  deleteSemester,
  getSubjectsBySemester,
  createSubject,
  updateSubject,
  deleteSubject,
  createPDF,
  createVideo,
  createQuestion,
  type Semester,
  type Subject,
} from "@/lib/db"
import { uploadMultiplePDFs } from "@/lib/blob"
import { enqueueEmbeddingGeneration } from "./enqueue-embeddings"

export async function getSemestersAction(): Promise<Semester[]> {
  return await getSemesters()
}

export async function createSemesterAction(
  name: string,
): Promise<{ success: boolean; semester?: Semester; error?: string }> {
  try {
    if (!name.trim()) {
      return { success: false, error: "El nombre del semestre es requerido" }
    }

    const semester = await createSemester(name.trim())
    revalidatePath("/admin/semestres")
    return { success: true, semester }
  } catch (error) {
    console.error("Error creating semester:", error)
    return { success: false, error: "Error al crear el semestre" }
  }
}

export async function deleteSemesterAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Eliminando semestre con ID:", id)
    await deleteSemester(id)
    console.log("Semestre eliminado exitosamente")
    revalidatePath("/admin/semestres")
    return { success: true }
  } catch (error) {
    console.error("Error deleting semester:", error)
    return {
      success: false,
      error: `Error al eliminar el semestre: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}

export async function getSubjectsBySemesterAction(semesterId: string): Promise<Subject[]> {
  return await getSubjectsBySemester(semesterId)
}

export async function createSubjectWithFilesAction(
  formData: FormData,
): Promise<{ success: boolean; subject?: Subject; error?: string }> {
  try {
    console.log("=== Iniciando creación de asignatura con archivos (ASÍNCRONO) ===")

    const name = formData.get("name") as string
    const semesterId = formData.get("semesterId") as string

    if (!name?.trim()) {
      return { success: false, error: "El nombre de la asignatura es requerido" }
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN no está disponible")
      return { success: false, error: "Configuración de almacenamiento no disponible. Contacta al administrador." }
    }

    const pdfFiles: File[] = []
    const fileEntries = formData.getAll("pdfs")

    for (const entry of fileEntries) {
      if (entry instanceof File && entry.size > 0) {
        if (entry.size > 5 * 1024 * 1024) {
          return { success: false, error: `El archivo ${entry.name} excede el límite de 5MB` }
        }
        pdfFiles.push(entry)
      }
    }

    const youtubeLinks: string[] = []
    let linkIndex = 0
    while (formData.has(`youtubeLink_${linkIndex}`)) {
      const link = formData.get(`youtubeLink_${linkIndex}`) as string
      if (link?.trim()) {
        youtubeLinks.push(link.trim())
      }
      linkIndex++
    }

    const questions: { question: string; correctAnswer: string; wrongAnswers: string[] }[] = []
    let questionIndex = 0
    while (formData.has(`question_${questionIndex}`)) {
      const question = formData.get(`question_${questionIndex}`) as string
      const correctAnswer = formData.get(`correctAnswer_${questionIndex}`) as string
      const wrongAnswers: string[] = []

      for (let i = 0; i < 3; i++) {
        const wrongAnswer = formData.get(`wrongAnswer_${questionIndex}_${i}`) as string
        if (wrongAnswer?.trim()) {
          wrongAnswers.push(wrongAnswer.trim())
        }
      }

      if (question?.trim() && correctAnswer?.trim() && wrongAnswers.length === 3) {
        questions.push({
          question: question.trim(),
          correctAnswer: correctAnswer.trim(),
          wrongAnswers,
        })
      }
      questionIndex++
    }

    console.log("Creando asignatura en la base de datos...")
    const subject = await createSubject(name.trim(), semesterId)
    console.log("Asignatura creada con ID:", subject.id)

    if (pdfFiles.length > 0) {
      console.log("Subiendo PDFs a Vercel Blob...")
      try {
        const uploadedPDFsData = await uploadMultiplePDFs(pdfFiles)
        console.log("PDFs subidos exitosamente:", uploadedPDFsData.length)

        for (const pdf of uploadedPDFsData) {
          const { task } = await createPDF(pdf.filename, pdf.url, subject.id)
          console.log(`✅ PDF ${pdf.filename} guardado y tarea ${task.id} creada`)

          await enqueueEmbeddingGeneration(task.id)
          console.log(`📞 Worker notificado para procesar la tarea ${task.id}`)
        }

        console.log("🔄 Los embeddings se procesarán automáticamente en segundo plano")
      } catch (uploadError) {
        console.error("Error específico durante el procesamiento de PDFs:", uploadError)
        await deleteSubject(subject.id)
        return {
          success: false,
          error: `Error al procesar archivos PDF: ${uploadError instanceof Error ? uploadError.message : "Error desconocido"}`,
        }
      }
    }

    for (const url of youtubeLinks) {
      const title = `Video - ${url.split("/").pop() || "YouTube"}`
      await createVideo(title, url, subject.id)
    }

    for (const q of questions) {
      await createQuestion(q.question, q.correctAnswer, q.wrongAnswers, subject.id)
    }
    console.log("=== Asignatura creada exitosamente (embeddings en proceso) ===")
    revalidatePath("/admin/semestres")
    return {
      success: true,
      subject,
    }
  } catch (error) {
    console.error("Error creating subject:", error)
    return {
      success: false,
      error: `Error al crear la asignatura: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}

export async function updateSubjectAction(id: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!name.trim()) {
      return { success: false, error: "El nombre de la asignatura es requerido" }
    }

    await updateSubject(id, name.trim())
    revalidatePath("/admin/semestres")
    return { success: true }
  } catch (error) {
    console.error("Error updating subject:", error)
    return { success: false, error: "Error al actualizar la asignatura" }
  }
}

export async function deleteSubjectAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Eliminando asignatura con ID:", id)
    await deleteSubject(id)
    console.log("Asignatura eliminada exitosamente")
    revalidatePath("/admin/semestres")
    return { success: true }
  } catch (error) {
    console.error("Error deleting subject:", error)
    return {
      success: false,
      error: `Error al eliminar la asignatura: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}
