"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo entrar.");
      setPassword("");
      const next = new URLSearchParams(window.location.search).get("next");
      const target = next ? new URL(next, window.location.origin) : null;
      window.location.replace(target?.origin === window.location.origin && target.pathname !== "/login" ? target.href : "/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Comprueba tu conexión e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return <main className="flex min-h-dvh items-center justify-center px-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
    <form onSubmit={login} className="w-full max-w-sm rounded-[24px] p-7" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
      <p className="mb-2 text-sm font-semibold" style={{ color: "var(--accent)" }}>Horadia · Espacio privado</p>
      <h1 className="mb-3 text-3xl font-bold">Hola, Alba</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>Introduce la contraseña una vez para recordar este dispositivo.</p>
      <label htmlFor="password" className="mb-2 block text-sm font-semibold">Contraseña</label>
      <input id="password" type="password" autoComplete="current-password" required maxLength={256} value={password}
        onChange={(event) => setPassword(event.target.value)} disabled={busy}
        className="mb-4 min-h-12 w-full rounded-xl px-3 text-base" style={{ background: "var(--surface-raised)", border: "1px solid var(--hairline)" }} />
      {error ? <p role="alert" className="mb-4 text-sm">{error}</p> : null}
      <button disabled={busy || !password} className="min-h-12 w-full rounded-xl font-semibold disabled:opacity-50" style={{ background: "var(--accent)", color: "white" }}>{busy ? "Comprobando…" : "Entrar"}</button>
      <p className="mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>Si borras los datos del navegador, tendrás que volver a introducirla.</p>
    </form>
  </main>;
}
