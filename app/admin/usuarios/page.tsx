"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Plus, Trash2, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getUsersAction,
  createUserAction,
  deleteUserAction,
} from "@/app/actions/auth-actions";
import type { User as UserType } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsersAction();
      if (result.success && result.users) {
        setUsers(result.users);
        console.log("✅ Usuarios cargados:", result.users.length);
      } else {
        console.error("❌ Error cargando usuarios:", result.error);
      }
    } catch (error) {
      console.error("❌ Error en loadUsers:", error);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nombre.trim() ||
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      alert("Todos los campos son requeridos");
      return;
    }

    setIsSubmitting(true);
    console.log("🔐 Creando usuario:", {
      nombre: formData.nombre,
      email: formData.email,
    });

    try {
      const result = await createUserAction(
        formData.nombre,
        formData.email,
        formData.password
      );

      if (result.success) {
        console.log("✅ Usuario creado exitosamente");
        setFormData({ nombre: "", email: "", password: "" });
        setIsModalOpen(false);
        await loadUsers(); // Recargar la lista
      } else {
        console.error("❌ Error creando usuario:", result.error);
        alert(result.error || "Error al crear usuario");
      }
    } catch (error) {
      console.error("❌ Error en handleCreateUser:", error);
      alert("Error de conexión");
    }

    setIsSubmitting(false);
  };

  const handleDeleteUser = async (id: string, email: string) => {
    // Prevenir que el admin se elimine a sí mismo
    if (email === "admin@admin.com") {
      alert("No puedes eliminar la cuenta de administrador principal");
      return;
    }

    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      try {
        const result = await deleteUserAction(id);
        if (result.success) {
          console.log("✅ Usuario eliminado");
          await loadUsers();
        } else {
          alert(result.error || "Error al eliminar usuario");
        }
      } catch (error) {
        console.error("❌ Error eliminando usuario:", error);
        alert("Error de conexión");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Solo el administrador principal puede gestionar usuarios
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Usuario
        </Button>
      </div>

      {/* Modal personalizado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Crear Nuevo Usuario</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Los nuevos usuarios tendrán rol de editor y acceso limitado al
              sistema.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Nombre completo"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Contraseña"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creando..." : "Crear Usuario"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            Lista de Usuarios ({users.length})
          </h2>
        </div>
        <div className="p-6">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.email === "admin@admin.com"
                          ? "bg-red-500"
                          : "bg-green-500"
                      }`}
                    >
                      {user.email === "admin@admin.com" ? (
                        <Shield className="w-5 h-5 text-white" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{user.nombre}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            user.email === "admin@admin.com"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {user.email === "admin@admin.com"
                            ? "Administrador"
                            : "Editor"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-400">
                        Registrado:{" "}
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {user.email !== "admin@admin.com" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Información sobre Roles
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Administrador:</strong> Acceso completo al sistema,
                  incluyendo gestión de usuarios
                </li>
                <li>
                  <strong>Editor:</strong> Puede gestionar semestres y
                  asignaturas, pero no usuarios
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
