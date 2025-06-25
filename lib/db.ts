import { neon } from "@neondatabase/serverless"
import { deleteMultiplePDFsFromBlob, deletePDFFromBlob } from "./blob"

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

  // 1. Obtener y eliminar todos los PDFs asociados
  const pdfs = await sql`
    SELECT id, url FROM pdf WHERE asignatura_id = ${id}
  `

  console.log(`La asignatura tiene ${pdfs.length} PDFs para eliminar`)

  // Eliminar los archivos PDF de Vercel Blob
  const pdfUrls = pdfs.map((pdf: any) => pdf.url)
  await deleteMultiplePDFsFromBlob(pdfUrls)

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

// Mejora de la función getSubjectById para depuración y manejo de errores
export async function getSubjectById(id: string): Promise<Subject | null> {
  try {
    console.log(`Buscando asignatura con ID: ${id}`)

    // Verificar que el ID no esté vacío
    if (!id) {
      console.error("ID de asignatura vacío o inválido")
      return null
    }

    // Obtener la asignatura básica
    const subjectResult = await sql`
      SELECT id, name, semestre_id, created_at
      FROM asignatura 
      WHERE id = ${id}
    `

    console.log(`Resultado de la consulta:`, subjectResult)

    if (!subjectResult || subjectResult.length === 0) {
      console.log(`No se encontró ninguna asignatura con ID: ${id}`)
      return null
    }

    const subject = subjectResult[0]
    console.log(`Asignatura encontrada: ${subject.name}`)

    // Obtener PDFs, videos y preguntas
    const [pdfs, videos, questions] = await Promise.all([
      getPDFsBySubject(id),
      getVideosBySubject(id),
      getQuestionsBySubject(subject.id),
    ])

    console.log(`PDFs: ${pdfs.length}, Videos: ${videos.length}, Preguntas: ${questions.length}`)

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
    SELECT id, filename, url, asignatura_id, created_at
    FROM pdf 
    WHERE asignatura_id = ${subjectId}
    ORDER BY created_at DESC
  `
  return result as PDF[]
}

export async function createPDF(filename: string, url: string, subjectId: string): Promise<PDF> {
  const result = await sql`
    INSERT INTO pdf (id, filename, url, asignatura_id, created_at)
    VALUES (gen_random_uuid(), ${filename}, ${url}, ${subjectId}, NOW())
    RETURNING id, filename, url, asignatura_id, created_at
  `
  return result[0] as PDF
}

export async function deletePDF(id: string): Promise<void> {
  // Primero obtenemos la URL del PDF
  const pdf = await sql`
    SELECT url FROM pdf WHERE id = ${id}
  `

  if (pdf && pdf.length > 0) {
    // Eliminar el archivo de Vercel Blob
    await deletePDFFromBlob(pdf[0].url)

    // Eliminar la referencia de la base de datos
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
