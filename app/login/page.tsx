"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulación de autenticación
    if (email === "admin@admin.com" && password === "admin") {
      router.push("/admin");
    } else {
      setError("Correo o contraseña incorrectos.");
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
                placeholder="Correo electrónico"
                className="w-full bg-white text-black px-4 py-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                required
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
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#012243] text-white py-2 px-4 rounded-md hover:opacity-90 transition"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Acceder"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
