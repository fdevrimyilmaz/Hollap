import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import { uploadBufferToStorage } from "../../lib/storage";
import { subscriptionsService } from "../subscriptions/subscriptions.service";
import type { QuestionInput, ReplyMetaInput } from "./wall.schemas";

class WallService {
  async createQuestion(teacherUserId: string, input: QuestionInput) {
    await prisma.teacher.findUniqueOrThrow({ where: { userId: teacherUserId } });
    return prisma.wallQuestion.create({
      data: {
        teacherUserId,
        questionText: input.questionText,
      },
    });
  }

  async listQuestionsByTeacher(teacherUserId: string, requesterUserId: string) {
    await subscriptionsService.ensureTeacherSpaceAccess(
      requesterUserId,
      teacherUserId,
    );

    return prisma.wallQuestion.findMany({
      where: {
        teacherUserId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createReply(
    questionId: string,
    studentUserId: string,
    meta: ReplyMetaInput,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpError(400, "Audio file is required");
    }

    const question = await prisma.wallQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new HttpError(404, "Question not found");
    }

    await subscriptionsService.ensureSubscriberOrTeacher(
      studentUserId,
      question.teacherUserId,
    );

    const key = `wall/${question.teacherUserId}/${questionId}/${Date.now()}-${studentUserId}.webm`;
    const audioUrl = await uploadBufferToStorage({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    return prisma.wallVoiceReply.create({
      data: {
        questionId,
        studentUserId,
        audioUrl,
        durationSec: meta.durationSec,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async listReplies(questionId: string, requesterUserId: string) {
    const question = await prisma.wallQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new HttpError(404, "Question not found");
    }

    await subscriptionsService.ensureTeacherSpaceAccess(
      requesterUserId,
      question.teacherUserId,
    );

    return prisma.wallVoiceReply.findMany({
      where: { questionId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteReply(replyId: string, teacherUserId: string) {
    const reply = await prisma.wallVoiceReply.findUnique({
      where: { id: replyId },
      include: { question: true },
    });
    if (!reply) {
      throw new HttpError(404, "Reply not found");
    }
    if (reply.question.teacherUserId !== teacherUserId) {
      throw new HttpError(403, "Only owner teacher can delete this reply");
    }

    await prisma.wallVoiceReply.delete({
      where: { id: replyId },
    });
  }
}

export const wallService = new WallService();
