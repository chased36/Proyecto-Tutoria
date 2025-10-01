"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionStats {
  pregunta_id: string;
  pregunta: string;
  total_respuestas: number | string;
  respuestas_correctas: number | string;
  respuestas_incorrectas: number | string;
  porcentaje_correctas: number | string;
}

interface DifficultQuestionsProps {
  questions: QuestionStats[];
}

export default function DifficultQuestions({
  questions,
}: DifficultQuestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Preguntas con respuestas incorrectas más frecuentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 font-semibold pb-2 border-b">
            <div>Pregunta</div>
            <div className="text-right">Respuestas correctas</div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay datos suficientes para mostrar estadísticas
            </div>
          ) : (
            questions.map((question, index) => {
              const totalRespuestas = Number(question.total_respuestas) || 0;
              const respuestasCorrectas =
                Number(question.respuestas_correctas) || 0;
              const porcentajeCorrectas =
                Number(question.porcentaje_correctas) || 0;

              return (
                <div
                  key={question.pregunta_id}
                  className="grid grid-cols-2 gap-4 py-3 border-b hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">Pregunta {index + 1}</span>
                    <span className="text-sm text-gray-700">
                      {question.pregunta}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-semibold">
                      {respuestasCorrectas}/{totalRespuestas}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({porcentajeCorrectas.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
