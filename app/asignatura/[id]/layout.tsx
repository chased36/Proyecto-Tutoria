import Link from "next/link";
import type { ReactNode } from "react";
import { getSubjectById, getSemesterNameById } from "@/lib/db";

export default async function SubjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subject = await getSubjectById(id);
  if (!subject) {
    return (
      <main className="container mx-auto px-4 py-6">
        <p className="text-red-600">Asignatura no encontrada.</p>
      </main>
    );
  }

  const semesterName = await getSemesterNameById(subject.semestre_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-10">
        <nav className="container mx-auto px-4 py-3 flex flex-wrap gap-4">
          <Link href="/" className="hover:underline">
            ← Inicio
          </Link>
          <Link
            href={`/?semester=${subject.semestre_id}`}
            className="hover:underline"
          >
            {semesterName}
          </Link>
          <Link
            href={`/asignatura/${id}`}
            className="hover:underline font-semibold"
          >
            {subject.name}
          </Link>
          {subject.pdfs.length > 0 && (
            <Link href={`/asignatura/${id}/pdfs`} className="hover:underline">
              PDFs
            </Link>
          )}
          {subject.videos.length > 0 && (
            <Link href={`/asignatura/${id}/videos`} className="hover:underline">
              Videos
            </Link>
          )}
          {subject.questions.length > 0 && (
            <Link
              href={`/asignatura/${id}/cuestionario`}
              className="hover:underline"
            >
              Cuestionario
            </Link>
          )}
        </nav>
      </header>

      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
