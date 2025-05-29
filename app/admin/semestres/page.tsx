"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Plus, Trash2, Pencil, Upload } from "lucide-react";
import {
  getSemestersAction,
  createSemesterAction,
  deleteSemesterAction,
  getSubjectsBySemesterAction,
  createSubjectWithFilesAction,
  updateSubjectAction,
  deleteSubjectAction,
} from "@/app/actions/semestre-actions";
import type { Semester, Subject } from "@/lib/db";
import { PDFViewer } from "@/app/ui/Semestre/pdf-viewer";

export default function SemestreAdminPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(
    null
  );
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [subjectName, setSubjectName] = useState("");
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>([""]);
  const [questions, setQuestions] = useState([
    {
      question: "",
      correctAnswer: "",
      wrongAnswers: ["", "", ""],
    },
  ]);

  // Cargar datos iniciales
  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const semestersData = await getSemestersAction();
      setSemesters(semestersData);

      // Cargar asignaturas para cada semestre
      const subjectsData: Record<string, Subject[]> = {};
      for (const semester of semestersData) {
        const semesterSubjects = await getSubjectsBySemesterAction(semester.id);
        subjectsData[semester.id] = semesterSubjects;
      }
      setSubjects(subjectsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetSubjectForm = () => {
    setSubjectName("");
    setPdfs([]);
    setYoutubeLinks([""]);
    setQuestions([
      { question: "", correctAnswer: "", wrongAnswers: ["", "", ""] },
    ]);
  };

  const addSemester = async () => {
    if (!newSemesterName.trim()) return;

    const result = await createSemesterAction(newSemesterName);
    if (result.success && result.semester) {
      setSemesters([result.semester, ...semesters]);
      setSubjects({ ...subjects, [result.semester.id]: [] });
      setNewSemesterName("");
    } else {
      alert(result.error || "Error al crear el semestre");
    }
  };

  const deleteSemesterHandler = async (id: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar este semestre? Esto eliminará todas las asignaturas y archivos asociados."
      )
    )
      return;

    const result = await deleteSemesterAction(id);
    if (result.success) {
      setSemesters(semesters.filter((s) => s.id !== id));
      const newSubjects = { ...subjects };
      delete newSubjects[id];
      setSubjects(newSubjects);
    } else {
      alert(result.error || "Error al eliminar el semestre");
    }
  };

  const addOrUpdateSubject = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedSemesterId) return;

    try {
      setUploading(true);

      // Validar datos básicos
      if (!subjectName.trim()) {
        alert("El nombre de la asignatura es requerido");
        return;
      }

      if (editingSubject) {
        // Actualizar asignatura existente
        const result = await updateSubjectAction(
          editingSubject.id,
          subjectName
        );
        if (result.success) {
          const updatedSubjects = await getSubjectsBySemesterAction(
            selectedSemesterId
          );
          setSubjects({ ...subjects, [selectedSemesterId]: updatedSubjects });
        } else {
          alert(result.error || "Error al actualizar la asignatura");
        }
      } else {
        // Crear nueva asignatura usando FormData
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        // Agregar el semesterId al FormData
        formData.append("semesterId", selectedSemesterId);

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
              formData.append(
                `wrongAnswer_${index}_${wrongIndex}`,
                wrong.trim()
              );
            });
          }
        });

        const result = await createSubjectWithFilesAction(formData);

        if (result.success) {
          const updatedSubjects = await getSubjectsBySemesterAction(
            selectedSemesterId
          );
          setSubjects({ ...subjects, [selectedSemesterId]: updatedSubjects });
        } else {
          alert(result.error || "Error al crear la asignatura");
        }
      }

      resetSubjectForm();
      setSelectedSemesterId(null);
      setEditingSubject(null);
    } catch (error) {
      console.error("Error:", error);
      alert(
        `Error al procesar la asignatura: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteSubjectHandler = async (subjectId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar esta asignatura? Esto eliminará todos los archivos asociados."
      )
    )
      return;

    const result = await deleteSubjectAction(subjectId);
    if (result.success) {
      // Recargar las asignaturas del semestre correspondiente
      const semesterId = Object.keys(subjects).find((sId) =>
        subjects[sId].some((subject) => subject.id === subjectId)
      );

      if (semesterId) {
        const updatedSubjects = await getSubjectsBySemesterAction(semesterId);
        setSubjects({ ...subjects, [semesterId]: updatedSubjects });
      }
    } else {
      alert(result.error || "Error al eliminar la asignatura");
    }
  };

  const handleEditSubject = (semesterId: string, subject: Subject) => {
    setSelectedSemesterId(semesterId);
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setPdfs([]); // Los PDFs existentes se mostrarían de otra manera
    setYoutubeLinks(
      subject.videos.length ? subject.videos.map((v) => v.url) : [""]
    );
    setQuestions(
      subject.questions.length
        ? subject.questions.map((q) => ({
            question: q.pregunta,
            correctAnswer: q.respuesta_correcta,
            wrongAnswers: q.respuestas_incorrectas,
          }))
        : [{ question: "", correctAnswer: "", wrongAnswers: ["", "", ""] }]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Cargando...</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold mb-4">Administrar Semestres</h1>

      <div className="flex gap-4">
        <input
          type="text"
          value={newSemesterName}
          onChange={(e) => setNewSemesterName(e.target.value)}
          placeholder="Nombre del semestre"
          className="border p-2 rounded w-full"
        />
        <button
          onClick={addSemester}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          title="Agregar semestre"
        >
          <Plus className="inline-block mr-1" size={16} />
          Agregar Semestre
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {semesters.map((semester) => (
          <div
            key={semester.id}
            className="border rounded-lg p-4 bg-white shadow"
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">{semester.name}</h2>
              <button
                onClick={() => deleteSemesterHandler(semester.id)}
                className="text-red-500 hover:text-red-700"
                title="Eliminar semestre"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <ul className="space-y-2 mb-4">
              {(subjects[semester.id] || []).map((subject) => (
                <li key={subject.id} className="border-b py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="font-medium">{subject.name}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        {subject.pdfs.length} PDFs, {subject.videos.length}{" "}
                        videos, {subject.questions.length} preguntas
                      </div>
                      {subject.pdfs.length > 0 && (
                        <div className="mt-2">
                          <PDFViewer pdfs={subject.pdfs} />
                        </div>
                      )}
                    </div>
                    <div className="space-x-2 ml-4">
                      <button
                        onClick={() => handleEditSubject(semester.id, subject)}
                        className="text-blue-600 hover:underline"
                        title="Editar asignatura"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteSubjectHandler(subject.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar asignatura"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {!editingSubject && selectedSemesterId !== semester.id && (
              <button
                onClick={() => {
                  setSelectedSemesterId(semester.id);
                  resetSubjectForm();
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                + Agregar asignatura
              </button>
            )}

            {selectedSemesterId === semester.id && (
              <form
                onSubmit={addOrUpdateSubject}
                className="mt-4 space-y-4"
                title="Formulario de asignatura"
              >
                <input
                  type="text"
                  name="name"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Nombre de la asignatura"
                  className="border p-2 rounded w-full"
                  required
                />

                <div>
                  <label className="font-semibold">
                    PDFs (máximo 5MB por archivo):
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);

                        // Verificar tamaño de archivos
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
                    className="border p-2 rounded w-full mb-2"
                    title="Seleccionar archivos PDF"
                  />
                  {pdfs.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      {pdfs.map((file, i) => (
                        <li key={i}>
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                          MB)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block mb-1 font-semibold">
                    Videos de YouTube:
                  </label>
                  {youtubeLinks.map((link, index) => (
                    <input
                      key={index}
                      type="url"
                      value={link}
                      onChange={(e) => {
                        const updated = [...youtubeLinks];
                        updated[index] = e.target.value;
                        setYoutubeLinks(updated);
                      }}
                      placeholder={`URL #${index + 1}`}
                      className="border p-2 rounded w-full mb-2"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setYoutubeLinks([...youtubeLinks, ""])}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Añadir otro video
                  </button>
                </div>

                <div>
                  <label className="block mb-1 font-semibold">Preguntas:</label>
                  {questions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      className="space-y-1 mb-4 border p-2 rounded"
                    >
                      <input
                        type="text"
                        placeholder="Pregunta"
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[qIndex].question = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full border p-1 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Respuesta correcta"
                        value={q.correctAnswer}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[qIndex].correctAnswer = e.target.value;
                          setQuestions(updated);
                        }}
                        className="w-full border p-1 rounded"
                      />
                      {q.wrongAnswers.map((wrong, i) => (
                        <input
                          key={i}
                          type="text"
                          placeholder={`Respuesta incorrecta ${i + 1}`}
                          value={wrong}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[qIndex].wrongAnswers[i] = e.target.value;
                            setQuestions(updated);
                          }}
                          className="w-full border p-1 rounded"
                        />
                      ))}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions([
                        ...questions,
                        {
                          question: "",
                          correctAnswer: "",
                          wrongAnswers: ["", "", ""],
                        },
                      ])
                    }
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Añadir otra pregunta
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading && <Upload className="animate-spin" size={16} />}
                    {uploading
                      ? "Subiendo..."
                      : editingSubject
                      ? "Guardar cambios"
                      : "Añadir"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetSubjectForm();
                      setEditingSubject(null);
                      setSelectedSemesterId(null);
                    }}
                    className="text-red-500 hover:underline"
                    disabled={uploading}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
