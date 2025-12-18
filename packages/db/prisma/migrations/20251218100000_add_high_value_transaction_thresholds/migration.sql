-- Add high value transaction threshold fields to NotificationSettings
ALTER TABLE "NotificationSettings" ADD COLUMN "highValueIncomeThreshold" DECIMAL(65,30) NOT NULL DEFAULT 50000;
ALTER TABLE "NotificationSettings" ADD COLUMN "highValueExpenseThreshold" DECIMAL(65,30) NOT NULL DEFAULT 10000;
ALTER TABLE "NotificationSettings" ADD COLUMN "autoBookmarkEnabled" BOOLEAN NOT NULL DEFAULT true;
