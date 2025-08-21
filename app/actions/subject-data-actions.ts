"use server"

import { getSubjectById, getSemesterNameById, type Subject } from "@/lib/db"

export async function getSubjectDataAction(
  subjectId: string,
): Promise<{ success: boolean; subject: Subject | null; semesterName: string | null; error?: string }> {
  try {
    console.log(`[Server Action] Buscando datos para asignatura ID: ${subjectId}`)
    const subject = await getSubjectById(subjectId)

    if (!subject) {
      console.log(`[Server Action] Asignatura con ID ${subjectId} no encontrada.`)
      return { success: false, subject: null, semesterName: null, error: "Asignatura no encontrada" }
    }

    const semesterName = await getSemesterNameById(subject.semestre_id)
    console.log(`[Server Action] Datos de asignatura y semestre obtenidos para ${subject.name}`)

    return { success: true, subject, semesterName }
  } catch (error) {
    console.error(`[Server Action] Error al obtener datos de asignatura ${subjectId}:`, error)
    return {
      success: false,
      subject: null,
      semesterName: null,
      error: `Error al cargar datos: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}
