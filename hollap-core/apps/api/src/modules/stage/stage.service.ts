import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import { subscriptionsService } from "../subscriptions/subscriptions.service";
import type { CreateRoomInput, NoteInput } from "./stage.schemas";
import { voiceTransportProvider } from "./voice-transport";

class StageService {
  async listTeacherRoomsForViewer(teacherUserId: string, viewerUserId: string) {
    await subscriptionsService.ensureTeacherSpaceAccess(viewerUserId, teacherUserId);

    return prisma.stageRoom.findMany({
      where: {
        teacherUserId,
        state: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async listMyRooms(teacherUserId: string) {
    return prisma.stageRoom.findMany({
      where: { teacherUserId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            participants: true,
            micRequests: true,
          },
        },
      },
    });
  }

  async createRoom(teacherUserId: string, input: CreateRoomInput) {
    return prisma.stageRoom.create({
      data: {
        teacherUserId,
        title: input.title,
        description: input.description,
      },
    });
  }

  async getRoom(roomId: string, requesterUserId: string) {
    const room = await prisma.stageRoom.findUnique({
      where: { id: roomId },
      include: {
        teacher: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    await subscriptionsService.ensureTeacherSpaceAccess(
      requesterUserId,
      room.teacherUserId,
    );

    return room;
  }

  async joinRoom(roomId: string, userId: string) {
    const room = await prisma.stageRoom.findUnique({
      where: { id: roomId },
    });
    if (!room || room.state !== "ACTIVE") {
      throw new HttpError(404, "Active room not found");
    }

    await subscriptionsService.ensureTeacherSpaceAccess(userId, room.teacherUserId);

    const teacher = await prisma.teacher.findUnique({
      where: { userId: room.teacherUserId },
      select: { assistantIds: true },
    });
    const isAssistant = Boolean(teacher?.assistantIds.includes(userId));

    const role =
      userId === room.teacherUserId
        ? "TEACHER"
        : isAssistant
          ? "MODERATOR"
          : "LISTENER";

    await prisma.stageParticipant.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      create: {
        roomId,
        userId,
        role,
      },
      update: {
        role,
        leftAt: null,
      },
    });

    const transport = await voiceTransportProvider.getTransportConfig(roomId);
    return {
      roomId,
      role,
      transport,
    };
  }

  async leaveRoom(roomId: string, userId: string) {
    await prisma.stageParticipant.updateMany({
      where: {
        roomId,
        userId,
      },
      data: {
        leftAt: new Date(),
      },
    });
  }

  async requestMic(roomId: string, userId: string) {
    const room = await prisma.stageRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    await subscriptionsService.ensureTeacherSpaceAccess(userId, room.teacherUserId);

    return prisma.stageMicRequest.create({
      data: {
        roomId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async listPendingMicRequests(roomId: string, teacherUserId: string) {
    await this.assertRoomModerator(roomId, teacherUserId);

    return prisma.stageMicRequest.findMany({
      where: {
        roomId,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async approveMic(roomId: string, teacherUserId: string, userId: string) {
    await this.assertRoomModerator(roomId, teacherUserId);

    await prisma.stageMicRequest.updateMany({
      where: {
        roomId,
        userId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        resolvedAt: new Date(),
      },
    });

    await prisma.stageParticipant.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      create: {
        roomId,
        userId,
        role: "SPEAKER",
      },
      update: {
        role: "SPEAKER",
      },
    });
  }

  async revokeMic(roomId: string, teacherUserId: string, userId: string) {
    await this.assertRoomModerator(roomId, teacherUserId);

    await prisma.stageMicRequest.updateMany({
      where: {
        roomId,
        userId,
        status: "APPROVED",
      },
      data: {
        status: "REVOKED",
        resolvedAt: new Date(),
      },
    });

    await prisma.stageParticipant.updateMany({
      where: {
        roomId,
        userId,
      },
      data: {
        role: "LISTENER",
      },
    });
  }

  async addNote(roomId: string, authorUserId: string, input: NoteInput) {
    const room = await prisma.stageRoom.findUnique({
      where: { id: roomId },
      select: { teacherUserId: true },
    });
    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: room.teacherUserId },
    });

    const canWriteNote =
      authorUserId === room.teacherUserId ||
      Boolean(teacher?.assistantIds.includes(authorUserId));

    if (!canWriteNote) {
      throw new HttpError(403, "Only teacher or assistants can publish notes");
    }

    return prisma.stageNote.create({
      data: {
        roomId,
        authorUserId,
        content: input.content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async listNotes(roomId: string, requesterUserId: string) {
    const room = await prisma.stageRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      throw new HttpError(404, "Room not found");
    }
    await subscriptionsService.ensureTeacherSpaceAccess(
      requesterUserId,
      room.teacherUserId,
    );

    return prisma.stageNote.findMany({
      where: { roomId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async exportNotesAsText(roomId: string, requesterUserId: string) {
    const room = await prisma.stageRoom.findUnique({
      where: { id: roomId },
      include: {
        teacher: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    await subscriptionsService.ensureTeacherSpaceAccess(
      requesterUserId,
      room.teacherUserId,
    );

    const notes = await prisma.stageNote.findMany({
      where: { roomId },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const header = [
      "Hollap Core - Stage Notes Export",
      `Room: ${room.title}`,
      `Teacher: ${room.teacher.name}`,
      `GeneratedAt: ${new Date().toISOString()}`,
      "",
      "Notes",
      "-----",
    ];

    const body = notes.map(
      (note) =>
        `[${note.createdAt.toISOString()}] ${note.author.name}: ${note.content}`,
    );

    return [...header, ...body].join("\n");
  }

  async endRoom(roomId: string, teacherUserId: string) {
    await this.assertTeacherOwner(roomId, teacherUserId);

    return prisma.stageRoom.update({
      where: { id: roomId },
      data: {
        state: "ENDED",
        endedAt: new Date(),
      },
    });
  }

  private async assertTeacherOwner(roomId: string, teacherUserId: string) {
    const room = await prisma.stageRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    if (room.teacherUserId !== teacherUserId) {
      throw new HttpError(403, "Only teacher can manage this room");
    }
  }

  private async assertRoomModerator(roomId: string, requesterUserId: string) {
    const room = await prisma.stageRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    if (room.teacherUserId === requesterUserId) {
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: room.teacherUserId },
      select: { assistantIds: true },
    });

    if (!teacher?.assistantIds.includes(requesterUserId)) {
      throw new HttpError(403, "Only teacher or assistants can manage this room");
    }
  }
}

export const stageService = new StageService();
