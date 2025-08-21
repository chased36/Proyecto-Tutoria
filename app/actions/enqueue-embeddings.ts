"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export type EnqueueResult =
  | { success: true; taskId: string; status: "pending"; createdAt: string }
  | { success: false; error: string }

export async function enqueueEmbeddingTask(pdfId: string): Promise<EnqueueResult> {
  try {
    if (!pdfId) return { success: false, error: "pdfId es requerido" }

    const result = await sql`
      INSERT INTO task (pdf_id, status)
      VALUES (${pdfId}, 'pending')
      RETURNING id, status, created_at
    `

    const t = result[0]
    return {
      success: true,
      taskId: t.id,
      status: t.status,
      createdAt: t.created_at,
    }
  } catch (err) {
    console.error("enqueueEmbeddingTask error:", err)
    return { success: false, error: "No se pudo encolar la tarea" }
  }
}

export async function enqueueEmbeddingTasks(pdfIds: string[]): Promise<{
  success: boolean
  enqueued: { pdfId: string; taskId?: string; error?: string }[]
}> {
  const results: { pdfId: string; taskId?: string; error?: string }[] = []

  for (const pdfId of pdfIds) {
    const res = await enqueueEmbeddingTask(pdfId)
    if (res.success) {
      results.push({ pdfId, taskId: res.taskId })
    } else {
      results.push({ pdfId, error: res.error })
    }
  }

  return { success: true, enqueued: results }
}
