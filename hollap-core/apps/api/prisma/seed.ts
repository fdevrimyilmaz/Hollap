import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/hollap_core";
}

const prisma = new PrismaClient();

async function upsertUser(params: {
  email: string;
  name: string;
  role: "TEACHER" | "STUDENT" | "ASSISTANT";
  avatarUrl?: string;
}) {
  const passwordHash = await bcrypt.hash("Hollap123!", 10);
  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      role: params.role,
      avatarUrl: params.avatarUrl,
      passwordHash,
    },
    create: {
      email: params.email,
      name: params.name,
      role: params.role,
      avatarUrl: params.avatarUrl,
      passwordHash,
    },
  });
}

async function main() {
  const teacher = await upsertUser({
    email: "teacher@hollap.com",
    name: "Aylin Karahan",
    role: "TEACHER",
    avatarUrl: "https://i.pravatar.cc/160?img=5",
  });

  const assistant = await upsertUser({
    email: "assistant@hollap.com",
    name: "Mert Yardimci",
    role: "ASSISTANT",
    avatarUrl: "https://i.pravatar.cc/160?img=12",
  });

  const student = await upsertUser({
    email: "student@hollap.com",
    name: "Selin Ogrenci",
    role: "STUDENT",
    avatarUrl: "https://i.pravatar.cc/160?img=25",
  });

  await prisma.teacher.upsert({
    where: { userId: teacher.id },
    update: {
      bio: "10+ yildir borsa, teknik analiz ve risk yonetimi uzerine egitim veriyorum. Hollap Core ile her hafta canli piyasa odasi aciyorum.",
      category: "Borsa & Finans",
      priceMonthly: 799,
      assistantIds: [assistant.id],
    },
    create: {
      userId: teacher.id,
      bio: "10+ yildir borsa, teknik analiz ve risk yonetimi uzerine egitim veriyorum. Hollap Core ile her hafta canli piyasa odasi aciyorum.",
      category: "Borsa & Finans",
      priceMonthly: 799,
      assistantIds: [assistant.id],
    },
  });

  await prisma.subscription.upsert({
    where: {
      studentUserId_teacherUserId: {
        studentUserId: student.id,
        teacherUserId: teacher.id,
      },
    },
    update: {
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      studentUserId: student.id,
      teacherUserId: teacher.id,
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  let room = await prisma.stageRoom.findFirst({
    where: {
      teacherUserId: teacher.id,
      title: "Haftalik Piyasa Acik Mikrofonu",
      state: "ACTIVE",
    },
  });

  if (!room) {
    room = await prisma.stageRoom.create({
      data: {
        teacherUserId: teacher.id,
        title: "Haftalik Piyasa Acik Mikrofonu",
        description: "BIST, ABD endeksleri ve haftalik portfoy stratejileri.",
      },
    });
  }

  await prisma.stageParticipant.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: teacher.id,
      },
    },
    update: {
      role: "TEACHER",
      leftAt: null,
    },
    create: {
      roomId: room.id,
      userId: teacher.id,
      role: "TEACHER",
    },
  });

  await prisma.stageParticipant.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: assistant.id,
      },
    },
    update: {
      role: "MODERATOR",
      leftAt: null,
    },
    create: {
      roomId: room.id,
      userId: assistant.id,
      role: "MODERATOR",
    },
  });

  await prisma.stageParticipant.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: student.id,
      },
    },
    update: {
      role: "LISTENER",
      leftAt: null,
    },
    create: {
      roomId: room.id,
      userId: student.id,
      role: "LISTENER",
    },
  });

  const demoNote = "Bu hafta odak: destek/direnc kirilimlarinda risk yonetimi.";
  const noteExists = await prisma.stageNote.findFirst({
    where: {
      roomId: room.id,
      content: demoNote,
    },
  });

  if (!noteExists) {
    await prisma.stageNote.create({
      data: {
        roomId: room.id,
        authorUserId: teacher.id,
        content: demoNote,
      },
    });
  }

  const pendingRequest = await prisma.stageMicRequest.findFirst({
    where: {
      roomId: room.id,
      userId: student.id,
      status: "PENDING",
    },
  });

  if (!pendingRequest) {
    await prisma.stageMicRequest.create({
      data: {
        roomId: room.id,
        userId: student.id,
        status: "PENDING",
      },
    });
  }

  const questionText = "Bu hafta en buyuk aydinlanma aniniz neydi?";
  let question = await prisma.wallQuestion.findFirst({
    where: {
      teacherUserId: teacher.id,
      questionText,
      isActive: true,
    },
  });

  if (!question) {
    question = await prisma.wallQuestion.create({
      data: {
        teacherUserId: teacher.id,
        questionText,
      },
    });
  }

  await prisma.wallVoiceReply.deleteMany({
    where: {
      questionId: question.id,
      studentUserId: student.id,
    },
  });

  await prisma.wallVoiceReply.create({
    data: {
      questionId: question.id,
      studentUserId: student.id,
      audioUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav",
      durationSec: 32,
    },
  });

  console.log("Hollap Core seed completed.");
  console.log("Demo credentials:");
  console.log("- teacher@hollap.com / Hollap123!");
  console.log("- assistant@hollap.com / Hollap123!");
  console.log("- student@hollap.com / Hollap123!");
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Can't reach database server")) {
      console.error(
        "Seed failed: database is not reachable. Start PostgreSQL first (npm run infra:up).",
      );
    }
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
