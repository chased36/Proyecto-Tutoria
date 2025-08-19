import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface PDFChunk {
  id: string
  pdf_id: string
  chunk_text: string
  chunk_index: number
  embedding: number[]
  created_at: string
}

// Esta función ya no es necesaria para el procesamiento de PDFs,
// pero se mantiene si la necesitas para otras lógicas de chunking en JS.
export function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end)

    if (end < text.length) {
      const lastSpaceIndex = chunk.lastIndexOf(" ")
      if (lastSpaceIndex > chunkSize * 0.8) {
        chunks.push(chunk.slice(0, lastSpaceIndex))
        start += lastSpaceIndex + 1 - overlap
      } else {
        chunks.push(chunk)
        start = end - overlap
      }
    } else {
      chunks.push(chunk)
      break
    }
  }

  return chunks.filter((chunk) => chunk.trim().length > 50)
}

// La generación de embeddings para la consulta de búsqueda
// ahora deberá hacerse llamando a la API de Python o de otra forma.
// Esta función asume que ya tienes el embedding de la consulta.
export async function searchSimilarChunks(queryEmbedding: number[], subjectId: string, limit = 5): Promise<PDFChunk[]> {
  try {
    const results = await sql`
      SELECT
        c.id,
        c.pdf_id,
        c.chunk_text,
        c.chunk_index,
        c.created_at,
        p.filename,
        1 - (c.embedding <=> ${JSON.stringify(queryEmbedding)}) as similarity
      FROM pdf_chunks c
      JOIN pdf p ON c.pdf_id = p.id
      JOIN asignatura a ON p.asignatura_id = a.id
      WHERE a.id = ${subjectId}
      ORDER BY c.embedding <=> ${JSON.stringify(queryEmbedding)}
      LIMIT ${limit}
    `

    return results.map((row) => ({
      id: row.id,
      pdf_id: row.pdf_id,
      chunk_text: row.chunk_text,
      chunk_index: row.chunk_index,
      embedding: [], // No necesitamos devolver el embedding completo aquí
      created_at: row.created_at,
      filename: row.filename,
      similarity: row.similarity,
    })) as any[]
  } catch (error) {
    console.error("Error buscando chunks similares:", error)
    throw error
  }
}

export async function getPDFProcessingStatus(pdfId: string) {
  const result = await sql`
    SELECT status, chunks_count, error_message, processed_at
    FROM pdf_processing_status
    WHERE pdf_id = ${pdfId}
  `

  return result[0] || { status: "not_processed" }
}
