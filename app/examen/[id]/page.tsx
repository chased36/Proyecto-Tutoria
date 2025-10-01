"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { QuestionWithAnswers, Subject } from "@/lib/db";
import { getExamDataAction } from "@/app/actions/exam-actions";

interface ExamInProgressPageProps {
  params: Promise<{ id: string }>;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface ShuffledQuestion extends QuestionWithAnswers {
  shuffledAnswers: string[];
}

export default function ExamInProgressPage({
  params,
}: ExamInProgressPageProps) {
  const router = useRouter();
  const { id: asignaturaId } = use(params);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeStarted, setTimeStarted] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExamData() {
      try {
        setLoading(true);
        setError(null);

        const result = await getExamDataAction(asignaturaId);

        if (!result.success || !result.subject) {
          setError(result.error || "Error al cargar el examen");
          return;
        }

        setSubject(result.subject);

        const shuffledQuestions = shuffleArray(result.subject.questions);

        const questionsWithShuffledAnswers: ShuffledQuestion[] =
          shuffledQuestions.map((question) => {
            const allAnswers = [
              question.respuesta_correcta,
              ...question.respuestas_incorrectas,
            ];
            const shuffledAnswers = shuffleArray(allAnswers);

            return {
              ...question,
              shuffledAnswers,
            };
          });

        setQuestions(questionsWithShuffledAnswers);
        setTimeStarted(Date.now());

        console.log(
          `✅ Examen cargado: ${questionsWithShuffledAnswers.length} preguntas mezcladas`
        );
      } catch (err) {
        setError("Error de conexión al cargar el examen");
        console.error("Error loading exam:", err);
      } finally {
        setLoading(false);
      }
    }

    loadExamData();
  }, [asignaturaId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting && Object.keys(selectedAnswers).length > 0) {
        const message =
          "¿Estás seguro que quieres salir? Se perderá tu progreso del examen.";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitting, selectedAnswers]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.warn("⚠️ Usuario salió de la pestaña durante el examen");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answer,
    });
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.respuesta_correcta) {
        correct++;
      }
    });
    return correct;
  };

  const handleSubmitExam = async () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      alert(
        "Debes responder todas las preguntas antes de finalizar el examen."
      );
      return;
    }

    const confirmSubmit = window.confirm(
      "¿Estás seguro de que deseas finalizar el examen? No podrás cambiar tus respuestas después."
    );

    if (!confirmSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const correctAnswers = calculateScore();
      const calificacion = (correctAnswers / questions.length) * 10;

      const respuestas = questions.map((question, index) => ({
        preguntaId: question.id,
        respuestaSeleccionada: selectedAnswers[index],
        esCorrecta: selectedAnswers[index] === question.respuesta_correcta,
      }));

      console.log("💾 Guardando resultado del examen...");

      const response = await fetch("/api/quiz/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asignaturaId,
          calificacion,
          numPreguntas: questions.length,
          preguntasCorrectas: correctAnswers,
          respuestas,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al guardar el resultado");
      }

      const result = await response.json();
      console.log("✅ Resultado guardado exitosamente");

      const timeSpent = timeStarted
        ? Math.floor((Date.now() - timeStarted) / 1000 / 60)
        : 0;

      const detailedAnswers = questions.map((question, index) => ({
        pregunta: question.pregunta,
        respuestaUsuario: selectedAnswers[index],
        respuestaCorrecta: question.respuesta_correcta,
        esCorrecta: selectedAnswers[index] === question.respuesta_correcta,
        todasLasOpciones: question.shuffledAnswers,
      }));

      sessionStorage.setItem(
        "examResult",
        JSON.stringify({
          resultadoId: result.resultado.id,
          score: correctAnswers,
          total: questions.length,
          calificacion: calificacion.toFixed(1),
          percentage: Math.round((correctAnswers / questions.length) * 100),
          timeSpent,
          fecha: result.resultado.fecha,
          subjectName: subject?.name || "Examen",
          detailedAnswers,
        })
      );

      console.log("➡️ Redirigiendo a resultados...");
      router.push(`/examen/${asignaturaId}/resultado`);
    } catch (error) {
      console.error("❌ Error al guardar el examen:", error);
      alert(
        "Hubo un error al guardar tu examen. Por favor, inténtalo de nuevo."
      );
      setIsSubmitting(false);
    }
  };

  const getProgressPercentage = () => {
    if (questions.length === 0) return 0;
    return Math.round(
      (Object.keys(selectedAnswers).length / questions.length) * 100
    );
  };

  const currentQ = questions[currentQuestion];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando examen...</p>
          <p className="text-gray-500 text-sm mt-2">Por favor espera</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Error al cargar el examen
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Sin preguntas disponibles
          </h2>
          <p className="text-gray-600 mb-6">
            No hay preguntas disponibles para este examen.
          </p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Pregunta {currentQuestion + 1} de {questions.length}
            </h2>
            <p className="text-sm text-gray-500">{subject?.name || "Examen"}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Progreso</div>
            <div className="text-xl font-bold text-blue-600">
              {getProgressPercentage()}%
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>

        <div className="flex flex-wrap gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-9 h-9 rounded-md text-xs font-semibold transition-all ${
                selectedAnswers[index]
                  ? "bg-green-500 text-white shadow-sm hover:bg-green-600"
                  : index === currentQuestion
                  ? "bg-blue-500 text-white shadow-md ring-2 ring-blue-300"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
              aria-label={`Ir a pregunta ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">
                {currentQuestion + 1}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 leading-relaxed flex-1">
              {currentQ.pregunta}
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          {currentQ.shuffledAnswers.map((answer, index) => {
            const isSelected = selectedAnswers[currentQuestion] === answer;
            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D

            return (
              <label
                key={index}
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current flex-shrink-0 mt-0.5">
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-700 min-w-[1.5rem]">
                      {optionLetter}.
                    </span>
                    <span className="text-gray-700 leading-relaxed">
                      {answer}
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  value={answer}
                  checked={isSelected}
                  onChange={() => handleAnswerSelect(currentQuestion, answer)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            ← Anterior
          </button>

          <div className="text-center px-4">
            {Object.keys(selectedAnswers).length < questions.length ? (
              <div className="flex items-center gap-2 text-amber-600">
                <span className="text-lg">⚠️</span>
                <p className="text-sm font-medium">
                  Faltan{" "}
                  {questions.length - Object.keys(selectedAnswers).length}{" "}
                  {questions.length - Object.keys(selectedAnswers).length === 1
                    ? "pregunta"
                    : "preguntas"}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-lg">✅</span>
                <p className="text-sm font-medium">
                  Todas las preguntas respondidas
                </p>
              </div>
            )}
          </div>

          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSubmitExam}
              disabled={
                Object.keys(selectedAnswers).length < questions.length ||
                isSubmitting
              }
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Enviando...
                </span>
              ) : (
                "Finalizar Examen ✓"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
