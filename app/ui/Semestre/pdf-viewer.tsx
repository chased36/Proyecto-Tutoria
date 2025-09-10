"use client";

import { useState, useEffect } from "react";
import type { PDF } from "@/lib/db";
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";

// --- Subcomponente para el Indicador de Estado Individual ---
// Este componente ahora contiene toda la lógica de polling inteligente.

interface PDFStatusIndicatorProps {
  pdf: PDF;
}

function PDFStatusIndicator({ pdf }: PDFStatusIndicatorProps) {
  const [status, setStatus] = useState(pdf.task_status);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Solo inicia el polling si la tarea está en un estado intermedio.
    if (status !== "pending" && status !== "processing") {
      return;
    }

    let intervalId: NodeJS.Timeout;
    let currentDelay = 3000; // Inicia con 3 segundos

    const checkStatus = async () => {
      // Si no tenemos un task_id, no podemos verificar el estado.
      if (!pdf.task_id) return;

      try {
        const response = await fetch(
          `/api/generate-embeddings/status/${pdf.task_id}`
        );

        if (response.status === 504) {
          console.warn(
            `Gateway Timeout para la tarea ${pdf.task_id}. Reintentando...`
          );
          // No actualizamos el estado, simplemente esperamos al siguiente intervalo.
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Error en la respuesta del servidor: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success && data.task) {
          const newStatus = data.task.task_status;
          setStatus(newStatus);
          if (newStatus === "error") {
            setErrorMessage(data.task.error_message);
          }
        }
      } catch (error) {
        console.error("Fallo al verificar el estado de la tarea:", error);
        setStatus("error");
        setErrorMessage("No se pudo verificar el estado.");
      }
    };

    const scheduleNextCheck = () => {
      intervalId = setTimeout(() => {
        checkStatus();
        // Duplica el retraso para la siguiente vez, hasta un máximo de 30 segundos.
        currentDelay = Math.min(currentDelay * 2, 30000);
        if (status === "pending" || status === "processing") {
          scheduleNextCheck();
        }
      }, currentDelay);
    };

    scheduleNextCheck();

    // Limpia el timeout cuando el componente se desmonta o el estado finaliza.
    return () => clearTimeout(intervalId);
  }, [status, pdf.task_id]);

  const renderStatus = () => {
    switch (status) {
      case "pending":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded"
            title="En cola para ser procesado"
          >
            <Clock size={12} />
            Pendiente
          </span>
        );
      case "processing":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
            title="Generando embeddings..."
          >
            <Loader2 size={12} className="animate-spin" />
            Procesando...
          </span>
        );
      case "completed":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
            title="Los embeddings están listos para la IA"
          >
            <CheckCircle size={12} />
            IA Ready
          </span>
        );
      case "error":
        return (
          <span
            className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded cursor-help"
            title={errorMessage || "Ocurrió un error desconocido"}
          >
            <AlertCircle size={12} />
            Error
          </span>
        );
      default:
        // Si el estado es null o undefined (no hay tarea), no muestra nada.
        return null;
    }
  };

  return (
    <li key={pdf.id} className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText size={16} className="text-gray-500 flex-shrink-0" />
        <span className="text-gray-700 truncate" title={pdf.filename}>
          {pdf.filename}
        </span>
        {renderStatus()}
      </div>
      <a
        href={pdf.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline ml-4 flex-shrink-0"
      >
        Ver PDF
      </a>
    </li>
  );
}

// --- Componente Principal ---

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
