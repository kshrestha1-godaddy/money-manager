-- CreateEnum
CREATE TYPE "PasswordShareReason" AS ENUM ('INACTIVITY', 'MANUAL', 'EMERGENCY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_SHARED';

-- CreateTable
CREATE TABLE "UserCheckin" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "UserCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyEmail" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "userId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordShare" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passwordCount" INTEGER NOT NULL,
    "shareReason" "PasswordShareReason" NOT NULL DEFAULT 'INACTIVITY',
    "secretKey" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PasswordShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCheckin_userId_checkinAt_idx" ON "UserCheckin"("userId", "checkinAt");

-- CreateIndex
CREATE INDEX "EmergencyEmail_userId_idx" ON "EmergencyEmail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyEmail_userId_email_key" ON "EmergencyEmail"("userId", "email");

-- CreateIndex
CREATE INDEX "PasswordShare_userId_sentAt_idx" ON "PasswordShare"("userId", "sentAt");

-- AddForeignKey
ALTER TABLE "UserCheckin" ADD CONSTRAINT "UserCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyEmail" ADD CONSTRAINT "EmergencyEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordShare" ADD CONSTRAINT "PasswordShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
