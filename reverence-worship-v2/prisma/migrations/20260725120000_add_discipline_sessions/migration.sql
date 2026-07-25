-- CreateTable
CREATE TABLE "discipline_sessions" (
    "session_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipline_sessions_pkey" PRIMARY KEY ("session_date", "title")
);

-- Backfill existing record groups as editable sessions.
INSERT INTO "discipline_sessions" (
    "session_date",
    "title",
    "is_completed",
    "created_at",
    "updated_at"
)
SELECT
    "created_at"::date,
    "title",
    false,
    MIN("created_at"),
    MAX("updated_at")
FROM "discipline_records"
GROUP BY "created_at"::date, "title"
ON CONFLICT ("session_date", "title") DO NOTHING;

-- CreateIndex
CREATE INDEX "discipline_sessions_session_date_idx" ON "discipline_sessions"("session_date");

-- AddForeignKey
ALTER TABLE "discipline_sessions"
ADD CONSTRAINT "discipline_sessions_completed_by_fkey"
FOREIGN KEY ("completed_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
