"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SubjectList } from "./asignatura-list";
import { SubjectModal } from "./asignatura-modal";
import type { Semester, Subject } from "@/lib/db";

interface SemesterTableProps {
  semesters: Semester[];
  subjects: Record<string, Subject[]>;
  onDeleteSemester: (id: string) => void;
  onCreateSubject: (formData: FormData) => Promise<void>;
  onUpdateSubject: (id: string, name: string) => Promise<void>;
  onDeleteSubject: (id: string) => void;
  onEditSubject: (semesterId: string, subject: Subject) => void;
}

export function SemesterTable({
  semesters,
  subjects,
  onDeleteSemester,
  onCreateSubject,
  onUpdateSubject,
  onDeleteSubject,
  onEditSubject,
}: SemesterTableProps) {
  const [openSemesters, setOpenSemesters] = useState<Set<string>>(new Set());
  const [editingSubject, setEditingSubject] = useState<{
    subject: Subject;
    semesterId: string;
  } | null>(null);

  const toggleSemester = (semesterId: string) => {
    const newOpen = new Set(openSemesters);
    if (newOpen.has(semesterId)) {
      newOpen.delete(semesterId);
    } else {
      newOpen.add(semesterId);
    }
    setOpenSemesters(newOpen);
  };

  const handleEditSubject = (semesterId: string, subject: Subject) => {
    setEditingSubject({ subject, semesterId });
    onEditSubject(semesterId, subject);
  };

  const handleSubmitSubject = async (formData: FormData) => {
    await onCreateSubject(formData);
  };

  const handleSubmitEditSubject = async (formData: FormData) => {
    if (editingSubject) {
      const name = formData.get("name") as string;
      await onUpdateSubject(editingSubject.subject.id, name);
      setEditingSubject(null);
    }
  };

  if (semesters.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500 mb-4">
            No hay semestres registrados aún.
          </p>
          <p className="text-sm text-gray-400">
            Usa el formulario de arriba para agregar el primer semestre.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {semesters.map((semester) => (
        <Card key={semester.id}>
          <Collapsible
            open={openSemesters.has(semester.id)}
            onOpenChange={() => toggleSemester(semester.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 p-0 h-auto font-semibold text-lg"
                  >
                    {openSemesters.has(semester.id) ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    {semester.name}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({(subjects[semester.id] || []).length} asignaturas)
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <div className="flex gap-2">
                  <SubjectModal
                    semesterId={semester.id}
                    semesterName={semester.name}
                    onSubmit={handleSubmitSubject}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar Asignatura
                      </Button>
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (
                        confirm(
                          "¿Estás seguro de que quieres eliminar este semestre? Esto eliminará todas las asignaturas y archivos asociados."
                        )
                      ) {
                        onDeleteSemester(semester.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="pt-0">
                <SubjectList
                  subjects={subjects[semester.id] || []}
                  onEdit={(subject) => handleEditSubject(semester.id, subject)}
                  onDelete={onDeleteSubject}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {/* Modal para editar asignatura */}
      {editingSubject && (
        <SubjectModal
          semesterId={editingSubject.semesterId}
          semesterName={
            semesters.find((s) => s.id === editingSubject.semesterId)?.name ||
            ""
          }
          editingSubject={editingSubject.subject}
          onSubmit={handleSubmitEditSubject}
          open={!!editingSubject}
          onOpenChange={(open) => !open && setEditingSubject(null)}
        />
      )}
    </div>
  );
}
