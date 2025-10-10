"use server"

import { getSubjectById, getSemesterById, getCarreraNameById, type Subject } from "@/lib/db"

export async function getSubjectDataAction(subjectId: string): Promise<{
  success: boolean
  subject: Subject | null
  semesterName: string | null
  semesterId: string | null
  carreraName: string | null
  carreraId: string | null
  error?: string
}> {
  try {
    console.log(`[Server Action] Buscando datos para asignatura ID: ${subjectId}`)
    const subject = await getSubjectById(subjectId)

    if (!subject) {
      console.log(`[Server Action] Asignatura con ID ${subjectId} no encontrada.`)
      return {
        success: false,
        subject: null,
        semesterName: null,
        semesterId: null,
        carreraName: null,
        carreraId: null,
        error: "Asignatura no encontrada",
      }
    }

    const semester = await getSemesterById(subject.semestre_id)

    if (!semester) {
      console.log(`[Server Action] Semestre con ID ${subject.semestre_id} no encontrado.`)
      return {
        success: false,
        subject: null,
        semesterName: null,
        semesterId: null,
        carreraName: null,
        carreraId: null,
        error: "Semestre no encontrado",
      }
    }

    const carreraName = await getCarreraNameById(semester.carrera_id)

    console.log(
      `[Server Action] Datos obtenidos - Asignatura: ${subject.name}, Semestre: ${semester.name}, Carrera: ${carreraName}`,
    )

    return {
      success: true,
      subject,
      semesterName: semester.name,
      semesterId: semester.id,
      carreraName,
      carreraId: semester.carrera_id,
    }
  } catch (error) {
    console.error(`[Server Action] Error al obtener datos de asignatura ${subjectId}:`, error)
    return {
      success: false,
      subject: null,
      semesterName: null,
      semesterId: null,
      carreraName: null,
      carreraId: null,
      error: `Error al cargar datos: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}
