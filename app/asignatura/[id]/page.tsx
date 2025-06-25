import Link from "next/link";
import { getSubjectById, getSemesterNameById } from "@/lib/db";
import { notFound } from "next/navigation";

interface SubjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { id } = await params;
  console.log("Buscando asignatura con ID:", id);

  try {
    const subject = await getSubjectById(id);

    if (!subject) {
      console.log("Asignatura no encontrada, redirigiendo a 404");
      notFound();
      return null;
    }

    const semesterName = await getSemesterNameById(subject.semestre_id);

    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{subject.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {subject.pdfs.length}
            </div>
            <div className="text-gray-600">PDFs Disponibles</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {subject.videos.length}
            </div>
            <div className="text-gray-600">Videos</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {subject.questions.length}
            </div>
            <div className="text-gray-600">Preguntas</div>
          </div>
        </div>

        {/* Mensaje si no hay contenido */}
        {subject.pdfs.length === 0 &&
          subject.videos.length === 0 &&
          subject.questions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Esta asignatura aún no tiene contenido disponible.
              </p>
            </div>
          )}
      </div>
    );
  } catch (error) {
    console.error("Error al cargar la página de asignatura:", error);
    notFound();
    return null;
  }
}

export async function generateMetadata({ params }: SubjectPageProps) {
  const { id } = await params;
  return {
    title: `Asignatura - ${id}`,
    description: "Detalles de la asignatura",
  };
}
