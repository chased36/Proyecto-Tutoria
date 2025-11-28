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
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">
          {subject.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {subject.pdfs.length > 0 && (
            <Link
              href={`/asignatura/${id}/textos`}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:bg-blue-600 text-white p-4 rounded-lg text-center transition-colors"
            >
              <div className="text-lg font-semibold">Ver Textos</div>
              <div className="text-sm opacity-90">
                {subject.pdfs.length} archivos
              </div>
            </Link>
          )}

          {subject.videos.length > 0 && (
            <Link
              href={`/asignatura/${id}/videos`}
              className="bg-gradient-to-r from-green-500 to-teal-600 hover:bg-green-600 text-white p-4 rounded-lg text-center transition-colors"
            >
              <div className="text-lg font-semibold">Ver Videos</div>
              <div className="text-sm opacity-90">
                {subject.videos.length} videos
              </div>
            </Link>
          )}

          {subject.questions.length > 0 && (
            <Link
              href={`/cuestionario/${id}`}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:bg-purple-600 text-white p-4 rounded-lg text-center transition-colors"
            >
              <div className="text-lg font-semibold">
                Hacer Cuestionario de Práctica
              </div>
              <div className="text-sm opacity-90">
                {subject.questions.length} preguntas
              </div>
            </Link>
          )}
        </div>

        {subject.pdfs.length === 0 &&
          subject.videos.length === 0 &&
          subject.questions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Esta asignatura aún no tiene contenido disponible.
              </p>
              <Link
                href="/admin/semestres"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Agregar Contenido
              </Link>
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
