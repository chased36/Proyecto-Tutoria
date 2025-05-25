"use client";

import { useState, FormEvent } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";

type Subject = {
  id: string;
  name: string;
  pdfs: File[];
  youtubeLinks: string[];
  questions: {
    question: string;
    correctAnswer: string;
    wrongAnswers: string[];
  }[];
};

type Semester = {
  id: string;
  name: string;
  subjects: Subject[];
};

export default function SemestreAdminPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
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

  const resetSubjectForm = () => {
    setSubjectName("");
    setPdfs([]);
    setYoutubeLinks([""]);
    setQuestions([
      { question: "", correctAnswer: "", wrongAnswers: ["", "", ""] },
    ]);
  };

  const addSemester = () => {
    if (!newSemesterName.trim()) return;
    const newSemester: Semester = {
      id: Date.now().toString(),
      name: newSemesterName.trim(),
      subjects: [],
    };
    setSemesters([...semesters, newSemester]);
    setNewSemesterName("");
  };

  const deleteSemester = (id: string) => {
    setSemesters(semesters.filter((s) => s.id !== id));
  };

  const addOrUpdateSubject = (e: FormEvent) => {
    e.preventDefault();
    if (
      !subjectName ||
      pdfs.length === 0 ||
      youtubeLinks.some((link) => !link) ||
      questions.some(
        (q) => !q.question || !q.correctAnswer || q.wrongAnswers.some((w) => !w)
      )
    )
      return;

    const newSubject: Subject = {
      id: editingSubject ? editingSubject.id : Date.now().toString(),
      name: subjectName,
      pdfs: pdfs,
      youtubeLinks,
      questions,
    };

    const updatedSemesters = semesters.map((sem) => {
      if (sem.id === selectedSemesterId) {
        const updatedSubjects = editingSubject
          ? sem.subjects.map((sub) =>
              sub.id === editingSubject.id ? newSubject : sub
            )
          : [...sem.subjects, newSubject];
        return { ...sem, subjects: updatedSubjects };
      }
      return sem;
    });

    setSemesters(updatedSemesters);
    resetSubjectForm();
    setSelectedSemesterId(null);
    setEditingSubject(null);
  };

  const deleteSubject = (semesterId: string, subjectId: string) => {
    const updated = semesters.map((sem) =>
      sem.id === semesterId
        ? { ...sem, subjects: sem.subjects.filter((s) => s.id !== subjectId) }
        : sem
    );
    setSemesters(updated);
  };

  const handleEditSubject = (semesterId: string, subject: Subject) => {
    setSelectedSemesterId(semesterId);
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setPdfs(subject.pdfs);
    setYoutubeLinks(subject.youtubeLinks.length ? subject.youtubeLinks : [""]);
    setQuestions(
      subject.questions.length
        ? subject.questions
        : [{ question: "", correctAnswer: "", wrongAnswers: ["", "", ""] }]
    );
  };

  return (
    <div className="space-y-6">
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
                onClick={() => deleteSemester(semester.id)}
                className="text-red-500 hover:text-red-700"
                title="Eliminar semestre"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <ul className="space-y-2 mb-4">
              {semester.subjects.map((subject) => (
                <li
                  key={subject.id}
                  className="flex justify-between items-center border-b py-1"
                >
                  <span>{subject.name}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEditSubject(semester.id, subject)}
                      className="text-blue-600 hover:underline"
                      title="Editar asignatura"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => deleteSubject(semester.id, subject.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Eliminar asignatura"
                    >
                      <Trash2 size={16} />
                    </button>
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
              <form onSubmit={addOrUpdateSubject} className="mt-4 space-y-4">
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Nombre de la asignatura"
                  className="border p-2 rounded w-full"
                  required
                />

                <div>
                  <label className="font-semibold">PDFs:</label>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setPdfs(Array.from(e.target.files));
                      }
                    }}
                    className="border p-2 rounded w-full mb-2"
                    title="Seleccionar archivos PDF"
                  />
                  {pdfs.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      {pdfs.map((file, i) => (
                        <li key={i}>{file.name}</li>
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
                      required
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
                        required
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
                        required
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
                          required
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
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    {editingSubject ? "Guardar cambios" : "Añadir"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetSubjectForm();
                      setEditingSubject(null);
                      setSelectedSemesterId(null);
                    }}
                    className="text-red-500 hover:underline"
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
