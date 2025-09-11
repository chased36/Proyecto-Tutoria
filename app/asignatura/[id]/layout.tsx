"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ChatbotModal } from "@/components/chatbot/chatbot-modal";
import { Menu, FileText, Video, HelpCircle, X, Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import { getSubjectDataAction } from "@/app/actions/subject-data-actions";
import type { Subject } from "@/lib/db";
import { Button } from "@/components/ui/button";

interface SubjectLayoutProps {
  children: ReactNode;
  params: { id: string };
}

export default function SubjectLayout({
  children,
  params,
}: SubjectLayoutProps) {
  const { id } = params;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [semesterName, setSemesterName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChatbotModal, setShowChatbotModal] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getSubjectDataAction(id);
        if (result.error) {
          setError(
            result.error || "Error desconocido al cargar la asignatura."
          );
          setSubject(null);
          setSemesterName(null);
        } else {
          setSubject(result.subject);
          setSemesterName(result.semesterName);
        }
      } catch (err) {
        console.error("Error en useEffect al cargar datos:", err);
        setError(
          `Error de conexión: ${
            err instanceof Error ? err.message : "Error desconocido"
          }`
        );
        setSubject(null);
        setSemesterName(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando asignatura...</p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-6">
        <p className="text-red-600">Error: {error}</p>
        <p className="text-gray-500">
          Por favor, intenta recargar la página o contacta al soporte.
        </p>
      </main>
    );
  }

  if (!subject) {
    return (
      <main className="container mx-auto px-4 py-6">
        <p className="text-red-600">Asignatura no encontrada.</p>
      </main>
    );
  }

  const sidebarItems = [
    {
      href: `/asignatura/${subject.id}/textos`,
      icon: FileText,
      label: "Textos",
      count: subject.pdfs.length,
      available: subject.pdfs.length > 0,
    },
    {
      href: `/asignatura/${subject.id}/videos`,
      icon: Video,
      label: "Videos",
      count: subject.videos.length,
      available: subject.videos.length > 0,
    },
    {
      href: `/asignatura/${subject.id}/Examen`,
      icon: HelpCircle,
      label: "Examen",
      count: subject.questions.length,
      available: subject.questions.length > 0,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-30 flex-shrink-0">
        <nav className="container mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-blue-700 p-2 rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/" className="hover:underline">
              ← Inicio
            </Link>
            <Link
              href={`/?semester=${subject.semestre_id}`}
              className="hover:underline"
            >
              {semesterName}
            </Link>
            <Link
              href={`/asignatura/${id}`}
              className="hover:underline font-semibold"
            >
              {subject.name}
            </Link>
          </div>
        </nav>
      </header>

      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          bg-blue-200 text-gray-800 shadow-lg border-r
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          w-64 h-full md:hidden
          overflow-y-auto
        `}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Navegación</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="hover:bg-gray-100 p-1 rounded"
              title="Cerrar menú"
            >
              <X size={16} />
            </button>
          </div>
          <nav className="space-y-2">
            {sidebarItems.map((item, index) => {
              const isActive = pathname === item.href;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.available ? item.href : "#"}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    item.available
                      ? isActive
                        ? "bg-blue-300 text-blue-700"
                        : "hover:bg-gray-200 text-gray-700"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                  title={item.label}
                  onClick={() => setSidebarOpen(false)}
                >
                  <IconComponent
                    size={20}
                    className="min-w-[20px] min-h-[20px]"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="text-xs text-gray-500">
                      Paso {index + 1}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {!item.available && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      No disponible
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 p-3">
            <Button
              onClick={() => {
                setShowChatbotModal(true);
                setSidebarOpen(false);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-3 h-auto"
            >
              TUTOR-IA
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            flex-shrink-0
            bg-blue-200 text-gray-800 shadow-lg border-r
            transition-all duration-300
            hidden md:flex flex-col
            ${sidebarOpen ? "w-64" : "w-16"}
            overflow-y-auto
          `}
        >
          <div className="p-4">
            {sidebarOpen && (
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-800">Navegación</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="hover:bg-gray-100 p-1 rounded"
                  title="Cerrar menú"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <nav className="space-y-2">
              {sidebarItems.map((item, index) => {
                const isActive = pathname === item.href;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.available ? item.href : "#"}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      item.available
                        ? isActive
                          ? "bg-blue-300 text-blue-700"
                          : "hover:bg-gray-200 text-gray-700"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                    title={sidebarOpen ? undefined : item.label}
                  >
                    <IconComponent
                      size={20}
                      className="min-w-[20px] min-h-[20px]"
                    />
                    {sidebarOpen && (
                      <div className="flex flex-col flex-1">
                        <span className="text-xs text-gray-500">
                          Paso {index + 1}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </div>
                    )}
                    {!item.available && sidebarOpen && (
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                        No disponible
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8">
              <button
                onClick={() => setShowChatbotModal(true)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white w-full ${
                  sidebarOpen ? "justify-start" : "justify-center"
                }`}
                title={sidebarOpen ? undefined : "TUTOR-IA"}
              >
                <Bot size={20} className="min-w-[20px] min-h-[20px]" />
                {sidebarOpen && (
                  <span className="font-medium text-lg">TUTOR-IA</span>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">{children}</div>
        </main>
      </div>

      {/* Chatbot Modal (renderizado condicionalmente) */}
      {subject && showChatbotModal && (
        <ChatbotModal
          subjectId={subject.id}
          subjectName={subject.name}
          isOpen={showChatbotModal}
          onClose={() => setShowChatbotModal(false)}
        />
      )}
    </div>
  );
}
