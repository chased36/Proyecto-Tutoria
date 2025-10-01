"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import SubjectSelector from "../../../components/ui/Estadisticas/SubjectSelector";
import GeneralStats from "../../../components/ui/Estadisticas/GeneralStats";
import DifficultQuestions from "../../../components/ui/Estadisticas/DifficultQuestions";
import AnswerDistribution from "../../../components/ui/Estadisticas/AnswerDistribution";

interface QuizStatistics {
  promedio: number;
  mediana: number;
  rango_min: number;
  rango_max: number;
  total_participantes: number;
  score_distribution: Array<{
    calificacion: number;
    count: number;
    percentage: number;
  }>;
  most_difficult_questions: Array<{
    pregunta_id: string;
    pregunta: string;
    total_respuestas: number;
    respuestas_correctas: number;
    respuestas_incorrectas: number;
    porcentaje_correctas: number;
  }>;
  question_distributions: Array<{
    pregunta_id: string;
    pregunta: string;
    total_respuestas: number;
    respuestas_correctas: number;
    distribution: Array<{
      pregunta_id: string;
      pregunta: string;
      respuesta: string;
      count: number;
      percentage: number;
      es_correcta: boolean;
    }>;
  }>;
}

export default function EstadisticasPage() {
  const [selectedSubject, setSelectedSubject] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubjectSelect = async (
    subjectId: string,
    subjectName: string
  ) => {
    setSelectedSubject({ id: subjectId, name: subjectName });
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/statistics?asignaturaId=${subjectId}`);
      if (!response.ok) {
        throw new Error("Error al obtener estadísticas");
      }
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      setError("No se pudieron cargar las estadísticas");
      console.error("Error fetching statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Estadísticas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <SubjectSelector onSubjectSelect={handleSubjectSelect} />
        </div>

        <div className="lg:col-span-3">
          {!selectedSubject && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">
                    Selecciona una asignatura para ver las estadísticas
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-500">Cargando estadísticas...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center text-red-500">
                  <p className="text-lg">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {statistics && !loading && (
            <div className="space-y-8">
              {/* Estadísticas Generales */}
              <GeneralStats
                promedio={statistics.promedio}
                mediana={statistics.mediana}
                rangoMin={statistics.rango_min}
                rangoMax={statistics.rango_max}
                totalParticipantes={statistics.total_participantes}
                scoreDistribution={statistics.score_distribution}
              />

              {/* Preguntas Difíciles */}
              {statistics.most_difficult_questions.length > 0 && (
                <DifficultQuestions
                  questions={statistics.most_difficult_questions}
                />
              )}

              {/* Distribución de Respuestas por Pregunta */}
              {statistics.question_distributions.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">
                    Distribución de respuestas por pregunta
                  </h2>
                  {statistics.question_distributions.map((question, index) => (
                    <AnswerDistribution
                      key={question.pregunta_id}
                      questionId={question.pregunta_id}
                      questionText={question.pregunta}
                      questionIndex={index + 1}
                      answers={question.distribution}
                      totalCorrect={question.respuestas_correctas}
                      totalAnswers={question.total_respuestas}
                    />
                  ))}
                </div>
              )}

              {statistics.total_participantes === 0 && (
                <Card>
                  <CardContent className="flex items-center justify-center py-16">
                    <div className="text-center text-gray-500">
                      <p className="text-lg">
                        No hay datos de exámenes para esta asignatura
                      </p>
                      <p className="text-sm mt-2">
                        Los estudiantes necesitan completar al menos un examen
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
