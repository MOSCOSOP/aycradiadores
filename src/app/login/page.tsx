"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { APP_COMMIT, APP_VERSION, COMPANY } from "@/lib/constants";
import { api } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/documents/create";
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_DEFAULT_EMAIL ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState("");

  useEffect(() => {
    setNow(
      new Date().toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.auth.login(email, password);
      router.push(nextPath.startsWith("/") ? nextPath : "/documents/create");
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
            <Image
              src="/images/logo-client.png"
              alt={COMPANY.tradeName}
              width={70}
              height={70}
              className="h-[70px] w-auto object-contain"
              priority
            />
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

      <div className="absolute bottom-3 right-3 text-end">
        <p className="text-xs text-[var(--muted-light)]">v {APP_VERSION}</p>
        <p className="text-xs text-[var(--muted-light)]">{APP_COMMIT}</p>
        <p className="text-xs text-[var(--muted-light)]">{now}</p>
      </div>
    </div>
  );
}
