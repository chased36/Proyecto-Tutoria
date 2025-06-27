"use client";

import type React from "react";

import Link from "next/link";
import { useState } from "react";
import { Menu, BookOpen, Users, LogOut, Home } from "lucide-react";
import { AuthGuard } from "@/app/ui/auth-guard";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { AdminAuthProvider } from "./auth-provider";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <AuthGuard>
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
          {user && (
            <div className="mb-4 p-2 bg-blue-300 rounded">
              <p className="text-sm text-black">Bienvenido,</p>
              <p className="font-semibold text-black">{user.nombre}</p>
            </div>
          )}
          <nav className="flex flex-col space-y-4">
            <Link
              href="/admin/"
              className="flex items-center gap-2 hover:bg-blue-200 p-2 rounded"
            >
              <Home size={18} color="black" />
              <h2 className="text-lg font-medium text-black">Inicio</h2>
            </Link>
            <Link
              href="/admin/semestres"
              className="flex items-center gap-2 hover:bg-blue-200 p-2 rounded"
            >
              <BookOpen size={18} color="black" />
              <h2 className="text-lg font-medium text-black">Semestre</h2>
            </Link>
            <Link
              href="/admin/usuarios"
              className="flex items-center gap-2 hover:bg-blue-200 p-2 rounded"
            >
              <Users size={18} color="black" />
              <h2 className="text-lg font-medium text-black">Usuarios</h2>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-blue-200 p-2 rounded text-left w-full"
            >
              <LogOut size={18} color="black" />
              <h2 className="text-lg font-medium text-black">Cerrar Sesión</h2>
            </button>
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
    </AuthGuard>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}
