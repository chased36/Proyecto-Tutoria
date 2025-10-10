"use client";

import { useState, useEffect } from "react";
import {
  getCarrerasAction,
  createCarreraAction,
  deleteCarreraAction,
  getSemestersByCarreraAction,
  createSemesterAction,
  deleteSemesterAction,
  getSubjectsBySemesterAction,
  createSubjectWithFilesAction,
  deleteSubjectAction,
} from "@/app/actions/semestre-actions";
import type { Carrera, Semester, Subject } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { SubjectModal } from "@/components/ui/Semestre/asignatura-modal";
import { SubjectList } from "@/components/ui/Semestre/asignatura-list";

export default function SemestreAdminPage() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [semesters, setSemesters] = useState<Record<string, Semester[]>>({});
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [expandedCarreras, setExpandedCarreras] = useState<Set<string>>(
    new Set()
  );
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  const [newCarreraName, setNewCarreraName] = useState("");
  const [newSemesterName, setNewSemesterName] = useState("");
  const [selectedCarreraForSemester, setSelectedCarreraForSemester] =
    useState<string>("");

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [currentSemesterName, setCurrentSemesterName] = useState<string>("");

  useEffect(() => {
    loadCarreras();
  }, []);

  const loadCarreras = async () => {
    try {
      setLoading(true);
      const carrerasData = await getCarrerasAction();
      setCarreras(carrerasData);
    } catch (error) {
      console.error("Error loading carreras:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSemestersByCarrera = async (carreraId: string) => {
    try {
      const semestersData = await getSemestersByCarreraAction(carreraId);
      setSemesters((prev) => ({ ...prev, [carreraId]: semestersData }));
    } catch (error) {
      console.error("Error loading semesters:", error);
    }
  };

  const loadSubjectsBySemester = async (semesterId: string) => {
    try {
      const subjectsData = await getSubjectsBySemesterAction(semesterId);
      setSubjects((prev) => ({ ...prev, [semesterId]: subjectsData }));
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  };

  const toggleCarrera = async (carreraId: string) => {
    const newExpanded = new Set(expandedCarreras);
    if (newExpanded.has(carreraId)) {
      newExpanded.delete(carreraId);
    } else {
      newExpanded.add(carreraId);
      if (!semesters[carreraId]) {
        await loadSemestersByCarrera(carreraId);
      }
    }
    setExpandedCarreras(newExpanded);
  };

  const toggleSemester = async (semesterId: string) => {
    const newExpanded = new Set(expandedSemesters);
    if (newExpanded.has(semesterId)) {
      newExpanded.delete(semesterId);
    } else {
      newExpanded.add(semesterId);
      if (!subjects[semesterId]) {
        await loadSubjectsBySemester(semesterId);
      }
    }
    setExpandedSemesters(newExpanded);
  };

  const handleCreateCarrera = async () => {
    if (!newCarreraName.trim()) {
      alert("El nombre de la carrera es requerido");
      return;
    }

    const result = await createCarreraAction(newCarreraName);
    if (result.success && result.carrera) {
      setCarreras([result.carrera, ...carreras]);
      setNewCarreraName("");
    } else {
      alert(result.error || "Error al crear la carrera");
    }
  };

  const handleDeleteCarrera = async (id: string) => {
    if (
      !confirm(
        "¿Estás seguro de eliminar esta carrera? Se eliminarán todos sus semestres y asignaturas."
      )
    ) {
      return;
    }

    const result = await deleteCarreraAction(id);
    if (result.success) {
      setCarreras(carreras.filter((c) => c.id !== id));
      const newSemesters = { ...semesters };
      delete newSemesters[id];
      setSemesters(newSemesters);
    } else {
      alert(result.error || "Error al eliminar la carrera");
    }
  };

  const handleCreateSemester = async () => {
    if (!newSemesterName.trim()) {
      alert("El nombre del semestre es requerido");
      return;
    }

    if (!selectedCarreraForSemester) {
      alert("Debes seleccionar una carrera");
      return;
    }

    const result = await createSemesterAction(
      newSemesterName,
      selectedCarreraForSemester
    );
    if (result.success && result.semester) {
      setSemesters((prev) => ({
        ...prev,
        [selectedCarreraForSemester]: [
          result.semester!,
          ...(prev[selectedCarreraForSemester] || []),
        ],
      }));
      setNewSemesterName("");
      setSelectedCarreraForSemester("");
    } else {
      alert(result.error || "Error al crear el semestre");
    }
  };

  const handleDeleteSemester = async (
    semesterId: string,
    carreraId: string
  ) => {
    if (
      !confirm(
        "¿Estás seguro de eliminar este semestre? Se eliminarán todas sus asignaturas."
      )
    ) {
      return;
    }

    const result = await deleteSemesterAction(semesterId);
    if (result.success) {
      setSemesters((prev) => ({
        ...prev,
        [carreraId]: prev[carreraId].filter((s) => s.id !== semesterId),
      }));
      const newSubjects = { ...subjects };
      delete newSubjects[semesterId];
      setSubjects(newSubjects);
    } else {
      alert(result.error || "Error al eliminar el semestre");
    }
  };

  const handleCreateSubject = async (formData: FormData) => {
    try {
      const result = await createSubjectWithFilesAction(formData);
      if (result.success) {
        const semesterId = formData.get("semesterId") as string;
        await loadSubjectsBySemester(semesterId);
        setIsSubjectModalOpen(false);
        setEditingSubject(null);
      } else {
        alert(result.error || "Error al crear la asignatura");
      }
    } catch (error) {
      alert("Error al crear la asignatura");
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setCurrentSemesterId(subject.semestre_id);
    for (const carreraId in semesters) {
      const semester = semesters[carreraId].find(
        (s) => s.id === subject.semestre_id
      );
      if (semester) {
        setCurrentSemesterName(semester.name);
        break;
      }
    }
    setIsSubjectModalOpen(true);
  };

  const handleOpenCreateSubject = (
    semesterId: string,
    semesterName: string
  ) => {
    setEditingSubject(null);
    setCurrentSemesterId(semesterId);
    setCurrentSemesterName(semesterName);
    setIsSubjectModalOpen(true);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const result = await deleteSubjectAction(subjectId);
    if (result.success) {
      for (const semesterId in subjects) {
        if (subjects[semesterId].some((s) => s.id === subjectId)) {
          await loadSubjectsBySemester(semesterId);
          break;
        }
      }
    } else {
      alert(result.error || "Error al eliminar la asignatura");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Administrar Sistema de Guías
        </h1>
        <p className="text-gray-600">
          {carreras.length} carreras • {Object.values(semesters).flat().length}{" "}
          semestres • {Object.values(subjects).flat().length} asignaturas
          totales
        </p>
      </div>

      {/* Create Carrera Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Crear Nueva Carrera</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre de la carrera"
              value={newCarreraName}
              onChange={(e) => setNewCarreraName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCarrera()}
            />
            <Button onClick={handleCreateCarrera}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Carrera
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Semester Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Crear Nuevo Semestre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedCarreraForSemester}
              onChange={(e) => setSelectedCarreraForSemester(e.target.value)}
              title="Seleccionar carrera"
            >
              <option value="">Seleccionar carrera...</option>
              {carreras.map((carrera) => (
                <option key={carrera.id} value={carrera.id}>
                  {carrera.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Nombre del semestre"
              value={newSemesterName}
              onChange={(e) => setNewSemesterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSemester()}
            />
            <Button onClick={handleCreateSemester}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Semestre
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentSemesterId && (
        <SubjectModal
          semesterId={currentSemesterId}
          semesterName={currentSemesterName}
          editingSubject={editingSubject}
          onSubmit={handleCreateSubject}
          open={isSubjectModalOpen}
          onOpenChange={setIsSubjectModalOpen}
        />
      )}

      {/* Carreras List */}
      <div className="space-y-4">
        {carreras.map((carrera) => (
          <Card key={carrera.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleCarrera(carrera.id)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  {expandedCarreras.has(carrera.id) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                  <CardTitle>{carrera.name}</CardTitle>
                  <span className="text-sm text-gray-500">
                    ({semesters[carrera.id]?.length || 0} semestres)
                  </span>
                </button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCarrera(carrera.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            {expandedCarreras.has(carrera.id) && (
              <CardContent>
                <div className="space-y-3 ml-6">
                  {semesters[carrera.id]?.map((semester) => (
                    <Card key={semester.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleSemester(semester.id)}
                            className="flex items-center gap-2 text-left flex-1"
                          >
                            {expandedSemesters.has(semester.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-semibold">
                              {semester.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({subjects[semester.id]?.length || 0} asignaturas)
                            </span>
                          </button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenCreateSubject(
                                  semester.id,
                                  semester.name
                                )
                              }
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Asignatura
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteSemester(semester.id, carrera.id)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {expandedSemesters.has(semester.id) && (
                        <CardContent>
                          <div className="ml-6">
                            <SubjectList
                              subjects={subjects[semester.id] || []}
                              onEdit={handleEditSubject}
                              onDelete={handleDeleteSubject}
                            />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                  {(!semesters[carrera.id] ||
                    semesters[carrera.id].length === 0) && (
                    <p className="text-sm text-gray-500">
                      No hay semestres en esta carrera
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
