import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { stageService } from "../modules/stage/stage.service";

type SocketUser = {
  id: string;
  role: "TEACHER" | "STUDENT" | "ASSISTANT";
  email: string;
};

const accessPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["TEACHER", "STUDENT", "ASSISTANT"]),
  email: z.string().email(),
  type: z.literal("access"),
});

async function getSocketUser(socket: Socket) {
  const token =
    (socket.handshake.auth.token as string | undefined) ??
    socket.handshake.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  const payload = accessPayloadSchema.parse(decoded);

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    id: user.id,
    role: user.role,
    email: user.email,
  } as SocketUser;
}

function safeHandler<T>(
  socket: Socket,
  handler: (payload: T) => Promise<void>,
): (payload: T) => void {
  return (payload: T) => {
    handler(payload).catch((error: Error) => {
      socket.emit("error:event", { message: error.message });
    });
  };
}

export function setupStageGateway(io: Server) {
  io.use(async (socket, next) => {
    try {
      const socketUser = await getSocketUser(socket);
      socket.data.user = socketUser;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;

    socket.on(
      "room:join",
      safeHandler<{ roomId: string }>(socket, async ({ roomId }) => {
        const joinInfo = await stageService.joinRoom(roomId, user.id);
        socket.join(roomId);
        io.to(roomId).emit("room:participant", { userId: user.id, action: "join" });
        socket.emit("room:joined", joinInfo);
      }),
    );

    socket.on(
      "room:leave",
      safeHandler<{ roomId: string }>(socket, async ({ roomId }) => {
        await stageService.leaveRoom(roomId, user.id);
        socket.leave(roomId);
        io.to(roomId).emit("room:participant", { userId: user.id, action: "leave" });
      }),
    );

    socket.on(
      "request:mic",
      safeHandler<{ roomId: string }>(socket, async ({ roomId }) => {
        const request = await stageService.requestMic(roomId, user.id);
        io.to(roomId).emit("request:mic", request);
      }),
    );

    socket.on(
      "approve:mic",
      safeHandler<{ roomId: string; userId: string }>(
        socket,
        async ({ roomId, userId }) => {
          await stageService.approveMic(roomId, user.id, userId);
          io.to(roomId).emit("approve:mic", { roomId, userId });
        },
      ),
    );

    socket.on(
      "revoke:mic",
      safeHandler<{ roomId: string; userId: string }>(
        socket,
        async ({ roomId, userId }) => {
          await stageService.revokeMic(roomId, user.id, userId);
          io.to(roomId).emit("revoke:mic", { roomId, userId });
        },
      ),
    );

    socket.on(
      "new:note",
      safeHandler<{ roomId: string; content: string }>(
        socket,
        async ({ roomId, content }) => {
          const note = await stageService.addNote(roomId, user.id, { content });
          io.to(roomId).emit("new:note", note);
        },
      ),
    );

    socket.on(
      "end:room",
      safeHandler<{ roomId: string }>(socket, async ({ roomId }) => {
        await stageService.endRoom(roomId, user.id);
        io.to(roomId).emit("end:room", { roomId });
      }),
    );

    socket.on(
      "webrtc:signal",
      safeHandler<{
        roomId: string;
        toUserId: string;
        data: unknown;
      }>(socket, async ({ roomId, toUserId, data }) => {
        const socketsInRoom = await io.in(roomId).fetchSockets();
        socketsInRoom
          .filter((roomSocket) => roomSocket.data.user?.id === toUserId)
          .forEach((targetSocket) => {
            targetSocket.emit("webrtc:signal", {
              roomId,
              fromUserId: user.id,
              data,
            });
          });
      }),
    );
  });
}
