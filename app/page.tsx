import Link from "next/link";
import { getSemesters, getSubjectsBySemester, type Subject } from "@/lib/db";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedSemester = resolvedSearchParams.semester as string | undefined;

  // Obtener todos los semestres de la base de datos
  const semesters = await getSemesters();

  // Si hay un semestre seleccionado, obtener sus asignaturas
  let currentSemester = null;
  let subjects: Subject[] = [];

  if (selectedSemester) {
    currentSemester = semesters.find((sem) => sem.id === selectedSemester);
    if (currentSemester) {
      subjects = await getSubjectsBySemester(selectedSemester);
    }
  }

  return (
    <div>
      <section className="mb-8">
        <div className="text-center mt-6">
          <h1 className="text-3xl font-semibold mb-4">Plan de Estudios</h1>
        </div>
        {!selectedSemester ? (
          <>
            <p className="mb-4 px-6">Selecciona el Semestre:</p>
            {semesters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6">
                {semesters.map((semester) => (
                  <Link
                    key={semester.id}
                    href={`/?semester=${semester.id}`}
                    className="bg-blue-500 p-4 rounded-lg shadow hover:bg-blue-300 transition-shadow border border-gray-200"
                  >
                    <h3 className="text-lg font-medium text-black">
                      {semester.name}
                    </h3>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No hay semestres registrados aún.
                </p>
                <Link
                  href="/admin/semestres"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Ir al Panel de Administración
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center mb-4">
              <Link
                href="/"
                className="mr-2 text-blue-600 hover:text-blue-800 px-6"
              >
                ← Volver a todos los semestres
              </Link>
              <span className="text-gray-500">/</span>
              <span className="ml-2 font-medium">{currentSemester?.name}</span>
            </div>

            <h3 className="text-xl font-semibold mb-4 px-4">
              Asignaturas del {currentSemester?.name}:
            </h3>

            {subjects.length > 0 ? (
              <div className="space-y-3 px-4">
                {subjects.map((subject) => (
                  <Link
                    key={subject.id}
                    href={`/subject/${subject.id}`}
                    className="block bg-blue-500 p-3 rounded shadow-sm border border-gray-200 hover:bg-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black">
                        {subject.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-gray-500 mb-4">
                  No hay asignaturas registradas para este semestre.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
