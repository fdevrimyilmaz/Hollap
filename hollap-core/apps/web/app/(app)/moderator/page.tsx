"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import type { StageRoom, TeacherProfile, TeacherStripeStatus } from "../../../lib/types";

type Me = {
  id: string;
  role: "TEACHER" | "STUDENT" | "ASSISTANT";
};

type MicRequest = {
  id: string;
  userId: string;
  user: {
    name: string;
  };
};

export default function ModeratorPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [assistantTeacherId, setAssistantTeacherId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<StageRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [requests, setRequests] = useState<MicRequest[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [priceMonthly, setPriceMonthly] = useState(499);

  const [stripeStatus, setStripeStatus] = useState<TeacherStripeStatus | null>(null);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const socket = useMemo(() => getSocket(), []);

  async function loadRooms(teacherIdOverride?: string) {
    const endpoint = teacherIdOverride
      ? `/api/stage/teachers/${teacherIdOverride}/rooms`
      : "/api/stage/teachers/me/rooms";
    const roomData = await api.get<StageRoom[]>(endpoint);
    setRooms(roomData);
    if (!selectedRoomId && roomData.length > 0) {
      setSelectedRoomId(roomData[0].id);
    }
  }

  async function loadRequests(roomId: string) {
    const requestData = await api.get<MicRequest[]>(
      `/api/stage/rooms/${roomId}/mic-requests`,
    );
    setRequests(requestData);
  }

  async function loadTeacherProfile(teacherId: string) {
    const teacherProfile = await api.get<TeacherProfile>(`/api/teachers/${teacherId}`);
    setBio(teacherProfile.bio);
    setPriceMonthly(teacherProfile.priceMonthly);
  }

  async function loadStripeStatus() {
    try {
      const status = await api.get<TeacherStripeStatus>("/api/teachers/me/stripe/status");
      setStripeStatus(status);
    } catch (statusError) {
      setStripeStatus(null);
      if (statusError instanceof Error && statusError.message.includes("Teacher profile")) {
        setNotice("Stripe baglantisi icin once ogretmen profilini kaydet.");
      }
    }
  }

  useEffect(() => {
    api
      .get<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setError("Moderator paneli icin giris gerekli."));
  }, []);

  useEffect(() => {
    if (me?.role !== "TEACHER") {
      if (me?.role === "ASSISTANT") {
        const teacherId = new URLSearchParams(window.location.search).get("teacherId");
        if (!teacherId) {
          setError("Asistan paneli icin URL'e teacherId parametresi eklenmeli.");
          return;
        }
        setAssistantTeacherId(teacherId);
        loadRooms(teacherId).catch((loadError) =>
          setError(loadError instanceof Error ? loadError.message : "Panel yuklenemedi"),
        );
      }
      return;
    }

    Promise.all([loadRooms(), loadTeacherProfile(me.id), loadStripeStatus()]).catch(
      (loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Panel yuklenemedi"),
    );
  }, [me]);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }
    loadRequests(selectedRoomId).catch(() => setRequests([]));
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }

    socket.emit("room:join", { roomId: selectedRoomId });

    const onIncomingRequest = (payload: MicRequest) => {
      if (payload.id && payload.userId) {
        setRequests((prev) => [...prev, payload]);
      }
    };

    socket.on("request:mic", onIncomingRequest);

    return () => {
      socket.emit("room:leave", { roomId: selectedRoomId });
      socket.off("request:mic", onIncomingRequest);
    };
  }, [selectedRoomId, socket]);

  async function saveTeacherProfile() {
    setError(null);
    setNotice(null);
    try {
      await api.put("/api/teachers/me/profile", {
        bio,
        category: "Borsa & Finans",
        priceMonthly,
      });
      setNotice("Profil guncellendi.");
      await loadStripeStatus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profil kaydedilemedi");
    }
  }

  async function connectStripe() {
    setStripeBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ mode: "mock" | "stripe"; url: string }>(
        "/api/teachers/me/stripe/onboarding-link",
      );
      window.location.href = result.url;
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Stripe baglanamadi");
    } finally {
      setStripeBusy(false);
    }
  }

  async function createRoom() {
    setError(null);
    try {
      await api.post("/api/stage/rooms", {
        title,
        description,
      });
      setTitle("");
      setDescription("");
      await loadRooms();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Oda acilamadi");
    }
  }

  function approve(userId: string) {
    if (!selectedRoomId) {
      return;
    }
    socket.emit("approve:mic", { roomId: selectedRoomId, userId });
    setRequests((prev) => prev.filter((request) => request.userId !== userId));
  }

  function revoke(userId: string) {
    if (!selectedRoomId) {
      return;
    }
    socket.emit("revoke:mic", { roomId: selectedRoomId, userId });
  }

  if (!me) {
    return <p>Yukleniyor...</p>;
  }

  if (me.role !== "TEACHER" && me.role !== "ASSISTANT") {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Bu alan ogretmen ve asistan hesaplarina aciktir.
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">
        {me.role === "TEACHER" ? "Ogretmen Moderator Paneli" : "Asistan Moderator Paneli"}
      </h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      {me.role === "TEACHER" && (
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Stripe Connect</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs">
              Account: {stripeStatus?.accountId ?? "Bagli degil"}
            </span>
            <span
              className={`rounded-md px-2 py-1 text-xs ${
                stripeStatus?.chargesEnabled
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              Charges: {stripeStatus?.chargesEnabled ? "Hazir" : "Beklemede"}
            </span>
            <span
              className={`rounded-md px-2 py-1 text-xs ${
                stripeStatus?.payoutsEnabled
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              Payouts: {stripeStatus?.payoutsEnabled ? "Hazir" : "Beklemede"}
            </span>
          </div>
          <button
            onClick={connectStripe}
            disabled={stripeBusy}
            className="mt-3 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {stripeBusy ? "Yonlendiriliyor..." : "Stripe Onboarding Ac"}
          </button>
        </article>
      )}

      {me.role === "TEACHER" && (
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Profil Ayarlari</h2>
          <div className="mt-3 grid gap-2">
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              className="rounded-md border border-slate-300 p-2 text-sm"
              placeholder="Biyografi"
            />
            <input
              type="number"
              min={1}
              value={priceMonthly}
              onChange={(event) => setPriceMonthly(Number(event.target.value))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Aylik fiyat (TL)"
            />
            <button
              onClick={saveTeacherProfile}
              className="w-fit rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white"
            >
              Profili Kaydet
            </button>
          </div>
        </article>
      )}

      {me.role === "TEACHER" && (
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Yeni Oda Baslat</h2>
          <div className="mt-3 grid gap-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Oda basligi"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Aciklama"
            />
            <button
              onClick={createRoom}
              className="w-fit rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white"
            >
              Odayi Ac
            </button>
          </div>
        </article>
      )}

      {me.role === "ASSISTANT" && assistantTeacherId && (
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Asistan Modu</h2>
          <p className="mt-2 text-sm text-slate-600">
            Bagli ogretmen ID: {assistantTeacherId}
          </p>
          <p className="text-sm text-slate-600">
            Mikrofon talepleri ve oda yonetimi yetkileri aktif.
          </p>
        </article>
      )}

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Acilmis Odalar</h2>
        <div className="mt-3 space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between rounded-md border border-slate-200 p-2"
            >
              <button
                onClick={() => setSelectedRoomId(room.id)}
                className="text-left text-sm font-medium"
              >
                {room.title}
              </button>
              <Link
                href={`/stage/${room.id}`}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              >
                Odaya Git
              </Link>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Mikrofon Talep Listesi</h2>
        <div className="mt-3 space-y-2">
          {requests.length === 0 && (
            <p className="text-sm text-slate-600">Bekleyen talep yok.</p>
          )}
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between rounded-md border border-slate-200 p-2"
            >
              <span className="text-sm">{request.user.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => approve(request.userId)}
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white"
                >
                  Onayla
                </button>
                <button
                  onClick={() => revoke(request.userId)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  Sustur
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
