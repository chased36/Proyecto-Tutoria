import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <h2 className="text-3xl font-bold mb-4">Asignatura no encontrada</h2>
      <p className="text-gray-600 mb-6 text-center">
        La asignatura que estás buscando no existe o ha sido eliminada.
      </p>
      <Link
        href="/"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ← Volver al inicio
      </Link>
    </div>
  );
}
