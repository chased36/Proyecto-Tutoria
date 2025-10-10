import { neon } from "@neondatabase/serverless"
import { deleteMultiplePDFsFromBlob, deletePDFFromBlob, deleteEmbeddingsFromBlob } from "./blob"

const sql = neon(process.env.DATABASE_URL!)

export type Carrera = {
  id: string
  name: string
  created_at: string
}

export type Semester = {
  id: string
  name: string
  carrera_id: string
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
  task_id?: string | null
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
  total_chunks?: number | null
  processed_chunks?: number | null
  hf_task_id?: string | null
  hf_status?: string | null
  created_at: string
  updated_at: string
}

export type EnhancedChunk = {
  chunk_text: string
  section_title: string
  chunk_index: number
  similarity_score: number
  token_count: number
  created_with_overlap: boolean
}

export type ChunkMetadata = {
  chunk_index?: number
  section_title?: string
  token_count?: number
  created_with_overlap?: boolean
  page_number?: number
}

export type QuizResult = {
  id: string
  asignatura_id: string
  fecha: string
  calificacion: number
  num_preguntas: number
  preguntas_correctas: number
  preguntas_incorrectas: number
}

export type UserAnswer = {
  id: string
  resultado_id: string
  pregunta_id: string
  respuesta: string
  es_correcta: boolean
  fecha: string
}

export type QuestionStats = {
  pregunta_id: string
  pregunta: string
  total_respuestas: number
  respuestas_correctas: number
  respuestas_incorrectas: number
  porcentaje_correctas: number
}

export type AnswerDistribution = {
  pregunta_id: string
  pregunta: string
  respuesta: string
  count: number
  percentage: number
  es_correcta: boolean
}

export type ScoreDistribution = {
  calificacion: number
  count: number
  percentage: number
}

export type QuizStatistics = {
  promedio: number
  mediana: number
  rango_min: number
  rango_max: number
  total_participantes: number
  score_distribution: ScoreDistribution[]
  most_difficult_questions: QuestionStats[]
  answer_distribution: AnswerDistribution[]
}

// Funciones para Carreras
export async function getCarreras(): Promise<Carrera[]> {
  const result = await sql`
    SELECT id, name, created_at
    FROM carrera
    ORDER BY created_at DESC
  `
  return result as Carrera[]
}

export async function createCarrera(name: string): Promise<Carrera> {
  const result = await sql`
    INSERT INTO carrera (id, name, created_at)
    VALUES (gen_random_uuid(), ${name}, NOW())
    RETURNING id, name, created_at
  `
  return result[0] as Carrera
}

export async function updateCarrera(id: string, name: string): Promise<Carrera> {
  const result = await sql`
    UPDATE carrera
    SET name = ${name}
    WHERE id = ${id}
    RETURNING id, name, created_at
  `
  return result[0] as Carrera
}

export async function deleteCarrera(id: string): Promise<void> {
  console.log(`Iniciando eliminación de la carrera con ID: ${id}`)

  const semesters = await sql`
    SELECT id FROM semestre WHERE carrera_id = ${id}
  `

  console.log(`La carrera tiene ${semesters.length} semestres para eliminar`)

  for (const semester of semesters) {
    await deleteSemester(semester.id)
  }

  await sql`DELETE FROM carrera WHERE id = ${id}`
  console.log(`Carrera con ID ${id} eliminada exitosamente`)
}

export async function getCarreraNameById(id: string): Promise<string> {
  try {
    const result = await sql`
      SELECT name FROM carrera WHERE id = ${id}
    `
    return result.length > 0 ? result[0].name : "Carrera desconocida"
  } catch (error) {
    console.error("Error al obtener nombre de la carrera:", error)
    return "Carrera desconocida"
  }
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

export async function getSemestersByCarrera(carreraId: string): Promise<Semester[]> {
  const result = await sql`
    SELECT id, name, carrera_id, created_at
    FROM semestre
    WHERE carrera_id = ${carreraId}
    ORDER BY created_at DESC
  `
  return result as Semester[]
}

export async function createSemester(name: string, carreraId: string): Promise<Semester> {
  const result = await sql`
    INSERT INTO semestre (id, name, carrera_id, created_at)
    VALUES (gen_random_uuid(), ${name}, ${carreraId}, NOW())
    RETURNING id, name, carrera_id, created_at
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

export async function getSemesterById(id: string): Promise<Semester | null> {
  try {
    const result = await sql`
      SELECT id, name, carrera_id, created_at
      FROM semestre
      WHERE id = ${id}
    `
    return result.length > 0 ? (result[0] as Semester) : null
  } catch (error) {
    console.error("Error al obtener semestre:", error)
    return null
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

export async function updateSubject(id: string, name: string): Promise<Subject> {
  const result = await sql`
    UPDATE asignatura
    SET name = ${name}
    WHERE id = ${id}
    RETURNING id, name, semestre_id, created_at
  `

  return {
    id: result[0].id,
    name: result[0].name,
    semestre_id: result[0].semestre_id,
    created_at: result[0].created_at,
    pdfs: [],
    videos: [],
    questions: [],
  } as Subject
}

export async function deleteSubject(id: string): Promise<void> {
  console.log(`Iniciando eliminación de la asignatura con ID: ${id}`)

  await sql`DELETE FROM respuesta_usuario WHERE resultado_id IN 
    (SELECT id FROM resultado_examen WHERE asignatura_id = ${id})`
  await sql`DELETE FROM resultado_examen WHERE asignatura_id = ${id}`

  const pdfsToDelete = await sql`SELECT id FROM pdf WHERE asignatura_id = ${id}`
  if (pdfsToDelete.length > 0) {
    const pdfIds = pdfsToDelete.map((p: any) => p.id)
    await sql`DELETE FROM embedding_chunks WHERE pdf_id = ANY(${pdfIds})`
    console.log(`Eliminados chunks de ${pdfIds.length} PDFs.`)
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
  await sql`DELETE FROM embedding_chunks WHERE pdf_id = ${id}`

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
  `
  return result[0] as Task
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
  `
  return result.length > 0 ? result[0] : null
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
  pending: number
  processing: number
  done: number
  error: number
  total: number
}> {
  const result = await sql`
    SELECT 
      status,
      COUNT(*) as count
    FROM task
    GROUP BY status
  `

  const stats: { [key: string]: number; total: number } = {
    pending: 0,
    processing: 0,
    done: 0,
    error: 0,
    total: 0,
  }

  result.forEach((row: any) => {
    if (stats.hasOwnProperty(row.status)) {
      stats[row.status] = Number.parseInt(row.count)
    }
    stats.total += Number.parseInt(row.count)
  })

  return stats as {
    pending: number
    processing: number
    done: number
    error: number
    total: number
  }
}

// Funciones para estudio estadistico
export async function saveQuizResult(
  asignaturaId: string,
  calificacion: number,
  numPreguntas: number,
  preguntasCorrectas: number,
  respuestas: Array<{
    preguntaId: string
    respuestaSeleccionada: string
    esCorrecta: boolean
  }>,
): Promise<QuizResult> {
  const resultadoResult = await sql`
    INSERT INTO resultado_examen (
      id, asignatura_id, fecha, calificacion, num_preguntas, 
      preguntas_correctas, preguntas_incorrectas
    )
    VALUES (
      gen_random_uuid(), ${asignaturaId}, NOW(), ${calificacion}, 
      ${numPreguntas}, ${preguntasCorrectas}, ${numPreguntas - preguntasCorrectas}
    )
    RETURNING id, asignatura_id, fecha, calificacion, num_preguntas, 
              preguntas_correctas, preguntas_incorrectas
  `

  const resultado = resultadoResult[0] as QuizResult

  for (const respuesta of respuestas) {
    await sql`
      INSERT INTO respuesta_usuario (
        id, resultado_id, pregunta_id, respuesta, es_correcta, fecha
      )
      VALUES (
        gen_random_uuid(), ${resultado.id}, ${respuesta.preguntaId}, 
        ${respuesta.respuestaSeleccionada}, ${respuesta.esCorrecta}, NOW()
      )
    `
  }

  console.log(`✅ Resultado de cuestionario guardado: ${preguntasCorrectas}/${numPreguntas}`)
  return resultado
}

export async function getQuizStatistics(asignaturaId: string): Promise<QuizStatistics> {
  const generalStats = await sql`
    SELECT 
      AVG(calificacion) as promedio,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY calificacion) as mediana,
      MIN(calificacion) as rango_min,
      MAX(calificacion) as rango_max,
      COUNT(*) as total_participantes
    FROM resultado_examen
    WHERE asignatura_id = ${asignaturaId}
  `

  const stats = generalStats[0] || {
    promedio: 0,
    mediana: 0,
    rango_min: 0,
    rango_max: 0,
    total_participantes: 0,
  }

  const scoreDistribution = await sql`
    SELECT 
      calificacion,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 1) as percentage
    FROM resultado_examen
    WHERE asignatura_id = ${asignaturaId}
    GROUP BY calificacion
    ORDER BY calificacion
  `

  const mostDifficultQuestions = await sql`
    SELECT 
      ru.pregunta_id,
      p.pregunta,
      COUNT(*) as total_respuestas,
      COUNT(CASE WHEN ru.es_correcta = true THEN 1 END) as respuestas_correctas,
      COUNT(CASE WHEN ru.es_correcta = false THEN 1 END) as respuestas_incorrectas,
      ROUND(
        (COUNT(CASE WHEN ru.es_correcta = true THEN 1 END) * 100.0 / COUNT(*)), 
        1
      ) as porcentaje_correctas
    FROM respuesta_usuario ru
    INNER JOIN resultado_examen rc ON ru.resultado_id = rc.id
    INNER JOIN pregunta p ON ru.pregunta_id = p.id
    WHERE rc.asignatura_id = ${asignaturaId}
    GROUP BY ru.pregunta_id, p.pregunta
    ORDER BY porcentaje_correctas ASC, total_respuestas DESC
  `

  const answerDistribution = await sql`
    SELECT 
      ru.pregunta_id,
      p.pregunta,
      ru.respuesta,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(PARTITION BY ru.pregunta_id)), 1) as percentage,
      ru.es_correcta
    FROM respuesta_usuario ru
    INNER JOIN resultado_examen rc ON ru.resultado_id = rc.id
    INNER JOIN pregunta p ON ru.pregunta_id = p.id
    WHERE rc.asignatura_id = ${asignaturaId}
    GROUP BY ru.pregunta_id, p.pregunta, ru.respuesta, ru.es_correcta
    ORDER BY ru.pregunta_id, count DESC
  `

  return {
    promedio: Number.parseFloat(stats.promedio || "0"),
    mediana: Number.parseFloat(stats.mediana || "0"),
    rango_min: Number.parseFloat(stats.rango_min || "0"),
    rango_max: Number.parseFloat(stats.rango_max || "0"),
    total_participantes: Number.parseInt(stats.total_participantes || "0"),
    score_distribution: scoreDistribution as ScoreDistribution[],
    most_difficult_questions: mostDifficultQuestions as QuestionStats[],
    answer_distribution: answerDistribution as AnswerDistribution[],
  }
}

export async function getQuestionStatistics(asignaturaId: string): Promise<QuestionStats[]> {
  const result = await sql`
    SELECT 
      ru.pregunta_id,
      p.pregunta,
      COUNT(*) as total_respuestas,
      COUNT(CASE WHEN ru.es_correcta = true THEN 1 END) as respuestas_correctas,
      COUNT(CASE WHEN ru.es_correcta = false THEN 1 END) as respuestas_incorrectas,
      ROUND(
        (COUNT(CASE WHEN ru.es_correcta = true THEN 1 END) * 100.0 / COUNT(*)), 
        1
      ) as porcentaje_correctas
    FROM respuesta_usuario ru
    INNER JOIN resultado_examen rc ON ru.resultado_id = rc.id
    INNER JOIN pregunta p ON ru.pregunta_id = p.id
    WHERE rc.asignatura_id = ${asignaturaId}
    GROUP BY ru.pregunta_id, p.pregunta
    ORDER BY porcentaje_correctas ASC
  `

  return result as QuestionStats[]
}

export async function getAnswerDistributionByQuestion(preguntaId: string): Promise<AnswerDistribution[]> {
  const result = await sql`
    SELECT 
      ru.pregunta_id,
      p.pregunta,
      ru.respuesta,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 1) as percentage,
      ru.es_correcta
    FROM respuesta_usuario ru
    INNER JOIN pregunta p ON ru.pregunta_id = p.id
    WHERE ru.pregunta_id = ${preguntaId}
    GROUP BY ru.pregunta_id, p.pregunta, ru.respuesta, ru.es_correcta
    ORDER BY count DESC
  `

  return result as AnswerDistribution[]
}

export async function getRecentQuizResults(asignaturaId: string, limit = 50): Promise<QuizResult[]> {
  const result = await sql`
    SELECT id, asignatura_id, fecha, calificacion, num_preguntas, 
           preguntas_correctas, preguntas_incorrectas
    FROM resultado_examen
    WHERE asignatura_id = ${asignaturaId}
    ORDER BY fecha DESC
    LIMIT ${limit}
  `

  return result as QuizResult[]
}

export async function getQuizParticipantCount(asignaturaId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM resultado_examen
    WHERE asignatura_id = ${asignaturaId}
  `

  return Number.parseInt(result[0]?.count || "0")
}

// Funciones de RAG y Chunks
export async function insertPdfChunks(
  pdfId: string,
  asignaturaId: string,
  chunks: { text: string; embedding: number[] }[],
): Promise<void> {
  await sql`DELETE FROM embedding_chunks WHERE pdf_id = ${pdfId}`
  console.log(`🧹 Chunks antiguos del PDF ${pdfId} eliminados.`)

  await sql.transaction(
    chunks.map(
      (chunk) =>
        sql`
        INSERT INTO embedding_chunks (pdf_id, asignatura_id, chunk_text, embedding)
        VALUES (${pdfId}, ${asignaturaId}, ${chunk.text}, ${JSON.stringify(chunk.embedding)})
      `,
    ),
  )
  console.log(`✅ Insertados ${chunks.length} nuevos chunks para el PDF ${pdfId}`)
}

export async function insertPdfChunksWithMetadata(
  pdfId: string,
  asignaturaId: string,
  chunks: {
    text: string
    embedding: number[]
    metadata?: ChunkMetadata
  }[],
): Promise<void> {
  await sql`DELETE FROM embedding_chunks WHERE pdf_id = ${pdfId}`
  console.log(`🧹 Chunks antiguos del PDF ${pdfId} eliminados.`)

  const chunksWithMetadata = chunks.map((chunk, index) => ({
    pdf_id: pdfId,
    asignatura_id: asignaturaId,
    chunk_text: chunk.text,
    embedding: JSON.stringify(chunk.embedding),
    chunk_index: chunk.metadata?.chunk_index ?? index,
    section_title: chunk.metadata?.section_title?.substring(0, 100) ?? "Contenido",
    token_count: chunk.metadata?.token_count ?? chunk.text.split(" ").length,
    created_with_overlap: chunk.metadata?.created_with_overlap ?? false,
    page_number: chunk.metadata?.page_number ?? null,
  }))

  const BATCH_SIZE = 50
  for (let i = 0; i < chunksWithMetadata.length; i += BATCH_SIZE) {
    const batch = chunksWithMetadata.slice(i, i + BATCH_SIZE)

    await sql.transaction(
      batch.map(
        (chunk) =>
          sql`
          INSERT INTO embedding_chunks (
            pdf_id, asignatura_id, chunk_text, embedding,
            chunk_index, section_title, token_count, created_with_overlap, page_number
          )
          VALUES (
            ${chunk.pdf_id}, ${chunk.asignatura_id}, ${chunk.chunk_text}, ${chunk.embedding},
            ${chunk.chunk_index}, ${chunk.section_title}, ${chunk.token_count}, 
            ${chunk.created_with_overlap}, ${chunk.page_number}
          )
        `,
      ),
    )
  }

  console.log(`✅ Insertados ${chunks.length} chunks enriquecidos para el PDF ${pdfId}`)
}

export async function findSimilarChunks(
  asignaturaId: string,
  queryEmbedding: number[],
  match_count = 5,
): Promise<{ chunk_text: string }[]> {
  const result = await sql`
    SELECT chunk_text
    FROM embedding_chunks
    WHERE asignatura_id = ${asignaturaId}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}
    LIMIT ${match_count}
  `
  return result as { chunk_text: string }[]
}

export async function findSimilarChunksEnhanced(
  asignaturaId: string,
  queryEmbedding: number[],
  options: {
    match_count?: number
    similarity_threshold?: number
    include_overlap_chunks?: boolean
    section_filter?: string
    diversify_results?: boolean
  } = {},
): Promise<EnhancedChunk[]> {
  const {
    match_count = 8,
    similarity_threshold = 0.3,
    include_overlap_chunks = true,
    section_filter,
    diversify_results = true,
  } = options

  const whereConditions = [sql`asignatura_id = ${asignaturaId}`]

  if (section_filter) {
    whereConditions.push(sql`section_title ILIKE ${`%${section_filter}%`}`)
  }

  if (!include_overlap_chunks) {
    whereConditions.push(sql`created_with_overlap = FALSE`)
  }

  const whereClause = whereConditions.reduce((acc, condition, index) => {
    return index === 0 ? condition : sql`${acc} AND ${condition}`
  })

  if (diversify_results) {
    const result = await sql`
      WITH similarity_search AS (
        SELECT 
          chunk_text,
          COALESCE(section_title, 'Contenido') as section_title,
          COALESCE(chunk_index, 0) as chunk_index,
          COALESCE(token_count, 0) as token_count,
          COALESCE(created_with_overlap, false) as created_with_overlap,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) as similarity_score
        FROM embedding_chunks
        WHERE ${whereClause}
        AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) > ${similarity_threshold}
        ORDER BY similarity_score DESC
        LIMIT ${match_count * 2}
      ),
      diversified_results AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY section_title 
            ORDER BY similarity_score DESC
          ) as section_rank
        FROM similarity_search
      )
      SELECT 
        chunk_text,
        section_title,
        chunk_index,
        token_count,
        created_with_overlap,
        similarity_score
      FROM diversified_results
      WHERE section_rank <= 2  -- Máximo 2 chunks por sección
      ORDER BY similarity_score DESC, chunk_index ASC
      LIMIT ${match_count}
    `

    return result as EnhancedChunk[]
  } else {
    const result = await sql`
      SELECT 
        chunk_text,
        COALESCE(section_title, 'Contenido') as section_title,
        COALESCE(chunk_index, 0) as chunk_index,
        COALESCE(token_count, 0) as token_count,
        COALESCE(created_with_overlap, false) as created_with_overlap,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) as similarity_score
      FROM embedding_chunks
      WHERE ${whereClause}
      AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) > ${similarity_threshold}
      ORDER BY similarity_score DESC, chunk_index ASC
      LIMIT ${match_count}
    `

    return result as EnhancedChunk[]
  }
}

export async function hybridSearch(
  asignaturaId: string,
  query: string,
  queryEmbedding: number[],
  options: {
    match_count?: number
    keyword_weight?: number
    similarity_threshold?: number
  } = {},
): Promise<EnhancedChunk[]> {
  const { match_count = 8, keyword_weight = 0.3, similarity_threshold = 0.25 } = options

  const keywords = query
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 5)

  if (keywords.length === 0) {
    return findSimilarChunksEnhanced(asignaturaId, queryEmbedding, { match_count, similarity_threshold })
  }

  const keywordPatterns = keywords.map((k) => `%${k}%`)

  const result = await sql`
    WITH similarity_search AS (
      SELECT 
        chunk_text,
        COALESCE(section_title, 'Contenido') as section_title,
        COALESCE(chunk_index, 0) as chunk_index,
        COALESCE(token_count, 0) as token_count,
        COALESCE(created_with_overlap, false) as created_with_overlap,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) as similarity_score,
        -- Calcular puntaje de palabras clave
        (
          SELECT COUNT(*) 
          FROM unnest(${keywordPatterns}) AS pattern
          WHERE chunk_text ILIKE pattern
        )::float / ${keywords.length} as keyword_score
      FROM embedding_chunks
      WHERE asignatura_id = ${asignaturaId}
    ),
    scored_results AS (
      SELECT *,
        -- Puntaje híbrido combinado
        (similarity_score * (1 - ${keyword_weight})) + 
        (keyword_score * ${keyword_weight}) as hybrid_score
      FROM similarity_search
      WHERE similarity_score > ${similarity_threshold}
      OR keyword_score > 0
    )
    SELECT 
      chunk_text,
      section_title,
      chunk_index,
      token_count,
      created_with_overlap,
      hybrid_score as similarity_score
    FROM scored_results
    ORDER BY hybrid_score DESC, chunk_index ASC
    LIMIT ${match_count}
  `

  return result as EnhancedChunk[]
}

export async function getExpandedContext(
  pdfId: string,
  centerChunkIndex: number,
  contextWindow = 2,
): Promise<{
  before: EnhancedChunk[]
  center: EnhancedChunk | null
  after: EnhancedChunk[]
}> {
  const result = await sql`
    SELECT 
      chunk_text,
      COALESCE(section_title, 'Contenido') as section_title,
      COALESCE(chunk_index, 0) as chunk_index,
      COALESCE(token_count, 0) as token_count,
      COALESCE(created_with_overlap, false) as created_with_overlap,
      0.0 as similarity_score
    FROM embedding_chunks
    WHERE pdf_id = ${pdfId}
    AND chunk_index BETWEEN ${centerChunkIndex - contextWindow} AND ${centerChunkIndex + contextWindow}
    ORDER BY chunk_index ASC
  `

  const chunks = result as EnhancedChunk[]
  const centerIdx = chunks.findIndex((c) => c.chunk_index === centerChunkIndex)

  if (centerIdx === -1) {
    return { before: [], center: null, after: [] }
  }

  return {
    before: chunks.slice(0, centerIdx),
    center: chunks[centerIdx],
    after: chunks.slice(centerIdx + 1),
  }
}

export async function getChunkStats(asignaturaId: string): Promise<{
  total_chunks: number
  total_pdfs: number
  avg_chunk_size: number
  chunks_with_overlap: number
  sections: { section_title: string; count: number }[]
  pdf_stats: { filename: string; chunk_count: number; avg_similarity?: number }[]
}> {
  const generalStats = await sql`
    SELECT 
      COUNT(*) as total_chunks,
      COUNT(DISTINCT pdf_id) as total_pdfs,
      AVG(COALESCE(token_count, 0)) as avg_chunk_size,
      COUNT(CASE WHEN created_with_overlap = true THEN 1 END) as chunks_with_overlap
    FROM embedding_chunks
    WHERE asignatura_id = ${asignaturaId}
  `

  const sectionStats = await sql`
    SELECT 
      COALESCE(section_title, 'Sin título') as section_title,
      COUNT(*) as count
    FROM embedding_chunks
    WHERE asignatura_id = ${asignaturaId}
    GROUP BY section_title
    ORDER BY count DESC
    LIMIT 10
  `

  const pdfStats = await sql`
    SELECT 
      p.filename,
      COUNT(ec.id) as chunk_count
    FROM pdf p
    LEFT JOIN embedding_chunks ec ON p.id = ec.pdf_id
    WHERE p.asignatura_id = ${asignaturaId}
    GROUP BY p.id, p.filename
    ORDER BY chunk_count DESC
  `

  const stats = generalStats[0] || {}

  return {
    total_chunks: Number.parseInt(stats.total_chunks || "0"),
    total_pdfs: Number.parseInt(stats.total_pdfs || "0"),
    avg_chunk_size: Number.parseFloat(stats.avg_chunk_size || "0"),
    chunks_with_overlap: Number.parseInt(stats.chunks_with_overlap || "0"),
    sections: sectionStats as { section_title: string; count: number }[],
    pdf_stats: pdfStats as { filename: string; chunk_count: number }[],
  }
}

export async function searchChunksByText(
  asignaturaId: string,
  searchText: string,
  options: {
    exact_match?: boolean
    case_sensitive?: boolean
    limit?: number
  } = {},
): Promise<EnhancedChunk[]> {
  const { exact_match = false, case_sensitive = false, limit = 10 } = options

  let searchCondition

  if (exact_match) {
    searchCondition = case_sensitive ? sql`chunk_text = ${searchText}` : sql`LOWER(chunk_text) = LOWER(${searchText})`
  } else {
    const searchPattern = `%${searchText}%`
    searchCondition = case_sensitive ? sql`chunk_text LIKE ${searchPattern}` : sql`chunk_text ILIKE ${searchPattern}`
  }

  const result = await sql`
    SELECT 
      chunk_text,
      COALESCE(section_title, 'Contenido') as section_title,
      COALESCE(chunk_index, 0) as chunk_index,
      COALESCE(token_count, 0) as token_count,
      COALESCE(created_with_overlap, false) as created_with_overlap,
      0.0 as similarity_score
    FROM embedding_chunks
    WHERE asignatura_id = ${asignaturaId}
    AND ${searchCondition}
    ORDER BY chunk_index ASC
    LIMIT ${limit}
  `

  return result as EnhancedChunk[]
}
