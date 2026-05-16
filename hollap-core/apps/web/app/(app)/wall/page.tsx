"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../lib/api";
import type { WallQuestion, WallReply } from "../../../lib/types";
import { VoiceRecorder } from "../../../components/wall/VoiceRecorder";

type Me = {
  id: string;
  role: "TEACHER" | "STUDENT" | "ASSISTANT";
};

function WallPageContent() {
  const searchParams = useSearchParams();
  const teacherId = searchParams.get("teacherId");

  const [me, setMe] = useState<Me | null>(null);
  const [questions, setQuestions] = useState<WallQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [replies, setReplies] = useState<WallReply[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api
      .get<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setError("Duvari gormek icin giris yapmalisin."));
  }, []);

  async function loadQuestions(targetTeacherId: string) {
    const questionData = await api.get<WallQuestion[]>(
      `/api/wall/teachers/${targetTeacherId}/questions`,
    );
    setQuestions(questionData);
    if (questionData.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questionData[0].id);
    }
  }

  async function loadReplies(questionId: string) {
    const replyData = await api.get<WallReply[]>(`/api/wall/questions/${questionId}/replies`);
    setReplies(replyData);
  }

  useEffect(() => {
    if (!teacherId) {
      return;
    }
    loadQuestions(teacherId).catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "Sorular yuklenemedi"),
    );
  }, [teacherId]);

  useEffect(() => {
    if (!selectedQuestionId) {
      return;
    }
    loadReplies(selectedQuestionId).catch(() => setReplies([]));
  }, [selectedQuestionId]);

  async function createQuestion() {
    if (!teacherId || !newQuestion.trim()) {
      return;
    }
    try {
      await api.post("/api/wall/questions", {
        questionText: newQuestion,
      });
      setNewQuestion("");
      await loadQuestions(teacherId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Soru eklenemedi");
    }
  }

  async function uploadReply(blob: Blob, durationSec: number) {
    if (!selectedQuestionId) {
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "reply.webm");
      formData.append("durationSec", String(durationSec));
      await api.post(`/api/wall/questions/${selectedQuestionId}/replies`, formData);
      await loadReplies(selectedQuestionId);
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Ses kaydi yuklenemedi");
    } finally {
      setUploading(false);
    }
  }

  async function deleteReply(replyId: string) {
    try {
      await api.delete(`/api/wall/replies/${replyId}`);
      if (selectedQuestionId) {
        await loadReplies(selectedQuestionId);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Silinemedi");
    }
  }

  if (!teacherId) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        Duvari acmak icin `teacherId` parametresi gerekli.
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Sesli Bilgi Duvari</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {me?.id === teacherId && (
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Duvara Soru Ekle</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={newQuestion}
              onChange={(event) => setNewQuestion(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Bu hafta en buyuk aydinlanma aniniz neydi?"
            />
            <button
              onClick={createQuestion}
              className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white"
            >
              Paylas
            </button>
          </div>
        </article>
      )}

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Sorular</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {questions.map((question) => (
            <button
              key={question.id}
              onClick={() => setSelectedQuestionId(question.id)}
              className={`rounded-md px-3 py-2 text-xs ${
                selectedQuestionId === question.id
                  ? "bg-brand text-white"
                  : "border border-slate-300 bg-white"
              }`}
            >
              {question.questionText}
            </button>
          ))}
        </div>
      </article>

      {selectedQuestionId && me?.role === "STUDENT" && (
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">60 Saniye Sesli Cevap Birak</h2>
          {uploading ? (
            <p className="mt-2 text-sm text-slate-600">Yukleniyor...</p>
          ) : (
            <div className="mt-2">
              <VoiceRecorder onRecorded={uploadReply} />
            </div>
          )}
        </article>
      )}

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Ses Akisi</h2>
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{reply.student.name}</p>
                <p className="text-xs text-slate-500">{reply.durationSec}s</p>
              </div>
              <audio className="mt-2 w-full" controls src={reply.audioUrl} />
              {me?.id === teacherId && (
                <button
                  onClick={() => deleteReply(reply.id)}
                  className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  Kaydi Sil
                </button>
              )}
            </div>
          ))}
          {replies.length === 0 && (
            <p className="text-sm text-slate-600">Henuz sesli mesaj yok.</p>
          )}
        </div>
      </article>
    </section>
  );
}

export default function WallPage() {
  return (
    <Suspense fallback={<p>Yukleniyor...</p>}>
      <WallPageContent />
    </Suspense>
  );
}
