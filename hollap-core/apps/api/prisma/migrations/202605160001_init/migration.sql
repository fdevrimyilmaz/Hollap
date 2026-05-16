-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEACHER', 'STUDENT', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RoomState" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('TEACHER', 'MODERATOR', 'SPEAKER', 'LISTENER');

-- CreateEnum
CREATE TYPE "MicRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
  "avatarUrl" TEXT,
  "stripeCustomerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
  "userId" TEXT NOT NULL,
  "bio" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priceMonthly" INTEGER NOT NULL,
  "assistantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Teacher_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "stripeSessionId" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageRoom" (
  "id" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "state" "RoomState" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "StageRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageParticipant" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "RoomRole" NOT NULL DEFAULT 'LISTENER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  CONSTRAINT "StageParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageMicRequest" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "MicRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "StageMicRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageNote" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StageNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallQuestion" (
  "id" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WallQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallVoiceReply" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "audioUrl" TEXT NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WallVoiceReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_studentUserId_teacherUserId_key" ON "Subscription"("studentUserId", "teacherUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StageParticipant_roomId_userId_key" ON "StageParticipant"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageRoom" ADD CONSTRAINT "StageRoom_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageParticipant" ADD CONSTRAINT "StageParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StageRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StageParticipant" ADD CONSTRAINT "StageParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageMicRequest" ADD CONSTRAINT "StageMicRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StageRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StageMicRequest" ADD CONSTRAINT "StageMicRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageNote" ADD CONSTRAINT "StageNote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StageRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StageNote" ADD CONSTRAINT "StageNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallQuestion" ADD CONSTRAINT "WallQuestion_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallVoiceReply" ADD CONSTRAINT "WallVoiceReply_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WallQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WallVoiceReply" ADD CONSTRAINT "WallVoiceReply_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
