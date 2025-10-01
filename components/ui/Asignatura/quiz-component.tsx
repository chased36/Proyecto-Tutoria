"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { QuestionWithAnswers } from "@/lib/db";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

interface QuizComponentProps {
  questions: QuestionWithAnswers[];
  subjectId: string;
  onExamComplete?: () => void;
}

export function QuizComponent({
  questions,
  subjectId,
  onExamComplete,
}: QuizComponentProps) {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});
  const [showResults, setShowResults] = useState(false);
  const [examStartTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - examStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [examStartTime]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-500 text-lg">No hay preguntas disponibles</p>
      </div>
    );
  }

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    if (showResults) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: answer,
    }));
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

  const getScorePercentage = () => {
    const score = calculateScore();
    return Math.round((score / questions.length) * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSubmitExam = async () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      const unanswered = questions.length - Object.keys(selectedAnswers).length;
      const confirm = window.confirm(
        `Tienes ${unanswered} pregunta(s) sin responder. ¿Estás seguro de que quieres finalizar el examen?`
      );
      if (!confirm) return;
    }

    setIsSubmitting(true);

    try {
      const score = calculateScore();
      const percentage = getScorePercentage();

      const respuestas = questions.map((question, index) => ({
        preguntaId: question.id,
        respuestaSeleccionada: selectedAnswers[index] || "",
        esCorrecta: selectedAnswers[index] === question.respuesta_correcta,
      }));

      console.log("Resultado del examen:", {
        subjectId,
        score,
        totalQuestions: questions.length,
        percentage,
        timeElapsed,
        respuestas,
      });

      setShowResults(true);
      if (onExamComplete) {
        onExamComplete();
      }
    } catch (error) {
      console.error("Error al guardar resultados:", error);
      alert(
        "Hubo un error al guardar los resultados. Por favor, inténtalo de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const jumpToQuestion = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
  };

  const currentQ = questions[currentQuestion];
  const [shuffledAnswers] = useState(() => {
    return questions.map((question) => {
      const allAnswers = [
        question.respuesta_correcta,
        ...question.respuestas_incorrectas,
      ];
      return allAnswers.sort(() => Math.random() - 0.5);
    });
  });

  const currentAnswers = shuffledAnswers[currentQuestion];

  if (showResults) {
    const score = calculateScore();
    const percentage = getScorePercentage();

    return (
      <div className="text-center space-y-6">
        <div className="mb-8">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Examen Completado!
          </h2>
          <p className="text-gray-600">Has finalizado el examen exitosamente</p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-8 rounded-xl border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-1">
                {score}
              </div>
              <div className="text-sm text-gray-600">Respuestas Correctas</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-1">
                {percentage}%
              </div>
              <div className="text-sm text-gray-600">Puntuación</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-1">
                {formatTime(timeElapsed)}
              </div>
              <div className="text-sm text-gray-600">Tiempo Total</div>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className={`h-4 rounded-full transition-all duration-1000 ${
                percentage >= 80
                  ? "bg-green-500 w-full"
                  : percentage >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              data-percentage={percentage}
              style={{
                width:
                  percentage >= 80
                    ? "100%"
                    : percentage >= 60
                    ? `${Math.max(percentage, 60)}%`
                    : `${Math.max(percentage, 10)}%`,
              }}
            ></div>
          </div>

          <p className="text-lg font-medium text-gray-700">
            {percentage >= 80
              ? "🎉 ¡Excelente trabajo!"
              : percentage >= 60
              ? "👍 Buen esfuerzo"
              : "💪 Sigue practicando"}
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6 text-left">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Resumen Detallado
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Total de preguntas:</span>
              <span className="ml-2">{questions.length}</span>
            </div>
            <div>
              <span className="font-medium">Respondidas:</span>
              <span className="ml-2">
                {Object.keys(selectedAnswers).length}
              </span>
            </div>
            <div>
              <span className="font-medium">Correctas:</span>
              <span className="ml-2 text-green-600 font-medium">{score}</span>
            </div>
            <div>
              <span className="font-medium">Incorrectas:</span>
              <span className="ml-2 text-red-600 font-medium">
                {questions.length - score}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/asignatura/${subjectId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors w-full md:w-auto"
          >
            Regresar a la Asignatura
          </button>

          <div className="text-sm text-gray-500">
            Los resultados han sido registrados automáticamente
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-4 mb-2 md:mb-0">
          <h3 className="text-lg font-semibold text-gray-800">
            Pregunta {currentQuestion + 1} de {questions.length}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} />
            <span>{formatTime(timeElapsed)}</span>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium text-green-600">
            {Object.keys(selectedAnswers).length}
          </span>{" "}
          de <span className="font-medium">{questions.length}</span> respondidas
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => jumpToQuestion(index)}
              className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                index === currentQuestion
                  ? "bg-blue-600 text-white"
                  : selectedAnswers[index]
                  ? "bg-green-100 text-green-700 border-2 border-green-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h4 className="text-xl font-medium mb-6 text-gray-800 leading-relaxed">
          {currentQ.pregunta}
        </h4>

        <div className="space-y-3">
          {currentAnswers.map((answer, index) => (
            <label
              key={index}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                selectedAnswers[currentQuestion] === answer
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name={`question-${currentQuestion}`}
                value={answer}
                checked={selectedAnswers[currentQuestion] === answer}
                onChange={() => handleAnswerSelect(currentQuestion, answer)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 leading-relaxed">{answer}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQuestion === 0}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={16} />
          Anterior
        </button>

        <div className="flex items-center gap-3">
          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={goToNextQuestion}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Siguiente
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Finalizar Examen
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
