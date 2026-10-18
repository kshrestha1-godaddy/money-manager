INSERT INTO "CronJobDefinition" (
    "slug", "name", "description", "category", "scheduleLabel",
    "gateType", "isEnabled", "sortOrder", "updatedAt"
) VALUES (
    'cron_history_cleanup',
    'Cron History Cleanup',
    'Retains seven days of cron history by deleting older batches and their associated job runs and logs.',
    'DATA',
    'Daily',
    'ALWAYS',
    true,
    70,
    CURRENT_TIMESTAMP
);
