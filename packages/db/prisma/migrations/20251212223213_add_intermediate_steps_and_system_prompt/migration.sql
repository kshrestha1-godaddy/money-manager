-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "intermediateSteps" JSONB,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "systemPrompt" JSONB;
