import { getDashboardStats } from "@/lib/stats";
import {
  BookOpen,
  FileText,
  Video,
  HelpCircle,
  Users,
  GraduationCap,
} from "lucide-react";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      title: "Semestres",
      value: stats.semestres,
      icon: GraduationCap,
      color: "bg-blue-500",
    },
    {
      title: "Asignaturas",
      value: stats.asignaturas,
      icon: BookOpen,
      color: "bg-green-500",
    },
    {
      title: "PDFs",
      value: stats.pdfs,
      icon: FileText,
      color: "bg-red-500",
    },
    {
      title: "Videos",
      value: stats.videos,
      icon: Video,
      color: "bg-purple-500",
    },
    {
      title: "Preguntas",
      value: stats.preguntas,
      icon: HelpCircle,
      color: "bg-yellow-500",
    },
    {
      title: "Usuarios",
      value: stats.usuarios,
      icon: Users,
      color: "bg-indigo-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow-md p-6 border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-full`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
