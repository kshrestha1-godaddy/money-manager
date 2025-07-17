-- CreateTable
CREATE TABLE "DismissedNotification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DismissedNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DismissedNotification_userId_notificationType_idx" ON "DismissedNotification"("userId", "notificationType");

-- CreateIndex
CREATE UNIQUE INDEX "DismissedNotification_userId_notificationType_entityId_key" ON "DismissedNotification"("userId", "notificationType", "entityId");

-- AddForeignKey
ALTER TABLE "DismissedNotification" ADD CONSTRAINT "DismissedNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
