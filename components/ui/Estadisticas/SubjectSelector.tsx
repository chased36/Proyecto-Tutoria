"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Semester {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  semestre_id: string;
}

interface SubjectSelectorProps {
  onSubjectSelect: (subjectId: string, subjectName: string) => void;
}

export default function SubjectSelector({
  onSubjectSelect,
}: SubjectSelectorProps) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSemesters() {
      try {
        const response = await fetch("/api/semesters");
        if (!response.ok) throw new Error("Error al cargar semestres");
        const data = await response.json();
        setSemesters(data);
      } catch (error) {
        console.error("Error fetching semesters:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (!selectedSemester) {
      setSubjects([]);
      setSelectedSubject("");
      return;
    }

    async function fetchSubjects() {
      try {
        const response = await fetch(
          `/api/subjects?semesterId=${selectedSemester}`
        );
        if (!response.ok) throw new Error("Error al cargar asignaturas");
        const data = await response.json();
        setSubjects(data);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    }
    fetchSubjects();
  }, [selectedSemester]);

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) {
      onSubjectSelect(subject.id, subject.name);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleccionar Asignatura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Semestre</label>
          <Select
            value={selectedSemester}
            onValueChange={setSelectedSemester}
            disabled={loading}
          >
            <SelectTrigger className="border-blue-300 focus:border-blue-500 focus:ring-blue-200">
              <SelectValue
                placeholder={loading ? "Cargando..." : "Selecciona un semestre"}
                className="text-blue-700"
              />
            </SelectTrigger>
            <SelectContent className="border-blue-200">
              {semesters.map((semester) => (
                <SelectItem
                  key={semester.id}
                  value={semester.id}
                  className="text-blue-700 hover:bg-blue-50 focus:bg-blue-100"
                >
                  {semester.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Asignatura</label>
          <Select
            value={selectedSubject}
            onValueChange={handleSubjectChange}
            disabled={!selectedSemester || subjects.length === 0}
          >
            <SelectTrigger className="border-blue-300 focus:border-blue-500 focus:ring-blue-200">
              <SelectValue
                placeholder={
                  !selectedSemester
                    ? "Primero selecciona un semestre"
                    : subjects.length === 0
                    ? "Sin asignaturas"
                    : "Selecciona una asignatura"
                }
                className="text-blue-700"
              />
            </SelectTrigger>
            <SelectContent className="border-blue-200">
              {subjects.map((subject) => (
                <SelectItem
                  key={subject.id}
                  value={subject.id}
                  className="text-blue-700 hover:bg-blue-50 focus:bg-blue-100"
                >
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
