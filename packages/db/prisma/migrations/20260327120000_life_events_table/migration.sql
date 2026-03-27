-- CreateEnum
CREATE TYPE "LifeEventCategory" AS ENUM ('EDUCATION', 'CAREER', 'TRAVEL', 'PERSONAL', 'LEGAL', 'OTHER');

-- CreateTable
CREATE TABLE "LifeEvent" (
    "id" SERIAL NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "category" "LifeEventCategory" NOT NULL DEFAULT 'OTHER',
    "tags" TEXT[],
    "externalLink" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "LifeEvent_userId_eventDate_idx" ON "LifeEvent"("userId", "eventDate");
