import { notFound } from "next/navigation";
import { getSubjectById } from "@/lib/db";
import { QuizComponent } from "@/components/ui/Asignatura/quiz-component";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizPage({ params }: PageProps) {
  const { id } = await params;
  const subject = await getSubjectById(id);

  if (!subject) {
    notFound();
  }

  return (
    <main className="max-w-3xl w-full mx-auto p-6 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">
          ❓ Evaluación - {subject.name}
        </h1>

        {subject.questions && subject.questions.length > 0 ? (
          <section>
            <div className="bg-white p-6 rounded-lg border shadow-lg">
              {/* 
                QuizComponent debe aceptar:
                - questions: QuestionWithAnswers[]
                - subjectId: string
                - (próximamente) onFinish: resultado => acción para guardar resultados
               */}
              <QuizComponent questions={subject.questions} subjectId={id} />
            </div>
          </section>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              No hay preguntas disponibles para esta asignatura.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export const metadata = {
  title: "Cuestionario de la asignatura",
  description: "Evaluación y preguntas de la asignatura",
};
