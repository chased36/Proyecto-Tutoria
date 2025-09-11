"use client";

import { useState } from "react";
import type { PDF } from "@/lib/db";
import PDFViewer from "./PDFViewer";

type Props = {
  pdfs: PDF[];
};

export function PDFList({ pdfs }: Props) {
  const [selectedPDF, setSelectedPDF] = useState<PDF | null>(null);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/3 space-y-4">
        <h2 className="text-xl font-semibold">Archivos PDF</h2>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          {pdfs.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay PDFs disponibles</p>
          ) : (
            <ul className="space-y-2">
              {pdfs.map((pdf) => (
                <li key={pdf.id}>
                  <button
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedPDF?.id === pdf.id
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "hover:bg-gray-50 text-blue-600 hover:text-blue-800"
                    }`}
                    onClick={() => setSelectedPDF(pdf)}
                  >
                    <div className="font-medium">{pdf.filename}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="w-full lg:w-2/3">
        {selectedPDF ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{selectedPDF.filename}</h3>
              <a
                href={selectedPDF.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                Abrir en nueva pestaña
              </a>
            </div>
            <PDFViewer url={selectedPDF.url} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600">Selecciona un PDF para visualizarlo</p>
          </div>
        )}
      </div>
    </div>
  );
}
