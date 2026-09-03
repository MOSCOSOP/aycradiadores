"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { COMPANY } from "@/lib/constants";
import { api } from "@/lib/api/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/documents/create";
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_DEFAULT_EMAIL ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.auth.login(email, password);
      // Navegación forzada (no router.push): tras iniciar sesión, la ruta destino
      // pudo haber sido visitada/precargada como no autenticada (p. ej. al abrir un
      // enlace directo desde el celular), y el router cache del cliente podía
      // reproducir esa respuesta vieja (sin sesión) en vez de pedirla de nuevo al
      // servidor. window.location fuerza una petición nueva con la cookie recién
      // creada, evitando que la app "rebote" al login pese a haber ingresado bien.
      window.location.href = nextPath.startsWith("/") ? nextPath : "/documents/create";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ingresar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full">
      <div className="auth-bg fixed inset-0" />
      <div className="relative flex h-full items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <span className="auth-logo-badge">
              <Image
                src="/images/logo-client.png"
                alt={COMPANY.tradeName}
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
                priority
              />
            </span>
          </div>

          <div className="text-center">
            <h1 className="mb-1 text-2xl font-bold text-[var(--foreground)]">
              Bienvenido a
              <br />
              {COMPANY.loginTitle}
            </h1>
            <p className="mb-6 text-[var(--muted)]">Ingresa a tu cuenta</p>
          </div>

          <div className="bg-card-login">
            <form onSubmit={handleSubmit} className="text-end">
              {error && (
                <div className="ify-alert-error mb-3 text-left text-sm">
                  {error}
                </div>
              )}
              <div className="filled-input mb-3">
                <i className="bi bi-envelope input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="Correo Electronico"
                  className="ify-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="filled-input mb-4">
                <i className="bi bi-lock input-icon" />
                <input
                  id="password"
                  type="password"
                  placeholder="Contraseña"
                  className="ify-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="ify-btn-primary w-full py-3" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
