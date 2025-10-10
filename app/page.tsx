import Link from "next/link";
import {
  getCarreras,
  getSemestersByCarrera,
  getSubjectsBySemester,
  type Subject,
  type Semester,
} from "@/lib/db";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedCarrera = resolvedSearchParams.carrera as string | undefined;
  const selectedSemester = resolvedSearchParams.semester as string | undefined;

  const carreras = await getCarreras();
  let currentCarrera = null;
  let semesters: Semester[] = [];
  let currentSemester = null;
  let subjects: Subject[] = [];

  if (selectedCarrera) {
    currentCarrera = carreras.find((car) => car.id === selectedCarrera);
    if (currentCarrera) {
      semesters = await getSemestersByCarrera(selectedCarrera);
    }
  }

  if (selectedSemester) {
    currentSemester = semesters.find((sem) => sem.id === selectedSemester);
    if (currentSemester) {
      subjects = await getSubjectsBySemester(selectedSemester);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            Plan de Estudios
          </h1>

          {!selectedCarrera ? (
            <>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Selecciona la Carrera:
              </h2>
              {carreras.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carreras.map((carrera) => (
                    <Link
                      key={carrera.id}
                      href={`/?carrera=${carrera.id}`}
                      className="block p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                      <h3 className="text-xl font-bold">{carrera.name}</h3>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">
                    No hay carreras registradas aún.
                  </p>
                </div>
              )}
            </>
          ) : !selectedSemester ? (
            <>
              <div className="mb-6">
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Carreras
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-700 font-semibold">
                  {currentCarrera?.name}
                </span>
              </div>

              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Semestres de {currentCarrera?.name}:
              </h2>
              {semesters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {semesters.map((semester) => (
                    <Link
                      key={semester.id}
                      href={`/?carrera=${selectedCarrera}&semester=${semester.id}`}
                      className="block p-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                      <h3 className="text-xl font-bold">{semester.name}</h3>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">
                    No hay semestres registrados para esta carrera.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-6">
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Carreras
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <Link
                  href={`/?carrera=${selectedCarrera}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {currentCarrera?.name}
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-700 font-semibold">
                  {currentSemester?.name}
                </span>
              </div>

              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Asignaturas del {currentSemester?.name}:
              </h2>
              {subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/asignatura/${subject.id}/`}
                      className="block p-6 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                      <h3 className="text-xl font-bold">{subject.name}</h3>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">
                    No hay asignaturas registradas para este semestre.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
