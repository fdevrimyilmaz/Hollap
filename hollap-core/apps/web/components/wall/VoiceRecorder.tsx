"use client";

import { useEffect, useRef, useState } from "react";

type VoiceRecorderProps = {
  onRecorded: (blob: Blob, durationSec: number) => void;
};

export function VoiceRecorder({ onRecorded }: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecorded(blob, duration);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setDuration(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setDuration((previous) => {
          if (previous >= 60) {
            stopRecording();
            return 60;
          }
          return previous + 1;
        });
      }, 1000);
    } catch {
      setError("Mikrofon erisimi reddedildi.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-slate-600">Kayit suresi: {duration}s / 60s</p>
      {!recording ? (
        <button
          onClick={startRecording}
          className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white"
        >
          Ses Kaydina Basla
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
        >
          Kaydi Durdur
        </button>
      )}
    </div>
  );
}
