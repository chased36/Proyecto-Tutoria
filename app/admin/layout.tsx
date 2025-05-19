"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, BookOpen, Users, LogOut } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-blue-400 text-white p-4 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:block
        `}
      >
        <h1 className="text-3xl font-semibold mb-4 text-black">
          Plan de Estudios
        </h1>
        <nav className="flex flex-col space-y-4">
          <Link
            href="/admin/semestres"
            className="flex items-center gap-2 hover:bg-blue-200"
          >
            <BookOpen size={18} color="black" />
            <h2 className="text-lg font-medium text-black">Semestre</h2>
          </Link>
          <Link
            href="/admin/usuarios"
            className="flex items-center gap-2 hover:bg-blue-200"
          >
            <Users size={18} color="black" />
            <h2 className="text-lg font-medium text-black">Usuarios</h2>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 hover:bg-blue-200"
          >
            <LogOut size={18} color="black" />
            <h2 className="text-lg font-medium text-black">Cerrar Sesión</h2>
          </Link>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="md:hidden bg-blue-400 text-white p-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-black">Panel</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
