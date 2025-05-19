import Link from "next/link";

const semesters = [
  {
    id: "1",
    name: "Semestre 1",
    subjects: [
      "Tradiciones teóricas 1",
      "Tutoría Tradiciones teóricas 1",
      "Procesos estadísticos 1",
      "Dimensión biológica en psicología 1",
      "Introducción a los ámbitos profesionales 1",
      "Tutoría Dimensión biológica en psicología 1",
      "Taller de integración universitaria 1",
    ],
  },
  { id: "2", name: "Semestre 2", subjects: [] },
  { id: "3", name: "Semestre 3", subjects: [] },
  { id: "4", name: "Semestre 4", subjects: [] },
  { id: "5", name: "Semestre 5", subjects: [] },
  { id: "6", name: "Semestre 6", subjects: [] },
  { id: "7", name: "Semestre 7", subjects: [] },
  { id: "8", name: "Semestre 8", subjects: [] },
  { id: "9", name: "Semestre 9", subjects: [] },
];

export default function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const selectedSemester = searchParams.semester as string | undefined;
  const currentSemester = semesters.find((sem) => sem.id === selectedSemester);

  return (
    <div>
      <section className="mb-8">
        <div className="text-center mt-6">
          <h1 className="text-3xl font-semibold mb-4">Plan de Estudios</h1>
        </div>
        {!selectedSemester ? (
          <>
            <p className="mb-4 px-6">Selecciona el Semestre:</p>
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

            {currentSemester?.subjects.length ? (
              <div className="space-y-3 px-4">
                {currentSemester.subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 p-3 rounded shadow-sm border border-gray-200 hover:bg-blue-300"
                  >
                    {subject}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                No hay asignaturas registradas para este semestre.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
