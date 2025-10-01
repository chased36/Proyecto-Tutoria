"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Subject } from "@/lib/db";
import { QuizComponent } from "./quiz-component";
import Izt from "../../../public/LogoOro.png";

interface ExamInterfaceProps {
  subject: Subject;
  subjectId: string;
}

export function ExamInterface({ subject, subjectId }: ExamInterfaceProps) {
  const router = useRouter();
  const [examStarted, setExamStarted] = useState(false);
  const [beforeUnloadEnabled, setBeforeUnloadEnabled] = useState(false);

  useEffect(() => {
    if (!examStarted || !beforeUnloadEnabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "¿Estás seguro de que quieres abandonar el examen? Se perderá todo tu progreso.";
      return "¿Estás seguro de que quieres abandonar el examen? Se perderá todo tu progreso.";
    };

    const handlePopState = (e: PopStateEvent) => {
      const confirmLeave = window.confirm(
        "¿Estás seguro de que quieres abandonar el examen? Se perderá todo tu progreso."
      );
      if (!confirmLeave) {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [examStarted, beforeUnloadEnabled]);

  const handleStartExam = () => {
    setExamStarted(true);
    setBeforeUnloadEnabled(true);
  };

  const handleExamComplete = () => {
    setBeforeUnloadEnabled(false);
  };

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-[#012243] text-white py-4 shadow-md">
          <div className="container mx-auto px-4 flex items-center justify-center">
            <Image src={Izt} alt="LogoOro" height={60} priority />
          </div>
        </header>

        <div className="max-w-2xl mx-auto p-6 mt-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                📝 Examen: {subject.name}
              </h1>
              <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg mb-6">
                <AlertTriangle size={20} />
                <span className="font-medium">Modo Examen Activado</span>
              </div>
            </div>

            <div className="space-y-6 text-left">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">
                  📊 Información del Examen:
                </h3>
                <ul className="text-blue-700 space-y-1">
                  <li>
                    • <strong>{subject.questions.length}</strong> preguntas en
                    total
                  </li>
                  <li>• Todas las preguntas son de selección múltiple</li>
                  <li>
                    • Debes responder todas las preguntas para ver los
                    resultados
                  </li>
                  <li>
                    • Solo tienes <strong>un intento</strong> por examen
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">
                  ⚠️ Restricciones Importantes:
                </h3>
                <ul className="text-red-700 space-y-1">
                  <li>
                    • <strong>NO</strong> podrás salir de esta página durante el
                    examen
                  </li>
                  <li>
                    • <strong>NO</strong> tendrás acceso al chatbot TUTOR-IA
                  </li>
                  <li>
                    • <strong>NO</strong> podrás consultar los textos o videos
                  </li>
                  <li>• Si recargas la página, perderás todo tu progreso</li>
                </ul>
              </div>

              <div className="text-center pt-6">
                <button
                  onClick={handleStartExam}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
                >
                  🚀 Comenzar Examen
                </button>

                <div className="mt-4">
                  <Link
                    href={`/asignatura/${subjectId}`}
                    className="text-gray-500 hover:text-gray-700 underline text-sm"
                  >
                    ← Regresar a la asignatura
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#012243] text-white py-3 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src={Izt} alt="LogoOro" height={40} priority />
            <div>
              <h2 className="font-semibold">Examen en Progreso</h2>
              <p className="text-sm text-blue-200">{subject.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-sm">
            <span className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></span>
            <span>Modo Examen</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <QuizComponent
            questions={subject.questions}
            subjectId={subjectId}
            onExamComplete={handleExamComplete}
          />
        </div>
      </main>
    </div>
  );
}
