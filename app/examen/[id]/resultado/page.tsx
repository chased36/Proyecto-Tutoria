"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ExamResultPageProps {
  params: Promise<{ id: string }>;
}

interface DetailedAnswer {
  pregunta: string;
  respuestaUsuario: string;
  respuestaCorrecta: string;
  esCorrecta: boolean;
  todasLasOpciones: string[];
}

interface ExamResultData {
  resultadoId: string;
  score: number;
  total: number;
  calificacion: string;
  percentage: number;
  timeSpent: number;
  fecha: string;
  subjectName: string;
  detailedAnswers: DetailedAnswer[];
}

export default function ExamResultPage({ params }: ExamResultPageProps) {
  const router = useRouter();
  const { id: asignaturaId } = use(params);
  const [resultData, setResultData] = useState<ExamResultData | null>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem("examResult");

    if (!storedData) {
      router.push(`/examen/${asignaturaId}`);
      return;
    }

    const data = JSON.parse(storedData) as ExamResultData;
    setResultData(data);
  }, [asignaturaId, router]);

  if (!resultData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-blue-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeMessage = (percentage: number) => {
    if (percentage >= 90) return "¡Excelente trabajo!";
    if (percentage >= 70) return "¡Buen trabajo!";
    if (percentage >= 50) return "Aprobado, pero puedes mejorar";
    return "Necesitas repasar el material";
  };

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Examen Completado!
          </h1>
          <p className="text-gray-600">{resultData.subjectName}</p>
        </div>

        <div className="flex justify-center items-center gap-8 mb-8">
          <div className="text-center">
            <div
              className={`text-6xl font-bold ${getGradeColor(
                resultData.percentage
              )} mb-2`}
            >
              {resultData.calificacion}
            </div>
            <p className="text-gray-600 text-sm">de 10.0</p>
          </div>

          <div className="border-l-2 border-gray-300 h-20"></div>

          <div className="text-center">
            <div
              className={`text-6xl font-bold ${getGradeColor(
                resultData.percentage
              )} mb-2`}
            >
              {resultData.percentage}%
            </div>
            <p className="text-gray-600 text-sm">Porcentaje</p>
          </div>
        </div>

        <div className="text-center mb-6">
          <p
            className={`text-xl font-semibold ${getGradeColor(
              resultData.percentage
            )}`}
          >
            {getGradeMessage(resultData.percentage)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {resultData.score}
            </div>
            <p className="text-sm text-green-700">Correctas</p>
          </div>

          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <div className="text-3xl font-bold text-red-600 mb-1">
              {resultData.total - resultData.score}
            </div>
            <p className="text-sm text-red-700">Incorrectas</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progreso del examen</span>
            <span>
              {resultData.score} / {resultData.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                resultData.percentage >= 70
                  ? "bg-green-500"
                  : resultData.percentage >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${resultData.percentage}%` }}
            ></div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href={`/asignatura/${asignaturaId}`}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            Volver a la Asignatura
          </Link>
        </div>
      </div>
    </div>
  );
}
