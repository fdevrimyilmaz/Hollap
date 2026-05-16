"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { getTokens } from "../../lib/auth-storage";
import { API_BASE_URL } from "../../lib/config";
import { getSocket } from "../../lib/socket";

type RoomResponse = {
  id: string;
  title: string;
  description?: string | null;
  teacherUserId: string;
  state: "ACTIVE" | "ENDED";
};

type Note = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
};

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

export function StageRoomClient({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [micRequests, setMicRequests] = useState<MicRequest[]>([]);
  const [roomRole, setRoomRole] = useState<
    "TEACHER" | "MODERATOR" | "SPEAKER" | "LISTENER"
  >("LISTENER");
  const [canSpeak, setCanSpeak] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const socket = useMemo(() => getSocket(), []);
  const isTeacher = me?.id === room?.teacherUserId;
  const canModerate = roomRole === "TEACHER" || roomRole === "MODERATOR";
  const canWriteNotes = Boolean(
    me && room && (me.id === room.teacherUserId || me.role === "ASSISTANT"),
  );

  useEffect(() => {
    api
      .get<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setError("Bu oda icin once giris yapmalisin."));
  }, []);

  useEffect(() => {
    if (!me) {
      return;
    }
    Promise.all([
      api.get<RoomResponse>(`/api/stage/rooms/${roomId}`),
      api.get<Note[]>(`/api/stage/rooms/${roomId}/notes`),
      api
        .get<MicRequest[]>(`/api/stage/rooms/${roomId}/mic-requests`)
        .catch(() => [] as MicRequest[]),
    ])
      .then(([roomData, noteData, requestData]) => {
        setRoom(roomData);
        setNotes(noteData);
        setMicRequests(requestData);
        setCanSpeak(me.id === roomData.teacherUserId);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Oda yuklenemedi"),
      );
  }, [me, roomId]);

  useEffect(() => {
    if (!me) {
      return;
    }
    const currentMe = me;

    async function setupAudio() {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = currentMe.role === "TEACHER";
        });
        localStreamRef.current = localStream;
      } catch {
        setError("Mikrofon erisimi olmadan sesli odaya katilim sinirli calisir.");
      }
    }

    setupAudio().catch(() => undefined);
  }, [me]);

  function upsertPeerList(userId: string) {
    setConnectedPeers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
  }

  function removePeer(userId: string) {
    const connection = peerConnectionsRef.current.get(userId);
    if (connection) {
      connection.close();
      peerConnectionsRef.current.delete(userId);
    }
    const audioElement = audioElementsRef.current.get(userId);
    if (audioElement) {
      audioElement.remove();
      audioElementsRef.current.delete(userId);
    }
    setConnectedPeers((prev) => prev.filter((item) => item !== userId));
  }

  async function createPeerConnection(targetUserId: string, shouldOffer: boolean) {
    if (peerConnectionsRef.current.has(targetUserId)) {
      return peerConnectionsRef.current.get(targetUserId)!;
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current as MediaStream);
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:signal", {
          roomId,
          toUserId: targetUserId,
          data: { candidate: event.candidate },
        });
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) {
        return;
      }
      let audioElement = audioElementsRef.current.get(targetUserId);
      if (!audioElement) {
        audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        audioElementsRef.current.set(targetUserId, audioElement);
      }
      audioElement.srcObject = stream;
      upsertPeerList(targetUserId);
    };

    peerConnectionsRef.current.set(targetUserId, peer);

    if (shouldOffer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc:signal", {
        roomId,
        toUserId: targetUserId,
        data: { sdp: offer },
      });
    }

    return peer;
  }

  useEffect(() => {
    if (!me) {
      return;
    }

    socket.emit("room:join", { roomId });

    const onRoomJoined = (payload: {
      role: "TEACHER" | "MODERATOR" | "SPEAKER" | "LISTENER";
    }) => {
      setRoomRole(payload.role);
    };

    const onParticipant = async (payload: { userId: string; action: "join" | "leave" }) => {
      if (payload.userId === me.id) {
        return;
      }

      if (payload.action === "join") {
        await createPeerConnection(payload.userId, true);
      } else {
        removePeer(payload.userId);
      }
    };

    const onSignal = async (payload: {
      fromUserId: string;
      data: {
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
    }) => {
      const peer = await createPeerConnection(payload.fromUserId, false);

      if (payload.data.sdp) {
        await peer.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));

        if (payload.data.sdp.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("webrtc:signal", {
            roomId,
            toUserId: payload.fromUserId,
            data: { sdp: answer },
          });
        }
      }

      if (payload.data.candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(payload.data.candidate));
      }
    };

    const onMicRequest = (payload: MicRequest) => {
      if (canModerate) {
        setMicRequests((prev) => [...prev, payload]);
      }
    };

    const onMicApproved = (payload: { userId: string }) => {
      if (payload.userId === me.id) {
        setCanSpeak(true);
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      setMicRequests((prev) => prev.filter((request) => request.userId !== payload.userId));
    };

    const onMicRevoked = (payload: { userId: string }) => {
      if (payload.userId === me.id) {
        setCanSpeak(false);
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    };

    const onNewNote = (note: Note) => {
      setNotes((prev) => [...prev, note]);
    };

    const onRoomEnd = () => {
      setError("Oturum sonlandirildi.");
    };

    socket.on("room:participant", onParticipant);
    socket.on("room:joined", onRoomJoined);
    socket.on("webrtc:signal", onSignal);
    socket.on("request:mic", onMicRequest);
    socket.on("approve:mic", onMicApproved);
    socket.on("revoke:mic", onMicRevoked);
    socket.on("new:note", onNewNote);
    socket.on("end:room", onRoomEnd);

    return () => {
      socket.emit("room:leave", { roomId });
      socket.off("room:participant", onParticipant);
      socket.off("room:joined", onRoomJoined);
      socket.off("webrtc:signal", onSignal);
      socket.off("request:mic", onMicRequest);
      socket.off("approve:mic", onMicApproved);
      socket.off("revoke:mic", onMicRevoked);
      socket.off("new:note", onNewNote);
      socket.off("end:room", onRoomEnd);

      peerConnectionsRef.current.forEach((peer) => peer.close());
      peerConnectionsRef.current.clear();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [canModerate, me, roomId, socket]);

  async function sendNote() {
    if (!noteInput.trim()) {
      return;
    }
    socket.emit("new:note", { roomId, content: noteInput });
    setNoteInput("");
  }

  function requestMic() {
    socket.emit("request:mic", { roomId });
  }

  function approveMic(userId: string) {
    socket.emit("approve:mic", { roomId, userId });
  }

  function revokeMic(userId: string) {
    socket.emit("revoke:mic", { roomId, userId });
  }

  function endRoom() {
    socket.emit("end:room", { roomId });
  }

  async function downloadNotes() {
    try {
      const token = getTokens()?.accessToken;
      if (!token) {
        throw new Error("Once giris yapmalisin.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/stage/rooms/${roomId}/notes/export.txt`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Notlar indirilemedi.");
      }

      const text = await response.text();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `hollap-room-${roomId}-notes.txt`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Indirme hatasi");
    }
  }

  if (error && !room) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <section className="space-y-5">
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold">{room?.title ?? "Canli Oda"}</h1>
        <p className="mt-2 text-sm text-slate-600">{room?.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!canSpeak && !isTeacher && (
            <button
              onClick={requestMic}
              className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white"
            >
              Soz Talep Et
            </button>
          )}
          {canSpeak && (
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
              Mikrofon Acik
            </span>
          )}
          {isTeacher && (
            <button
              onClick={endRoom}
              className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
            >
              Odayi Bitir
            </button>
          )}
          <button
            onClick={downloadNotes}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
          >
            Notlari Indir
          </button>
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Bagli Katilimcilar</h2>
        <p className="mt-2 text-sm text-slate-600">
          {connectedPeers.length} kisiyle ses kanali baglantisi olustu.
        </p>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Canli Notlar</h2>
        <div className="mt-3 space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-md border border-slate-200 p-2 text-sm">
              <p>{note.content}</p>
              <p className="mt-1 text-xs text-slate-500">{note.author.name}</p>
            </div>
          ))}
        </div>

        {canWriteNotes && (
          <div className="mt-3 space-y-2">
            <textarea
              value={noteInput}
              onChange={(event) => setNoteInput(event.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              rows={3}
              placeholder="Canli notunu yaz"
            />
            <button
              onClick={sendNote}
              className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white"
            >
              Notu Paylas
            </button>
          </div>
        )}
      </article>

      {canModerate && (
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Mikrofon Talepleri</h2>
          <div className="mt-3 space-y-2">
            {micRequests.length === 0 && (
              <p className="text-sm text-slate-600">Bekleyen talep yok.</p>
            )}
            {micRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-md border border-slate-200 p-2"
              >
                <span className="text-sm">{request.user.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMic(request.userId)}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => revokeMic(request.userId)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  >
                    Sustur
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
