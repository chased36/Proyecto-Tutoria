"use client";

import { useState, useEffect } from "react";
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
import { SemesterForm } from "@/components/ui/Semestre/semestre-form";
import { SemesterTable } from "@/components/ui/Semestre/semestre-table";

export default function SemestreAdminPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const semestersData = await getSemestersAction();
      setSemesters(semestersData);

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

  const handleCreateSemester = async (name: string) => {
    const result = await createSemesterAction(name);
    if (result.success && result.semester) {
      setSemesters([result.semester, ...semesters]);
      setSubjects({ ...subjects, [result.semester.id]: [] });
    } else {
      alert(result.error || "Error al crear el semestre");
    }
  };

  const handleDeleteSemester = async (id: string) => {
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

  const handleCreateSubject = async (formData: FormData) => {
    const semesterId = formData.get("semesterId") as string;
    const result = await createSubjectWithFilesAction(formData);

    if (result.success) {
      const updatedSubjects = await getSubjectsBySemesterAction(semesterId);
      setSubjects({ ...subjects, [semesterId]: updatedSubjects });
    } else {
      alert(result.error || "Error al crear la asignatura");
      throw new Error(result.error || "Error al crear la asignatura");
    }
  };

  const handleUpdateSubject = async (id: string, name: string) => {
    const result = await updateSubjectAction(id, name);
    if (result.success) {
      const semesterId = Object.keys(subjects).find((sId) =>
        subjects[sId].some((subject) => subject.id === id)
      );
      if (semesterId) {
        const updatedSubjects = await getSubjectsBySemesterAction(semesterId);
        setSubjects({ ...subjects, [semesterId]: updatedSubjects });
      }
    } else {
      alert(result.error || "Error al actualizar la asignatura");
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const result = await deleteSubjectAction(subjectId);
    if (result.success) {
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
    console.log("Editing subject:", subject.name, "in semester:", semesterId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Administrar Semestres</h1>
        <div className="text-sm text-gray-500">
          {semesters.length} semestres • {Object.values(subjects).flat().length}{" "}
          asignaturas totales
        </div>
      </div>

      <SemesterForm onSubmit={handleCreateSemester} />

      <SemesterTable
        semesters={semesters}
        subjects={subjects}
        onDeleteSemester={handleDeleteSemester}
        onCreateSubject={handleCreateSubject}
        onUpdateSubject={handleUpdateSubject}
        onDeleteSubject={handleDeleteSubject}
        onEditSubject={handleEditSubject}
      />
    </div>
  );
}
