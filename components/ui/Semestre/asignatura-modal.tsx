"use client";

import type React from "react";

import { useState, type FormEvent } from "react";
import { Upload, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Subject } from "@/lib/db";

interface SubjectModalProps {
  semesterId: string;
  semesterName: string;
  editingSubject?: Subject | null;
  onSubmit: (formData: FormData) => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SubjectModal({
  semesterId,
  semesterName,
  editingSubject,
  onSubmit,
  trigger,
  open,
  onOpenChange,
}: SubjectModalProps) {
  const [subjectName, setSubjectName] = useState(editingSubject?.name || "");
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>(
    editingSubject?.videos.length
      ? editingSubject.videos.map((v) => v.url)
      : [""]
  );
  const [questions, setQuestions] = useState(
    [
      editingSubject?.questions.length
        ? editingSubject.questions.map((q) => ({
            question: q.pregunta,
            correctAnswer: q.respuesta_correcta,
            wrongAnswers: q.respuestas_incorrectas,
          }))
        : [{ question: "", correctAnswer: "", wrongAnswers: ["", "", ""] }],
    ].flat()
  );
  const [uploading, setUploading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const resetForm = () => {
    setSubjectName(editingSubject?.name || "");
    setPdfs([]);
    setYoutubeLinks(
      editingSubject?.videos.length
        ? editingSubject.videos.map((v) => v.url)
        : [""]
    );
    setQuestions(
      [
        editingSubject?.questions.length
          ? editingSubject.questions.map((q) => ({
              question: q.pregunta,
              correctAnswer: q.respuesta_correcta,
              wrongAnswers: q.respuestas_incorrectas,
            }))
          : [{ question: "", correctAnswer: "", wrongAnswers: ["", "", ""] }],
      ].flat()
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      formData.append("semesterId", semesterId);

      // Agregar archivos PDF
      for (const file of pdfs) {
        formData.append("pdfs", file);
      }

      // Agregar enlaces de YouTube
      youtubeLinks.forEach((link, index) => {
        if (link.trim()) {
          formData.append(`youtubeLink_${index}`, link.trim());
        }
      });

      // Agregar preguntas
      questions.forEach((q, index) => {
        if (
          q.question.trim() &&
          q.correctAnswer.trim() &&
          q.wrongAnswers.every((w) => w.trim())
        ) {
          formData.append(`question_${index}`, q.question.trim());
          formData.append(`correctAnswer_${index}`, q.correctAnswer.trim());
          q.wrongAnswers.forEach((wrong, wrongIndex) => {
            formData.append(`wrongAnswer_${index}_${wrongIndex}`, wrong.trim());
          });
        }
      });

      await onSubmit(formData);
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setUploading(false);
    }
  };

  const addYouTubeLink = () => {
    setYoutubeLinks([...youtubeLinks, ""]);
  };

  const removeYouTubeLink = (index: number) => {
    setYoutubeLinks(youtubeLinks.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", correctAnswer: "", wrongAnswers: ["", "", ""] },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (
    index: number,
    field: "question" | "correctAnswer" | "wrongAnswers",
    value: string | string[]
  ) => {
    const updated = [...questions];
    if (field === "wrongAnswers") {
      updated[index].wrongAnswers = value as string[];
    } else if (field === "question") {
      updated[index].question = value as string;
    } else if (field === "correctAnswer") {
      updated[index].correctAnswer = value as string;
    }
    setQuestions(updated);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="w-4 h-4 mr-1" />
      Agregar Asignatura
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="bg-gray-50 max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {editingSubject ? "Editar Asignatura" : "Nueva Asignatura"}
          </DialogTitle>
          <DialogDescription>
            {editingSubject
              ? `Editar la asignatura "${editingSubject.name}" en ${semesterName}`
              : `Crear una nueva asignatura en ${semesterName}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Nombre de la asignatura</Label>
              <Input
                id="name"
                name="name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Nombre de la asignatura"
                required
              />
            </div>

            <div>
              <Label>PDFs (máximo 5MB por archivo)</Label>
              <Input
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files);
                    const oversizedFiles = files.filter(
                      (file) => file.size > 5 * 1024 * 1024
                    );
                    if (oversizedFiles.length > 0) {
                      alert(
                        `Los siguientes archivos exceden 5MB: ${oversizedFiles
                          .map((f) => f.name)
                          .join(", ")}`
                      );
                      return;
                    }
                    setPdfs(files);
                  }
                }}
                className="mb-2"
              />
              {pdfs.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-2">
                    Archivos seleccionados:
                  </p>
                  <ul className="space-y-1">
                    {pdfs.map((file, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-700 flex justify-between items-center"
                      >
                        <span>
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                          MB)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPdfs(pdfs.filter((_, index) => index !== i))
                          }
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <Label>Videos de YouTube</Label>
              <div className="space-y-2">
                {youtubeLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      value={link}
                      onChange={(e) => {
                        const updated = [...youtubeLinks];
                        updated[index] = e.target.value;
                        setYoutubeLinks(updated);
                      }}
                      placeholder={`URL del video ${index + 1}`}
                    />
                    {youtubeLinks.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeYouTubeLink(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addYouTubeLink}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir otro video
                </Button>
              </div>
            </div>

            <div>
              <Label>Preguntas</Label>
              <div className="space-y-4">
                {questions.map((q, qIndex) => (
                  <Card key={qIndex}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          Pregunta {qIndex + 1}
                        </CardTitle>
                        {questions.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuestion(qIndex)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        placeholder="Escribe la pregunta aquí..."
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(qIndex, "question", e.target.value)
                        }
                        rows={2}
                      />
                      <Input
                        placeholder="Respuesta correcta"
                        value={q.correctAnswer}
                        onChange={(e) =>
                          updateQuestion(
                            qIndex,
                            "correctAnswer",
                            e.target.value
                          )
                        }
                      />
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">
                          Respuestas incorrectas:
                        </Label>
                        {q.wrongAnswers.map((wrong, i) => (
                          <Input
                            key={i}
                            placeholder={`Respuesta incorrecta ${i + 1}`}
                            value={wrong}
                            onChange={(e) => {
                              const updated = [...q.wrongAnswers];
                              updated[i] = e.target.value;
                              updateQuestion(qIndex, "wrongAnswers", updated);
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir otra pregunta
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading && <Upload className="w-4 h-4 mr-2 animate-spin" />}
                {uploading
                  ? "Subiendo..."
                  : editingSubject
                  ? "Guardar cambios"
                  : "Crear Asignatura"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
