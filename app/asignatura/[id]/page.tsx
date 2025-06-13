import Link from "next/link";
import { getSubjectById, getSemesterNameById } from "@/lib/db";
import { PDFViewer } from "@/app/ui/Semestre/pdf-viewer";
import { VideoPlayer } from "@/app/ui/Asignatura/video-player";
import { QuizComponent } from "@/app/ui/Asignatura/quiz-component";
import { notFound } from "next/navigation";

interface SubjectPageProps {
  params: {
    id: string;
  };
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { id } = params;
  console.log("Buscando asignatura con ID:", id);

  // Buscar la asignatura directamente por ID
  const subject = await getSubjectById(id);

  // Si no se encuentra la asignatura, mostrar página 404
  if (!subject) {
    console.log("Asignatura no encontrada, redirigiendo a 404");
    notFound();
  }

  // Obtener el nombre del semestre
  const semesterName = await getSemesterNameById(subject.semestre_id);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Navegación */}
      <div className="flex items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 mr-2">
          ← Inicio
        </Link>
        <span className="text-gray-500 mr-2">/</span>
        <Link
          href={`/?semester=${subject.semestre_id}`}
          className="text-blue-600 hover:text-blue-800 mr-2"
        >
          {semesterName}
        </Link>
        <span className="text-gray-500 mr-2">/</span>
        <span className="font-medium">{subject.name}</span>
      </div>

      {/* Título */}
      <h1 className="text-3xl font-bold mb-6">{subject.name}</h1>

      {/* Estadísticas */}
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

      {/* Contenido */}
      <div className="space-y-8">
        {/* PDFs */}
        {subject.pdfs.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              📚 Material de Estudio
            </h2>
            <div className="bg-white p-4 rounded-lg border">
              <PDFViewer pdfs={subject.pdfs} />
            </div>
          </section>
        )}

        {/* Videos */}
        {subject.videos.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">🎥 Videos</h2>
            <div className="bg-white p-4 rounded-lg border">
              <VideoPlayer videos={subject.videos} />
            </div>
          </section>
        )}

        {/* Quiz */}
        {subject.questions.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">❓ Evaluación</h2>
            <div className="bg-white p-4 rounded-lg border">
              <QuizComponent questions={subject.questions} />
            </div>
          </section>
        )}

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
    </div>
  );
}

export function generateMetadata({ params }: SubjectPageProps) {
  return {
    title: `Asignatura - ${params.id}`,
    description: "Detalles de la asignatura",
  };
}
