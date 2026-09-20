"use server"

import { revalidatePath } from "next/cache"
import {
  getCarreras,
  createCarrera,
  updateCarrera,
  deleteCarrera,
  getSemesters,
  getSemestersByCarrera,
  createSemester,
  deleteSemester,
  getSubjectsBySemester,
  createSubject,
  updateSubject,
  deleteSubject,
  createPDF,
  createVideo,
  createQuestion,
  type Carrera,
  type Semester,
  type Subject,
} from "@/lib/db"
import { deleteMultiplePDFsFromBlob } from "@/lib/blob"
import { enqueueEmbeddingGeneration } from "./enqueue-embeddings"

export async function getCarrerasAction(): Promise<Carrera[]> {
  return await getCarreras()
}

export async function createCarreraAction(
  name: string,
): Promise<{ success: boolean; carrera?: Carrera; error?: string }> {
  try {
    if (!name.trim()) {
      return { success: false, error: "El nombre de la carrera es requerido" }
    }

    const carrera = await createCarrera(name.trim())
    revalidatePath("/admin/semestres")
    revalidatePath("/")
    return { success: true, carrera }
  } catch (error) {
    console.error("Error creating carrera:", error)
    return { success: false, error: "Error al crear la carrera" }
  }
}

export async function updateCarreraAction(
  id: string,
  name: string,
): Promise<{ success: boolean; carrera?: Carrera; error?: string }> {
  try {
    if (!name.trim()) {
      return { success: false, error: "El nombre de la carrera es requerido" }
    }

    const carrera = await updateCarrera(id, name.trim())
    revalidatePath("/admin/semestres")
    revalidatePath("/")
    return { success: true, carrera }
  } catch (error) {
    console.error("Error updating carrera:", error)
    return { success: false, error: "Error al actualizar la carrera" }
  }
}

export async function deleteCarreraAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Eliminando carrera con ID:", id)
    await deleteCarrera(id)
    console.log("Carrera eliminada exitosamente")
    revalidatePath("/admin/semestres")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting carrera:", error)
    return {
      success: false,
      error: `Error al eliminar la carrera: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}

export async function getSemestersByCarreraAction(carreraId: string): Promise<Semester[]> {
  return await getSemestersByCarrera(carreraId)
}

export async function getSemestersAction(): Promise<Semester[]> {
  return await getSemesters()
}

export async function createSemesterAction(
  name: string,
  carreraId: string,
): Promise<{ success: boolean; semester?: Semester; error?: string }> {
  try {
    if (!name.trim()) {
      return { success: false, error: "El nombre del semestre es requerido" }
    }

    if (!carreraId) {
      return { success: false, error: "La carrera es requerida" }
    }

    const semester = await createSemester(name.trim(), carreraId)
    revalidatePath("/admin/semestres")
    revalidatePath("/")
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
    revalidatePath("/")
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

    const uploadedPdfsRaw = formData.get("uploadedPDFs") as string | null
    const uploadedPDFsData: { filename: string; url: string }[] = uploadedPdfsRaw
      ? JSON.parse(uploadedPdfsRaw)
      : []

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

    if (uploadedPDFsData.length > 0) {
      try {
        for (const pdf of uploadedPDFsData) {
          const { task } = await createPDF(pdf.filename, pdf.url, subject.id)
          console.log(`PDF ${pdf.filename} guardado y tarea ${task.id} creada`)

          await enqueueEmbeddingGeneration(task.id)
          console.log(`Worker notificado para procesar la tarea ${task.id}`)
        }

        console.log("Los embeddings se procesarán automáticamente en segundo plano")
      } catch (dbError) {
        console.error("Error al registrar PDFs en base de datos:", dbError)
        await deleteMultiplePDFsFromBlob(uploadedPDFsData.map((p) => p.url))
        await deleteSubject(subject.id)
        return {
          success: false,
          error: `Error al registrar archivos PDF: ${dbError instanceof Error ? dbError.message : "Error desconocido"}`,
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

    revalidatePath("/admin/semestres")
    revalidatePath("/")
    return { success: true, subject }
  } catch (error) {
    console.error("Error creating subject with files:", error)
    return {
      success: false,
      error: `Error al crear la asignatura: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}

export async function updateSubjectAction(
  id: string,
  name: string,
): Promise<{ success: boolean; subject?: Subject; error?: string }> {
  try {
    if (!name.trim()) {
      return { success: false, error: "El nombre de la asignatura es requerido" }
    }

    const subject = await updateSubject(id, name.trim())
    revalidatePath("/admin/semestres")
    revalidatePath("/")
    return { success: true, subject }
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
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting subject:", error)
    return {
      success: false,
      error: `Error al eliminar la asignatura: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}
