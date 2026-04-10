-- Create table for per-user app lock password settings
CREATE TABLE "UserAppLockSetting" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "passwordHash" TEXT,
    "usesDefaultPassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAppLockSetting_pkey" PRIMARY KEY ("id")
);

-- Ensure one app-lock setting per user
CREATE UNIQUE INDEX "UserAppLockSetting_userId_key" ON "UserAppLockSetting"("userId");

-- Cascade delete to keep settings in sync with users
ALTER TABLE "UserAppLockSetting"
ADD CONSTRAINT "UserAppLockSetting_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
