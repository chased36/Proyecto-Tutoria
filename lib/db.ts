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
  id: string
  pdf_id: string
  status: "pending" | "processing" | "done" | "error"
  error_message?: string | null
  created_at: string
  updated_at: string
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

  // Primero obtenemos todas las asignaturas del semestre
  const subjects = await sql`
    SELECT id FROM asignatura WHERE semestre_id = ${id}
  `

  console.log(`El semestre tiene ${subjects.length} asignaturas para eliminar`)

  // Eliminamos cada asignatura (esto eliminará también sus PDFs, videos y preguntas)
  for (const subject of subjects) {
    await deleteSubject(subject.id)
  }

  // Finalmente eliminamos el semestre
  await sql`DELETE FROM semestre WHERE id = ${id}`
  console.log(`Semestre con ID ${id} eliminado exitosamente`)
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

  // Construcción explícita del objeto Subject
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

  // 1. Obtener y eliminar todos los PDFs asociados (incluyendo embeddings)
  const pdfs = await sql`
    SELECT id, url, embeddings_url FROM pdf WHERE asignatura_id = ${id}
  `

  console.log(`La asignatura tiene ${pdfs.length} PDFs para eliminar`)

  // Recopilar URLs de PDFs y embeddings para eliminar de Blob
  const pdfUrls = pdfs.map((pdf: any) => pdf.url)
  const embeddingsUrls = pdfs
    .map((pdf: any) => pdf.embeddings_url)
    .filter((url: string | null) => url !== null && url !== undefined)

  // Eliminar los archivos PDF de Vercel Blob
  if (pdfUrls.length > 0) {
    await deleteMultiplePDFsFromBlob(pdfUrls)
  }

  // Eliminar los archivos de embeddings de Vercel Blob
  if (embeddingsUrls.length > 0) {
    console.log(`Eliminando ${embeddingsUrls.length} archivos de embeddings...`)
    for (const embeddingsUrl of embeddingsUrls) {
      await deleteEmbeddingsFromBlob(embeddingsUrl)
    }
  }

  // Eliminar las referencias de la base de datos
  await sql`DELETE FROM pdf WHERE asignatura_id = ${id}`

  // 2. Eliminar todos los videos asociados
  await sql`DELETE FROM videos WHERE asignatura_id = ${id}`

  // 3. Eliminar todas las preguntas asociadas (primero necesitamos eliminar las respuestas incorrectas)
  const questions = await sql`SELECT id FROM pregunta WHERE asignatura_id = ${id}`

  for (const question of questions) {
    // Eliminar respuestas incorrectas de cada pregunta
    await sql`DELETE FROM respuestaincorrecta WHERE pregunta_id = ${question.id}`
  }

  // Ahora eliminar las preguntas
  await sql`DELETE FROM pregunta WHERE asignatura_id = ${id}`

  // 4. Finalmente eliminar la asignatura
  await sql`DELETE FROM asignatura WHERE id = ${id}`
  console.log(`Asignatura con ID ${id} eliminada exitosamente`)
}

// Añadir esta nueva función a tu archivo lib/database.ts
export async function getSubjectById(id: string): Promise<Subject | null> {
  try {
    console.log(`Buscando asignatura con ID: ${id}`)

    // Obtener la asignatura básica
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

    // Obtener PDFs, videos y preguntas
    const [pdfs, videos, questions] = await Promise.all([
      getPDFsBySubject(id),
      getVideosBySubject(id),
      getQuestionsBySubject(id),
    ])

    // Construir el objeto completo
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
    SELECT id, filename, url, embeddings_url, asignatura_id, created_at
    FROM pdf 
    WHERE asignatura_id = ${subjectId}
    ORDER BY created_at DESC
  `
  return result as PDF[]
}

export async function createPDF(
  filename: string,
  url: string,
  subjectId: string
): Promise<PDF> {
  const result = await sql`
    INSERT INTO pdf (id, filename, url, embeddings_url, asignatura_id, created_at)
    VALUES (gen_random_uuid(), ${filename}, ${url}, NULL, ${subjectId}, NOW())
    RETURNING id, filename, url, embeddings_url, asignatura_id, created_at
  `

  const pdf = result[0] as PDF

  await createEmbeddingTask(pdf.id)

  return pdf
}

export async function deletePDF(id: string): Promise<void> {
  // Primero obtenemos la URL del PDF y embeddings
  const pdf = await sql`
    SELECT url, embeddings_url FROM pdf WHERE id = ${id}
  `

  if (pdf && pdf.length > 0) {
    // Eliminar el archivo PDF de Vercel Blob
    await deletePDFFromBlob(pdf[0].url)

    // Eliminar el archivo de embeddings si existe
    if (pdf[0].embeddings_url) {
      await deleteEmbeddingsFromBlob(pdf[0].embeddings_url)
    }

    // Eliminar la referencia de la base de datos
    await sql`DELETE FROM pdf WHERE id = ${id}`
  }
}

export async function updatePDFEmbeddings(pdfId: string, embeddingsUrl: string): Promise<void> {
  await sql`
    UPDATE pdf 
    SET embeddings_url = ${embeddingsUrl}
    WHERE id = ${pdfId}
  `
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

  // Insertar respuestas incorrectas
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

// Añadir esta función para obtener el nombre del semestre
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

export async function createEmbeddingTask(pdfId: string): Promise<Task> {
  const result = await sql`
    INSERT INTO task (pdf_id, status, created_at, updated_at)
    VALUES (${pdfId}, 'pending', NOW(), NOW())
    RETURNING id, pdf_id, status, error_message, created_at, updated_at
  `
  return result[0] as Task
}

// Obtener tareas pendientes para el worker
export async function getPendingTasks(limit: number = 10): Promise<Task[]> {
  const result = await sql`
    SELECT id, pdf_id, status, error_message, created_at, updated_at
    FROM task
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${limit}
  `
  return result as Task[]
}

// Actualizar estado de una tarea
export async function updateTaskStatus(
  taskId: string,
  status: "pending" | "processing" | "done" | "error",
  errorMessage?: string
): Promise<void> {
  await sql`
    UPDATE task
    SET status = ${status}, 
        error_message = ${errorMessage || null}, 
        updated_at = NOW()
    WHERE id = ${taskId}
  `
}