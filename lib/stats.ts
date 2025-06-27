import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export type DashboardStats = {
  semestres: number
  asignaturas: number
  pdfs: number
  videos: number
  preguntas: number
  usuarios: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [semestres, asignaturas, pdfs, videos, preguntas, usuarios] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM semestre`,
    sql`SELECT COUNT(*) as count FROM asignatura`,
    sql`SELECT COUNT(*) as count FROM pdf`,
    sql`SELECT COUNT(*) as count FROM videos`,
    sql`SELECT COUNT(*) as count FROM pregunta`,
    sql`SELECT COUNT(*) as count FROM usuarios`,
  ])

  return {
    semestres: Number(semestres[0].count),
    asignaturas: Number(asignaturas[0].count),
    pdfs: Number(pdfs[0].count),
    videos: Number(videos[0].count),
    preguntas: Number(preguntas[0].count),
    usuarios: Number(usuarios[0].count),
  }
}
