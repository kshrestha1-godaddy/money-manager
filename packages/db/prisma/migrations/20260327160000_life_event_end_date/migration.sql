-- Optional end date: when set, event is a date range [eventDate, eventEndDate] inclusive (UTC calendar days).
ALTER TABLE "LifeEvent" ADD COLUMN "eventEndDate" TIMESTAMP(3);
