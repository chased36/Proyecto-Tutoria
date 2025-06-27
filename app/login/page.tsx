"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth-actions";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState(""); // Vacío por defecto
  const [password, setPassword] = useState(""); // Vacío por defecto
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verificar si ya está logueado al cargar la página
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData.id && userData.email) {
          console.log("👤 Usuario ya logueado, redirigiendo...");
          router.push("/admin");
        }
      } catch (error) {
        console.log("🗑️ Limpiando localStorage corrupto");
        localStorage.removeItem("user");
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("🔐 Intentando login con:", { email, password: "***" });

      // Usar la función real de autenticación con base de datos
      const result = await loginAction(email, password);

      console.log("📊 Resultado del login:", {
        success: result.success,
        hasUser: !!result.user,
      });

      if (result.success && result.user) {
        // Login exitoso - guardar usuario en localStorage y cookies
        const userString = JSON.stringify(result.user);
        localStorage.setItem("user", userString);

        // Guardar también en cookies para el middleware
        document.cookie = `user=${userString}; path=/; max-age=86400`; // 24 horas

        console.log("✅ Sesión guardada, redirigiendo a admin...");

        // Redirigir al admin
        router.push("/admin");
      } else {
        console.log("❌ Login fallido:", result.error);
        setError(result.error || "Correo o contraseña incorrectos.");
      }
    } catch (err) {
      console.error("❌ Error en handleSubmit:", err);
      setError("Error de conexión. Intenta nuevamente.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="bg-gray-200 p-8 rounded-xl shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-black text-center mb-8">
            Inicio de sesión
          </h1>

          <form className="flex flex-col space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-black mb-2" htmlFor="email">
                Correo:
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-white text-black px-4 py-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-black mb-2" htmlFor="password">
                Contraseña:
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full bg-white text-black px-4 py-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#012243] text-white py-2 px-4 rounded-md hover:opacity-90 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Acceder"}
            </button>
          </form>

          {/* Información de ayuda */}
          <div className="mt-6 p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-gray-600 text-center">
              <strong>¿No tienes cuenta?</strong>
              <br />
              Contacta al administrador para crear una cuenta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
