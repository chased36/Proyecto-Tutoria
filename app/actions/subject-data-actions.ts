"use server"

import { getSubjectById, getSemesterNameById, type Subject, insertPdfChunks } from "@/lib/db"
import { head } from "@vercel/blob";

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

export async function processAndStoreEmbeddingsAction(
  pdfId: string,
  asignaturaId: string,
  embeddingsUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🧠 Iniciando ingestión para PDF ${pdfId} desde ${embeddingsUrl}`);

    await head(embeddingsUrl);

    const response = await fetch(embeddingsUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar el archivo de embeddings: ${response.statusText}`);
    }
    const data: { total_chunks: number; embeddings: number[][]; chunks_text: string[] } = await response.json();

    const chunksToInsert = data.chunks_text.map((text, i) => ({
      text: text,
      embedding: data.embeddings[i],
    }));

    await insertPdfChunks(pdfId, asignaturaId, chunksToInsert);

    return { success: true };
  } catch (error) {
    console.error("❌ Error en processAndStoreEmbeddingsAction:", error);
    return { success: false, error: (error as Error).message };
  }
}
