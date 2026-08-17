ALTER TABLE "forms"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "form_submissions"
ADD COLUMN "question_snapshot" JSONB,
ADD COLUMN "form_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "started_at" TIMESTAMP(3),
ADD COLUMN "completion_seconds" INTEGER,
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by" INTEGER,
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" INTEGER,
ADD COLUMN "edit_token_hash" TEXT,
ADD COLUMN "edit_until" TIMESTAMP(3),
ADD COLUMN "receipt_sent_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "form_submissions_edit_token_hash_key" ON "form_submissions"("edit_token_hash");
CREATE INDEX "form_submissions_form_id_deleted_at_idx" ON "form_submissions"("form_id", "deleted_at");
CREATE INDEX "form_submissions_form_id_submitted_at_idx" ON "form_submissions"("form_id", "submitted_at");

CREATE TABLE "form_summary_shares" (
  "id" SERIAL NOT NULL,
  "form_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "created_by" INTEGER,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "hide_identity" BOOLEAN NOT NULL DEFAULT true,
  "question_ids" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "form_summary_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_summary_shares_token_hash_key" ON "form_summary_shares"("token_hash");
CREATE INDEX "form_summary_shares_form_id_revoked_at_idx" ON "form_summary_shares"("form_id", "revoked_at");
CREATE INDEX "form_summary_shares_expires_at_idx" ON "form_summary_shares"("expires_at");

ALTER TABLE "form_summary_shares"
ADD CONSTRAINT "form_summary_shares_form_id_fkey"
FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "form_submissions" AS submission
SET "question_snapshot" = form."questions",
    "form_version" = form."version"
FROM "forms" AS form
WHERE submission."form_id" = form."id" AND submission."question_snapshot" IS NULL;
