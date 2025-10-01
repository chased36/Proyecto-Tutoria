import { NextResponse } from "next/server"
import { getQuizStatistics, getAnswerDistributionByQuestion } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const asignaturaId = searchParams.get("asignaturaId")

    if (!asignaturaId) {
      return NextResponse.json({ error: "Se requiere asignaturaId" }, { status: 400 })
    }

    const statistics = await getQuizStatistics(asignaturaId)

    const questionDistributions = await Promise.all(
      statistics.most_difficult_questions.map(async (question) => {
        const distribution = await getAnswerDistributionByQuestion(question.pregunta_id)
        return {
          pregunta_id: question.pregunta_id,
          pregunta: question.pregunta,
          total_respuestas: question.total_respuestas,
          respuestas_correctas: question.respuestas_correctas,
          distribution,
        }
      }),
    )

    return NextResponse.json({
      ...statistics,
      question_distributions: questionDistributions,
    })
  } catch (error) {
    console.error("Error fetching statistics:", error)
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 })
  }
}
