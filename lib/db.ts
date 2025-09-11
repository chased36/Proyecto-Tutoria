import { neon } from "@neondatabase/serverless"
import { deleteMultiplePDFsFromBlob, deletePDFFromBlob, deleteEmbeddingsFromBlob } from "./blob"

const sql = neon(process.env.DATABASE_URL!)

export type Semester = {
  id: string
  name: string
  created_at: string
}

export type Subject = {
  id: string
  name: string
  semestre_id: string
  created_at: string
  pdfs: PDF[]
  videos: Video[]
  questions: QuestionWithAnswers[]
}

export type PDF = {
  id: string
  filename: string
  url: string
  embeddings_url?: string | null
  asignatura_id: string
  created_at: string
  task_status?: "pending" | "processing" | "done" | "error" | null
  task_id?: string | null;
}

export type Video = {
  id: string
  title: string
  url: string
  asignatura_id: string
  created_at: string
}

export type Question = {
  id: string
  pregunta: string
  respuesta_correcta: string
  asignatura_id: string
  created_at: string
}

export type QuestionWithAnswers = Question & {
  respuestas_incorrectas: string[]
}

export type Task = {
  id: string;
  pdf_id: string;
  status: "pending" | "processing" | "done" | "error";
  error_message?: string | null;
  total_chunks?: number | null;
  processed_chunks?: number | null;
  hf_task_id?: string | null;
  hf_status?: string | null;
  created_at: string;
  updated_at: string;
}

// Funciones para Semestres
export async function getSemesters(): Promise<Semester[]> {
  const result = await sql`
    SELECT id, name, created_at 
    FROM semestre 
    ORDER BY created_at DESC
  `
  return result as Semester[]
}

export async function createSemester(name: string): Promise<Semester> {
  const result = await sql`
    INSERT INTO semestre (id, name, created_at)
    VALUES (gen_random_uuid(), ${name}, NOW())
    RETURNING id, name, created_at
  `
  return result[0] as Semester
}

export async function deleteSemester(id: string): Promise<void> {
  console.log(`Iniciando eliminación del semestre con ID: ${id}`)

  const subjects = await sql`
    SELECT id FROM asignatura WHERE semestre_id = ${id}
  `

  console.log(`El semestre tiene ${subjects.length} asignaturas para eliminar`)

  for (const subject of subjects) {
    await deleteSubject(subject.id)
  }

  await sql`DELETE FROM semestre WHERE id = ${id}`
  console.log(`Semestre con ID ${id} eliminado exitosamente`)
}

export async function getSemesterNameById(id: string): Promise<string> {
  try {
    const result = await sql`
      SELECT name FROM semestre WHERE id = ${id}
    `
    return result.length > 0 ? result[0].name : "Semestre desconocido"
  } catch (error) {
    console.error("Error al obtener nombre del semestre:", error)
    return "Semestre desconocido"
  }
}

// Funciones para Asignaturas
export async function getSubjectsBySemester(semesterId: string): Promise<Subject[]> {
  const subjects = await sql`
    SELECT id, name, semestre_id, created_at
    FROM asignatura 
    WHERE semestre_id = ${semesterId}
    ORDER BY created_at DESC
  `

  const subjectsWithDetails = await Promise.all(
    subjects.map(async (subject) => {
      const [pdfs, videos, questions] = await Promise.all([
        getPDFsBySubject(subject.id),
        getVideosBySubject(subject.id),
        getQuestionsBySubject(subject.id),
      ])

      return {
        ...subject,
        pdfs,
        videos,
        questions,
      } as Subject
    }),
  )

  return subjectsWithDetails
}

export async function createSubject(name: string, semesterId: string): Promise<Subject> {
  const result = await sql`
    INSERT INTO asignatura (id, name, semestre_id, created_at)
    VALUES (gen_random_uuid(), ${name}, ${semesterId}, NOW())
    RETURNING id, name, semestre_id, created_at
  `

  const dbResult = result[0]

  return {
    id: dbResult.id,
    name: dbResult.name,
    semestre_id: dbResult.semestre_id,
    created_at: dbResult.created_at,
    pdfs: [],
    videos: [],
    questions: [],
  }
}

export async function updateSubject(id: string, name: string): Promise<void> {
  await sql`
    UPDATE asignatura 
    SET name = ${name}
    WHERE id = ${id}
  `
}

export async function deleteSubject(id: string): Promise<void> {
  console.log(`Iniciando eliminación de la asignatura con ID: ${id}`)

  const pdfsToDelete = await sql`SELECT id FROM pdf WHERE asignatura_id = ${id}`
  if (pdfsToDelete.length > 0) {
    const pdfIds = pdfsToDelete.map((p: any) => p.id);
    await sql`DELETE FROM embedding_chunks WHERE pdf_id = ANY(${pdfIds})`;
    console.log(`Eliminados chunks de ${pdfIds.length} PDFs.`);
  }

  const pdfs = await sql`
    SELECT id, url, embeddings_url FROM pdf WHERE asignatura_id = ${id}
  `

  console.log(`La asignatura tiene ${pdfs.length} PDFs para eliminar`)

  for (const pdf of pdfs) {
    await sql`DELETE FROM task WHERE pdf_id = ${pdf.id}`
  }

  const pdfUrls = pdfs.map((pdf: any) => pdf.url)
  const embeddingsUrls = pdfs
    .map((pdf: any) => pdf.embeddings_url)
    .filter((url: string | null) => url !== null && url !== undefined)

  if (pdfUrls.length > 0) {
    await deleteMultiplePDFsFromBlob(pdfUrls)
  }

  if (embeddingsUrls.length > 0) {
    console.log(`Eliminando ${embeddingsUrls.length} archivos de embeddings...`)
    for (const embeddingsUrl of embeddingsUrls) {
      await deleteEmbeddingsFromBlob(embeddingsUrl)
    }
  }

  await sql`DELETE FROM pdf WHERE asignatura_id = ${id}`
  await sql`DELETE FROM videos WHERE asignatura_id = ${id}`

  const questions = await sql`SELECT id FROM pregunta WHERE asignatura_id = ${id}`
  for (const question of questions) {
    await sql`DELETE FROM respuestaincorrecta WHERE pregunta_id = ${question.id}`
  }

  await sql`DELETE FROM pregunta WHERE asignatura_id = ${id}`
  await sql`DELETE FROM asignatura WHERE id = ${id}`
  
  console.log(`Asignatura con ID ${id} eliminada exitosamente`)
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  try {
    console.log(`Buscando asignatura con ID: ${id}`)

    const subjectResult = await sql`
      SELECT id, name, semestre_id, created_at
      FROM asignatura 
      WHERE id = ${id}
    `

    if (subjectResult.length === 0) {
      console.log(`No se encontró ninguna asignatura con ID: ${id}`)
      return null
    }

    const subject = subjectResult[0]
    console.log(`Asignatura encontrada: ${subject.name}`)

    const [pdfs, videos, questions] = await Promise.all([
      getPDFsBySubject(id),
      getVideosBySubject(id),
      getQuestionsBySubject(id),
    ])

    return {
      id: subject.id,
      name: subject.name,
      semestre_id: subject.semestre_id,
      created_at: subject.created_at,
      pdfs,
      videos,
      questions,
    } as Subject
  } catch (error) {
    console.error("Error al buscar asignatura por ID:", error)
    return null
  }
}

// Funciones para PDFs
export async function getPDFsBySubject(subjectId: string): Promise<PDF[]> {
  const result = await sql`
    SELECT 
      p.id, 
      p.filename, 
      p.url, 
      p.embeddings_url, 
      p.asignatura_id, 
      p.created_at,
      t.status as task_status,
      t.id as task_id
    FROM pdf p
    LEFT JOIN task t ON p.id = t.pdf_id
    WHERE p.asignatura_id = ${subjectId}
    ORDER BY p.created_at DESC
  `
  return result as PDF[]
}

export async function createPDF(filename: string, url: string, subjectId: string): Promise<{ pdf: PDF; task: Task }> {
  const result = await sql`
    INSERT INTO pdf (id, filename, url, embeddings_url, asignatura_id, created_at)
    VALUES (gen_random_uuid(), ${filename}, ${url}, NULL, ${subjectId}, NOW())
    RETURNING id, filename, url, embeddings_url, asignatura_id, created_at
  `

  const pdf = result[0] as PDF
  const task = await createEmbeddingTask(pdf.id)

  return { pdf, task }
}

export async function deletePDF(id: string): Promise<void> {
  await sql`DELETE FROM embedding_chunks WHERE pdf_id = ${id}`;

  const pdf = await sql`
    SELECT url, embeddings_url FROM pdf WHERE id = ${id}
  `

  if (pdf && pdf.length > 0) {
    await sql`DELETE FROM task WHERE pdf_id = ${id}`
    await deletePDFFromBlob(pdf[0].url)

    if (pdf[0].embeddings_url) {
      await deleteEmbeddingsFromBlob(pdf[0].embeddings_url)
    }

    await sql`DELETE FROM pdf WHERE id = ${id}`
  }
}

// Funciones para Videos
export async function getVideosBySubject(subjectId: string): Promise<Video[]> {
  const result = await sql`
    SELECT id, title, url, asignatura_id, created_at
    FROM videos 
    WHERE asignatura_id = ${subjectId}
    ORDER BY created_at DESC
  `
  return result as Video[]
}

export async function createVideo(title: string, url: string, subjectId: string): Promise<Video> {
  const result = await sql`
    INSERT INTO videos (id, title, url, asignatura_id, created_at)
    VALUES (gen_random_uuid(), ${title}, ${url}, ${subjectId}, NOW())
    RETURNING id, title, url, asignatura_id, created_at
  `
  return result[0] as Video
}

// Funciones para Preguntas
export async function getQuestionsBySubject(subjectId: string): Promise<QuestionWithAnswers[]> {
  const questions = await sql`
    SELECT id, pregunta, respuesta_correcta, asignatura_id, created_at
    FROM pregunta 
    WHERE asignatura_id = ${subjectId}
    ORDER BY created_at DESC
  `

  const questionsWithAnswers = await Promise.all(
    questions.map(async (question) => {
      const wrongAnswers = await sql`
        SELECT respuesta
        FROM respuestaincorrecta 
        WHERE pregunta_id = ${question.id}
      `

      return {
        ...question,
        respuestas_incorrectas: wrongAnswers.map((answer: any) => answer.respuesta),
      } as QuestionWithAnswers
    }),
  )

  return questionsWithAnswers
}

export async function createQuestion(
  pregunta: string,
  respuestaCorrecta: string,
  respuestasIncorrectas: string[],
  subjectId: string,
): Promise<QuestionWithAnswers> {
  const questionResult = await sql`
    INSERT INTO pregunta (id, pregunta, respuesta_correcta, asignatura_id, created_at)
    VALUES (gen_random_uuid(), ${pregunta}, ${respuestaCorrecta}, ${subjectId}, NOW())
    RETURNING id, pregunta, respuesta_correcta, asignatura_id, created_at
  `

  const question = questionResult[0] as Question

  for (const respuesta of respuestasIncorrectas) {
    await sql`
      INSERT INTO respuestaincorrecta (id, respuesta, pregunta_id)
      VALUES (gen_random_uuid(), ${respuesta}, ${question.id})
    `
  }

  return {
    ...question,
    respuestas_incorrectas: respuestasIncorrectas,
  } as QuestionWithAnswers
}

// Funciones para tareas de Embeddings
export async function createEmbeddingTask(pdfId: string): Promise<Task> {
  const result = await sql`
    INSERT INTO task (pdf_id, status, created_at, updated_at)
    VALUES (${pdfId}, 'pending', NOW(), NOW())
    RETURNING id, pdf_id, status, error_message, created_at, updated_at
  `;
  return result[0] as Task;
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const result = await sql`
    SELECT *
    FROM task
    WHERE id = ${taskId}
  `
  return result.length > 0 ? (result[0] as Task) : null
}

export async function getTaskWithPDFInfo(taskId: string): Promise<any> {
  const result = await sql`
    SELECT 
      t.id as task_id,
      t.pdf_id,
      t.status as task_status,
      t.error_message,
      p.filename,
      p.url as pdf_url,
      p.embeddings_url,
      p.asignatura_id
    FROM task t
    INNER JOIN pdf p ON t.pdf_id = p.id
    WHERE t.id = ${taskId}
  `;
  return result.length > 0 ? result[0] : null;
}

export async function updateTaskStatus(
  taskId: string,
  status: "pending" | "processing" | "done" | "error",
  errorMessage?: string,
): Promise<void> {
  await sql`
    UPDATE task
    SET status = ${status}, 
        error_message = ${errorMessage || null}, 
        updated_at = NOW()
    WHERE id = ${taskId}
  `
}

export async function getTaskStats(): Promise<{
  pending: number;
  processing: number;
  done: number;
  error: number;
  total: number;
}> {
  const result = await sql`
    SELECT 
      status,
      COUNT(*) as count
    FROM task
    GROUP BY status
  `
  
  const stats: { [key: string]: number, total: number } = {
    pending: 0,
    processing: 0,
    done: 0,
    error: 0,
    total: 0
  }
  
  result.forEach((row: any) => {
    if (stats.hasOwnProperty(row.status)) {
        stats[row.status] = parseInt(row.count)
    }
    stats.total += parseInt(row.count)
  })
  
  return stats as {
    pending: number;
    processing: number;
    done: number;
    error: number;
    total: number;
  };
}

// Funciones para RAG
export async function insertPdfChunks(
  pdfId: string,
  asignaturaId: string,
  chunks: { text: string; embedding: number[] }[]
): Promise<void> {
  await sql`DELETE FROM embedding_chunks WHERE pdf_id = ${pdfId}`;
  console.log(`🧹 Chunks antiguos del PDF ${pdfId} eliminados.`);

  await sql.transaction(
    chunks.map(chunk => 
      sql`
        INSERT INTO embedding_chunks (pdf_id, asignatura_id, chunk_text, embedding)
        VALUES (${pdfId}, ${asignaturaId}, ${chunk.text}, ${JSON.stringify(chunk.embedding)})
      `
    )
  );
  console.log(`✅ Insertados ${chunks.length} nuevos chunks para el PDF ${pdfId}`);
}

export async function findSimilarChunks(
  asignaturaId: string,
  queryEmbedding: number[],
  match_count: number = 5
): Promise<{ chunk_text: string }[]> {
  const result = await sql`
    SELECT chunk_text
    FROM embedding_chunks
    WHERE asignatura_id = ${asignaturaId}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}
    LIMIT ${match_count}
  `;
  return result as { chunk_text: string }[];
}
