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
    // Buscar la asignatura directamente por ID
    const subject = await getSubjectById(id);

    // Si no se encuentra la asignatura, mostrar página 404
    if (!subject) {
      console.log("Asignatura no encontrada, redirigiendo a 404");
      notFound();
      return null;
    }

    // Obtener el nombre del semestre
    const semesterName = await getSemesterNameById(subject.semestre_id);

    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Título */}
        <h1 className="text-3xl font-bold mb-6">{subject.name}</h1>

        {/* Accesos rápidos a secciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {subject.pdfs.length > 0 && (
            <Link
              href={`/asignatura/${id}/textos`}
              className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg text-center transition-colors"
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
              className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg text-center transition-colors"
            >
              <div className="text-lg font-semibold">Ver Videos</div>
              <div className="text-sm opacity-90">
                {subject.videos.length} videos
              </div>
            </Link>
          )}

          {subject.questions.length > 0 && (
            <Link
              href={`/asignatura/${id}/examen`}
              className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg text-center transition-colors"
            >
              <div className="text-lg font-semibold">Hacer Examen</div>
              <div className="text-sm opacity-90">
                {subject.questions.length} preguntas
              </div>
            </Link>
          )}
        </div>

        {/* Mensaje si no hay contenido */}
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
