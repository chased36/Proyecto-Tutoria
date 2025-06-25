import { notFound } from "next/navigation";
import { getSubjectById } from "@/lib/db";
import { QuizComponent } from "@/app/ui/Asignatura/quiz-component";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuizPage({ params }: PageProps) {
  const { id } = await params;
  const subject = await getSubjectById(id);

  if (!subject) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        ❓ Evaluación - {subject.name}
      </h1>

      {subject.questions.length > 0 ? (
        <section>
          <div className="bg-white p-4 rounded-lg border">
            <QuizComponent questions={subject.questions} subjectId={id} />
          </div>
        </section>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            No hay preguntas disponibles para esta asignatura.
          </p>
        </div>
      )}
    </main>
  );
}

export const metadata = {
  title: "Cuestionario de la asignatura",
  description: "Evaluación y preguntas de la asignatura",
};
