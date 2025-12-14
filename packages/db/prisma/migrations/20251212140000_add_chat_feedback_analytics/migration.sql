-- CreateEnum
CREATE TYPE "ChatFeedback" AS ENUM ('LIKE', 'DISLIKE');

-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN     "comments" TEXT,
ADD COLUMN     "feedback" "ChatFeedback",
ADD COLUMN     "responseTimeSeconds" DOUBLE PRECISION,
ADD COLUMN     "tokenCount" INTEGER;

-- CreateIndex
CREATE INDEX "ChatConversation_feedback_idx" ON "ChatConversation"("feedback");
