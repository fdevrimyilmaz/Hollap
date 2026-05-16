"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { setTokens } from "../lib/auth-storage";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const tokens = await api.post<{ accessToken: string; refreshToken: string }>(
          "/api/auth/login",
          { email, password },
          false,
        );
        setTokens(tokens);
      } else {
        const tokens = await api.post<{ accessToken: string; refreshToken: string }>(
          "/api/auth/register",
          { email, password, name, role },
          false,
        );
        setTokens(tokens);
      }

      router.push("/teachers");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Bir hata oldu");
    } finally {
      setLoading(false);
    }
  }

  async function oauthSimulate(provider: "google" | "apple") {
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.post<{ accessToken: string; refreshToken: string }>(
        `/api/auth/oauth/${provider}`,
        {
          mockEmail: email || `${provider}.demo@hollap.com`,
          mockName: name || `${provider.toUpperCase()} Demo`,
        },
        false,
      );
      setTokens(tokens);
      router.push("/teachers");
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "OAuth hatasi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold">
        {mode === "login" ? "Hesabina Giris Yap" : "Yeni Hesap Olustur"}
      </h1>

      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Ad Soyad
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        E-posta
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Sifre
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>

      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Rol
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as "STUDENT" | "TEACHER")}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="STUDENT">Ogrenci</option>
            <option value="TEACHER">Ogretmen</option>
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={loading}
        type="submit"
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading
          ? "Isleniyor..."
          : mode === "login"
            ? "Giris Yap"
            : "Kayit Ol"}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => oauthSimulate("google")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Google ile
        </button>
        <button
          type="button"
          onClick={() => oauthSimulate("apple")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Apple ile
        </button>
      </div>
    </form>
  );
}
