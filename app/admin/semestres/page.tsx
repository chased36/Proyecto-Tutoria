"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";

type Subject = {
  id: string;
  name: string;
};

type Semester = {
  id: string;
  name: string;
  subjects: Subject[];
};

export default function SemestreAdminPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(
    null
  );

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

  const addSubject = (semesterId: string) => {
    if (!newSubjectName.trim()) return;
    const updated = semesters.map((sem) => {
      if (sem.id === semesterId) {
        return {
          ...sem,
          subjects: [
            ...sem.subjects,
            { id: Date.now().toString(), name: newSubjectName.trim() },
          ],
        };
      }
      return sem;
    });
    setSemesters(updated);
    setNewSubjectName("");
    setSelectedSemesterId(null);
  };

  const deleteSubject = (semesterId: string, subjectId: string) => {
    const updated = semesters.map((sem) => {
      if (sem.id === semesterId) {
        return {
          ...sem,
          subjects: sem.subjects.filter((subj) => subj.id !== subjectId),
        };
      }
      return sem;
    });
    setSemesters(updated);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-4">Administrar Semestres</h1>

      {/* Crear Semestre */}
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
        >
          <Plus className="inline-block mr-1" size={16} />
          Agregar Semestre
        </button>
      </div>

      {/* Lista de Semestres */}
      <div className="grid md:grid-cols-2 gap-6">
        {semesters.map((semester) => (
          <div
            key={semester.id}
            className="border rounded-lg p-4 shadow-sm bg-white"
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

            {/* Asignaturas */}
            <ul className="space-y-2 mb-4">
              {semester.subjects.map((subject) => (
                <li
                  key={subject.id}
                  className="flex justify-between items-center border-b py-1"
                >
                  <span>{subject.name}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() =>
                        alert(
                          `Redirigir a editar asignatura: ${subject.name} (ID: ${subject.id})`
                        )
                      }
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

            {/* Formulario agregar asignatura */}
            {selectedSemesterId === semester.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Nombre de asignatura"
                  className="border p-2 rounded w-full"
                />
                <button
                  onClick={() => addSubject(semester.id)}
                  className="bg-green-600 text-white px-4 rounded hover:bg-green-700"
                >
                  Añadir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedSemesterId(semester.id)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Agregar asignatura
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
