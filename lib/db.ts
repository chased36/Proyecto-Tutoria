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
  task_status?: "pending" | "processing" | "completed" | "error" | null
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
  status: "pending" | "processing" | "completed" | "error"
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
      t.status as task_status
    FROM pdf p
    LEFT JOIN task t ON p.id = t.pdf_id
    WHERE p.asignatura_id = ${subjectId}
    ORDER BY p.created_at DESC
  `
  return result as PDF[]
}

export async function createPDF(filename: string, url: string, subjectId: string): Promise<PDF> {
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

// Funciones para Tareas de Embeddings existentes
export async function createEmbeddingTask(pdfId: string): Promise<Task> {
  const result = await sql`
    INSERT INTO task (pdf_id, status, created_at, updated_at)
    VALUES (${pdfId}, 'pending', NOW(), NOW())
    RETURNING id, pdf_id, status, error_message, created_at, updated_at
  `
  return result[0] as Task
}

export async function getPendingTasks(limit = 10): Promise<Task[]> {
  const result = await sql`
    SELECT id, pdf_id, status, error_message, created_at, updated_at
    FROM task
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${limit}
  `
  return result as Task[]
}

export async function updateTaskStatus(
  taskId: string,
  status: "pending" | "processing" | "completed" | "error",
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

export async function getTaskById(taskId: string): Promise<Task | null> {
  const result = await sql`
    SELECT id, pdf_id, status, error_message, created_at, updated_at
    FROM task
    WHERE id = ${taskId}
  `
  return result.length > 0 ? (result[0] as Task) : null
}

export async function getPDFByTaskId(taskId: string): Promise<{ pdf: PDF } | null> {
  const result = await sql`
    SELECT p.id, p.filename, p.url, p.embeddings_url, p.asignatura_id, p.created_at
    FROM pdf p
    INNER JOIN task t ON t.pdf_id = p.id
    WHERE t.id = ${taskId}
  `

  if (result.length === 0) {
    return null
  }

  return { pdf: result[0] as PDF }
}

export async function getTaskByPdfId(pdfId: string): Promise<Task | null> {
  const result = await sql`
    SELECT id, pdf_id, status, error_message, created_at, updated_at
    FROM task
    WHERE pdf_id = ${pdfId}
    ORDER BY created_at DESC
    LIMIT 1
  `

  return result.length > 0 ? (result[0] as Task) : null
}

//Funciones para embeddings nuevos
export async function getPendingTasksWithPDFInfo(limit: number = 1): Promise<any[]> {
  const result = await sql`
    SELECT 
      t.id as task_id,
      t.pdf_id,
      t.status as task_status,
      t.error_message,
      t.created_at as task_created,
      t.updated_at as task_updated,
      p.filename,
      p.url as pdf_url,
      p.embeddings_url,
      p.total_chunks,
      p.asignatura_id
    FROM task t
    INNER JOIN pdf p ON t.pdf_id = p.id
    WHERE t.status = 'pending'
    ORDER BY t.created_at ASC
    LIMIT ${limit}
  `
  return result
}

export async function updatePDFWithEmbeddings(
  pdfId: string, 
  embeddingsUrl: string,
  totalChunks: number
): Promise<void> {
  await sql`
    UPDATE pdf
    SET 
      embeddings_url = ${embeddingsUrl},
      total_chunks = ${totalChunks},
      updated_at = NOW()
    WHERE id = ${pdfId}
  `
}

export async function getTaskWithPDFInfo(taskId: string): Promise<any> {
  const result = await sql`
    SELECT 
      t.id as task_id,
      t.pdf_id,
      t.status as task_status,
      t.error_message,
      t.created_at as task_created,
      t.updated_at as task_updated,
      p.filename,
      p.url as pdf_url,
      p.embeddings_url,
      p.total_chunks,
      p.asignatura_id
    FROM task t
    INNER JOIN pdf p ON t.pdf_id = p.id
    WHERE t.id = ${taskId}
  `
  return result.length > 0 ? result[0] : null
}

export async function hasPDFEmbeddings(pdfId: string): Promise<boolean> {
  const result = await sql`
    SELECT embeddings_url 
    FROM pdf 
    WHERE id = ${pdfId} AND embeddings_url IS NOT NULL
  `
  return result.length > 0
}

export async function getTaskStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
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
  
  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    error: 0,
    total: 0
  }
  
  result.forEach((row: any) => {
    stats[row.status as keyof typeof stats] = parseInt(row.count)
    stats.total += parseInt(row.count)
  })
  
  return stats
}

export async function getOldestPendingTask(): Promise<any> {
  const result = await sql`
    SELECT 
      t.id,
      t.created_at,
      p.filename
    FROM task t
    INNER JOIN pdf p ON t.pdf_id = p.id
    WHERE t.status = 'pending'
    ORDER BY t.created_at ASC
    LIMIT 1
  `
  return result.length > 0 ? result[0] : null
}

export async function cleanupOldTasks(days: number = 7): Promise<number> {
  const result = await sql`
    DELETE FROM task
    WHERE created_at < NOW() - INTERVAL '${days} days'
    AND status IN ('completed', 'error')
    RETURNING id
  `
  return result.length
}

export async function resetStuckTasks(hours: number = 2): Promise<number> {
  const result = await sql`
    UPDATE task
    SET status = 'pending', error_message = 'Reiniciado por timeout'
    WHERE status = 'processing' 
    AND updated_at < NOW() - INTERVAL '${hours} hours'
    RETURNING id
  `
  return result.length
}

export async function createEmbeddingTaskSafe(pdfId: string): Promise<{
  success: boolean;
  task?: Task;
  existingTask?: Task;
  message: string;
}> {
  try {
    const existingTasks = await sql`
      SELECT id, status, error_message
      FROM task 
      WHERE pdf_id = ${pdfId} 
      AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingTasks.length > 0) {
      return {
        success: true,
        existingTask: existingTasks[0] as Task,
        message: 'Ya existe una tarea para este PDF'
      }
    }

    const hasEmbeddings = await hasPDFEmbeddings(pdfId)
    if (hasEmbeddings) {
      const completedTask = await sql`
        SELECT id, status, error_message
        FROM task 
        WHERE pdf_id = ${pdfId} AND status = 'completed'
        LIMIT 1
      `
      
      if (completedTask.length > 0) {
        return {
          success: true,
          existingTask: completedTask[0] as Task,
          message: 'El PDF ya tiene embeddings generados'
        }
      }
    }

    const newTask = await sql`
      INSERT INTO task (pdf_id, status, created_at, updated_at)
      VALUES (${pdfId}, 'pending', NOW(), NOW())
      RETURNING id, pdf_id, status, error_message, created_at, updated_at
    `

    return {
      success: true,
      task: newTask[0] as Task,
      message: 'Tarea creada exitosamente'
    }

  } catch (error) {
    console.error('Error creando tarea de embedding:', error)
    return {
      success: false,
      message: `Error creando tarea: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }
  }
}

export async function getPDFWithProcessingStatus(pdfId: string): Promise<any> {
  const result = await sql`
    SELECT 
      p.*,
      t.status as task_status,
      t.error_message,
      t.created_at as task_created,
      t.updated_at as task_updated
    FROM pdf p
    LEFT JOIN task t ON p.id = t.pdf_id
    WHERE p.id = ${pdfId}
    ORDER BY t.created_at DESC
    LIMIT 1
  `
  
  return result.length > 0 ? result[0] : null
}

/*
- getSemesters()
- createSemester(name: string)
- deleteSemester(id: string)
- getSemesterNameById(id: string)
- getSubjectsBySemester(semesterId: string)
- createSubject(name: string, semesterId: string)
- updateSubject(id: string, name: string)
- deleteSubject(id: string)
- getSubjectById(id: string)
- getPDFsBySubject(subjectId: string)
- createPDF(filename: string, url: string, subjectId: string)
- deletePDF(id: string)
- updatePDFEmbeddings(pdfId: string, embeddingsUrl: string)
- getVideosBySubject(subjectId: string)
- createVideo(title: string, url: string, subjectId: string)
- getQuestionsBySubject(subjectId: string)
- createQuestion(
  pregunta: string,
  respuestaCorrecta: string,
  respuestasIncorrectas: string[],
  subjectId: string,
)
- createEmbeddingTask(pdfId: string)
- getPendingTasks(limit = 10)
- updateTaskStatus(
  taskId: string,
  status: "pending" | "processing" | "completed" | "error",
  errorMessage?: string,
)
- getTaskById(taskId: string)
- getPDFByTaskId(taskId: string)
- getTaskByPdfId(pdfId: string)
- getPendingTasksWithPDFInfo(limit: number = 1)
- updatePDFWithEmbeddings(
  pdfId: string, 
  embeddingsUrl: string,
  totalChunks: number
)
- getTaskWithPDFInfo(taskId: string)
- hasPDFEmbeddings(pdfId: string)
- getTaskStats()
- getOldestPendingTask()
- cleanupOldTasks(days: number = 7)
- resetStuckTasks(hours: number = 2)
- createEmbeddingTaskSafe(pdfId: string)
- getPDFWithProcessingStatus(pdfId: string)
*/