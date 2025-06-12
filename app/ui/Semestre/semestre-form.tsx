"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SemesterFormProps {
  onSubmit: (name: string) => Promise<void>;
}

export function SemesterForm({ onSubmit }: SemesterFormProps) {
  const [newSemesterName, setNewSemesterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newSemesterName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(newSemesterName);
      setNewSemesterName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-4 mb-6">
      <Input
        type="text"
        value={newSemesterName}
        onChange={(e) => setNewSemesterName(e.target.value)}
        placeholder="Nombre del semestre"
        className="flex-1"
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !newSemesterName.trim()}
      >
        <Plus className="w-4 h-4 mr-2" />
        {isSubmitting ? "Agregando..." : "Agregar Semestre"}
      </Button>
    </div>
  );
}
