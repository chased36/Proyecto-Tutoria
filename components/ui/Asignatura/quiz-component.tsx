"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuestionWithAnswers } from "@/lib/db";

interface QuizComponentProps {
  questions: QuestionWithAnswers[];
  subjectId: string;
}

export function QuizComponent({ questions, subjectId }: QuizComponentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});
  const [showResults, setShowResults] = useState(false);

  if (questions.length === 0) {
    return (
      <p className="text-gray-500 text-sm">No hay preguntas disponibles</p>
    );
  }

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

  const currentQ = questions[currentQuestion];
  const allAnswers = [
    currentQ.respuesta_correcta,
    ...currentQ.respuestas_incorrectas,
  ].sort(() => Math.random() - 0.5);

  return (
    <div className="space-y-4">
      {!showResults ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">
              Pregunta {currentQuestion + 1} de {questions.length}
            </h4>
            <div className="text-sm text-gray-500">
              {Object.keys(selectedAnswers).length} de {questions.length}{" "}
              respondidas
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium mb-4">{currentQ.pregunta}</h5>
            <div className="space-y-2">
              {allAnswers.map((answer, index) => (
                <label
                  key={index}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion}`}
                    value={answer}
                    checked={selectedAnswers[currentQuestion] === answer}
                    onChange={() => handleAnswerSelect(currentQuestion, answer)}
                    className="text-blue-600"
                  />
                  <span>{answer}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() =>
                setCurrentQuestion(Math.max(0, currentQuestion - 1))
              }
              disabled={currentQuestion === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
            >
              Anterior
            </button>

            {currentQuestion < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={() => setShowResults(true)}
                disabled={
                  Object.keys(selectedAnswers).length < questions.length
                }
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Ver Resultados
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center">
          <h4 className="text-2xl font-bold mb-4">Resultados del Quiz</h4>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {calculateScore()} / {questions.length}
          </div>
          <div className="text-gray-600 mb-4">
            {Math.round((calculateScore() / questions.length) * 100)}% de
            respuestas correctas
          </div>
          <Link
            href={`/asignatura/${subjectId}`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
          >
            Volver a la asignatura
          </Link>
        </div>
      )}
    </div>
  );
}
