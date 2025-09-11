"use client";

import { useState, useEffect } from "react";
import type { PDF } from "@/lib/db";
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  BrainCircuit,
} from "lucide-react";
import { processAndStoreEmbeddingsAction } from "@/app/actions/subject-data-actions";

interface PDFStatusIndicatorProps {
  pdf: PDF;
}

function PDFStatusIndicator({ pdf: initialPdf }: PDFStatusIndicatorProps) {
  const [currentPdf, setCurrentPdf] = useState<PDF>(initialPdf);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  const status =
    currentPdf.task_status === "done" ? "completed" : currentPdf.task_status;

  useEffect(() => {
    if (status !== "pending" && status !== "processing") {
      return;
    }

    let intervalId: NodeJS.Timeout;
    let currentDelay = 3000;

    const checkStatus = async () => {
      if (!currentPdf.task_id) return;

      try {
        const response = await fetch(
          `/api/generate-embeddings/status/${currentPdf.task_id}`
        );
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(
              `Tarea ${currentPdf.task_id} no encontrada. Deteniendo polling.`
            );
            return;
          }
          throw new Error(
            `Error en la respuesta del servidor: ${response.statusText}`
          );
        }

        const data = await response.json();
        if (data.success && data.task) {
          setCurrentPdf((prevPdf) => ({ ...prevPdf, ...data.task }));
          if (data.task.task_status === "error") {
            setErrorMessage(data.task.error_message);
          }
        }
      } catch (error) {
        console.error("Fallo al verificar el estado de la tarea:", error);
        setCurrentPdf((prevPdf) => ({ ...prevPdf, task_status: "error" }));
        setErrorMessage("No se pudo verificar el estado.");
      }
    };

    const scheduleNextCheck = () => {
      intervalId = setTimeout(() => {
        const currentStatus = currentPdf.task_status;
        if (currentStatus === "pending" || currentStatus === "processing") {
          checkStatus();
          currentDelay = Math.min(currentDelay * 1.5, 30000);
          scheduleNextCheck();
        }
      }, currentDelay);
    };

    scheduleNextCheck();

    return () => clearTimeout(intervalId);
  }, [currentPdf.task_id, currentPdf.task_status]);

  const handleSync = async () => {
    if (!currentPdf.embeddings_url) {
      alert(
        "El conocimiento aún no está listo o la información no se ha refrescado."
      );
      return;
    }
    setIsSyncing(true);
    const result = await processAndStoreEmbeddingsAction(
      currentPdf.id,
      currentPdf.asignatura_id,
      currentPdf.embeddings_url
    );
    if (!result.success) {
      alert(`Error al sincronizar con TUTOR-IA: ${result.error}`);
    } else {
      alert(
        "¡Sincronización con TUTOR-IA completada! El chatbot ahora puede usar este documento."
      );
      setIsSynced(true);
    }
    setIsSyncing(false);
  };

  const renderStatus = () => {
    if (isSynced) {
      return (
        <span
          className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
          title="El conocimiento de este PDF ha sido sincronizado con TUTOR-IA."
        >
          <BrainCircuit size={12} /> TUTOR-IA Ready
        </span>
      );
    }

    switch (status) {
      case "pending":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded"
            title="En cola para ser procesado"
          >
            <Clock size={12} /> Pendiente
          </span>
        );
      case "processing":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
            title="Generando conocimiento..."
          >
            <Loader2 size={12} className="animate-spin" /> Procesando...
          </span>
        );
      case "completed":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
            title="El conocimiento está listo para ser sincronizado con TUTOR-IA"
          >
            <CheckCircle size={12} /> Conocimiento para sincronizar
          </span>
        );
      case "error":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded cursor-help"
            title={errorMessage || "Ocurrió un error desconocido"}
          >
            <AlertCircle size={12} /> Error
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <li
      key={currentPdf.id}
      className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 rounded-md"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText size={16} className="text-gray-500 flex-shrink-0" />
        <span className="text-gray-700 truncate" title={currentPdf.filename}>
          {currentPdf.filename}
        </span>
        {renderStatus()}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {status === "completed" && !isSynced && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1.5 text-gray-500 hover:bg-purple-100 hover:text-purple-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Sincronizar conocimiento con TUTOR-IA"
          >
            {isSyncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <BrainCircuit size={16} />
            )}
          </button>
        )}
        <a
          href={currentPdf.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Ver PDF
        </a>
      </div>
    </li>
  );
}

interface PDFViewerProps {
  pdfs: PDF[];
}

export function PDFViewer({ pdfs }: PDFViewerProps) {
  if (pdfs.length === 0) {
    return (
      <p className="text-gray-500 text-sm mt-2">
        No hay PDFs en esta asignatura.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">PDFs guardados:</h4>
      <ul className="space-y-1">
        {pdfs.map((pdf) => (
          <PDFStatusIndicator key={pdf.id} pdf={pdf} />
        ))}
      </ul>
    </div>
  );
}
