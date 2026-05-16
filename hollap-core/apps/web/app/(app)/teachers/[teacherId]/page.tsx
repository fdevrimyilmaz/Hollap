"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
import type { StageRoom, TeacherProfile } from "../../../../lib/types";

type MeResponse = {
  id: string;
  role: "TEACHER" | "STUDENT" | "ASSISTANT";
};

export default function TeacherProfilePage() {
  const params = useParams<{ teacherId: string }>();
  const teacherId = params.teacherId;

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [rooms, setRooms] = useState<StageRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isOwner = useMemo(() => me?.id === teacherId, [me?.id, teacherId]);
  const hasAccess = Boolean(isOwner || profile?.isSubscribed);

  async function loadProfile() {
    const [profileData, meData] = await Promise.all([
      api.get<TeacherProfile>(`/api/teachers/${teacherId}`, false),
      api.get<MeResponse>("/api/auth/me").catch(() => null),
    ]);

    setProfile(profileData);
    setMe(meData);
  }

  useEffect(() => {
    loadProfile().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Profil yuklenemedi");
    });
  }, [teacherId]);

  useEffect(() => {
    if (!hasAccess) {
      setRooms([]);
      return;
    }
    api
      .get<StageRoom[]>(`/api/stage/teachers/${teacherId}/rooms`)
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [hasAccess, teacherId]);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const checkout = await api.post<{
        mode: "mock" | "stripe";
        subscriptionId: string;
        checkoutUrl?: string;
      }>("/api/subscriptions/checkout", { teacherUserId: teacherId });

      if (checkout.mode === "mock") {
        await api.post("/api/subscriptions/mock/confirm", {
          subscriptionId: checkout.subscriptionId,
        });
      } else if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }

      await loadProfile();
    } catch (subscriptionError) {
      setError(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : "Abonelik islemi basarisiz",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!profile) {
    return <p>Yukleniyor...</p>;
  }

  return (
    <section className="space-y-5">
      <article className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">{profile.category}</p>
        <h1 className="mt-1 text-2xl font-semibold">{profile.user.name}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">{profile.bio}</p>
        <p className="mt-4 text-base font-semibold">
          {profile.priceMonthly.toLocaleString("tr-TR")} TL / ay
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {!hasAccess && (
          <button
            disabled={loading}
            onClick={subscribe}
            className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Isleniyor..." : "Abone Ol"}
          </button>
        )}
      </article>

      {hasAccess ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Sesli Kursu Odalari</h2>
            <div className="mt-3 space-y-2">
              {rooms.length === 0 && (
                <p className="text-sm text-slate-600">Aktif oda bulunamadi.</p>
              )}
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium">{room.title}</p>
                    {room.description && (
                      <p className="text-sm text-slate-600">{room.description}</p>
                    )}
                  </div>
                  <Link
                    href={`/stage/${room.id}`}
                    className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white"
                  >
                    Katil ve Dinle
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Sesli Bilgi Duvari</h2>
            <p className="mt-3 text-sm text-slate-700">
              Haftalik sorulara 60 saniyelik sesli cevap birakabilirsin.
            </p>
            <Link
              href={`/wall?teacherId=${teacherId}`}
              className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm text-white"
            >
              Duvara Git
            </Link>
          </section>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          Sesli kursu ve duvar icerigi sadece abonelere aciktir.
        </p>
      )}

      {isOwner && (
        <Link
          href="/moderator"
          className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          Moderatör Paneline Git
        </Link>
      )}
    </section>
  );
}
