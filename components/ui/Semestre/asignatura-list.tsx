"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFViewer } from "./pdf-viewer";
import type { Subject } from "@/lib/db";

interface SubjectListProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: string) => void;
}

export function SubjectList({ subjects, onEdit, onDelete }: SubjectListProps) {
  if (subjects.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">
        No hay asignaturas en este semestre
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {subjects.map((subject) => (
        <div key={subject.id} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h4 className="font-medium text-lg">{subject.name}</h4>
              <div className="text-sm text-gray-600 mt-1">
                {subject.pdfs.length} PDFs • {subject.videos.length} Videos •{" "}
                {subject.questions.length} Preguntas
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(subject)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      "¿Estás seguro de que quieres eliminar esta asignatura? Esto eliminará todos los archivos asociados."
                    )
                  ) {
                    onDelete(subject.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>

          {subject.pdfs.length > 0 && (
            <div className="mt-3">
              <PDFViewer pdfs={subject.pdfs} />
            </div>
          )}

          {subject.videos.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-sm mb-2">Videos:</h5>
              <ul className="space-y-1">
                {subject.videos.map((video) => (
                  <li key={video.id} className="text-sm">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {video.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {subject.questions.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-sm mb-2">Preguntas:</h5>
              <ul className="space-y-1">
                {subject.questions.slice(0, 2).map((question, index) => (
                  <li key={question.id} className="text-sm text-gray-600">
                    {index + 1}. {question.pregunta.substring(0, 50)}...
                  </li>
                ))}
                {subject.questions.length > 2 && (
                  <li className="text-sm text-gray-500">
                    Y {subject.questions.length - 2} preguntas más...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
