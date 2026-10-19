CREATE TABLE "membership_commitments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "form_id" INTEGER NOT NULL,
    "submission_id" INTEGER,
    "year" INTEGER NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "form_version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "profile_changes" JSONB NOT NULL DEFAULT '[]',
    "review_status" TEXT NOT NULL DEFAULT 'none',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    CONSTRAINT "membership_commitments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "membership_commitments_year_check" CHECK ("year" BETWEEN 2000 AND 2200),
    CONSTRAINT "membership_commitments_review_status_check" CHECK ("review_status" IN ('none', 'pending', 'approved', 'rejected'))
);
CREATE UNIQUE INDEX "membership_commitments_user_id_year_key" ON "membership_commitments"("user_id", "year");
CREATE UNIQUE INDEX "membership_commitments_submission_id_key" ON "membership_commitments"("submission_id");
CREATE INDEX "membership_commitments_year_review_status_idx" ON "membership_commitments"("year", "review_status");
CREATE INDEX "membership_commitments_form_id_idx" ON "membership_commitments"("form_id");
ALTER TABLE "membership_commitments" ADD CONSTRAINT "membership_commitments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "membership_commitments" ADD CONSTRAINT "membership_commitments_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_commitments" ADD CONSTRAINT "membership_commitments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Review decisions may change; the evidence of what a member accepted may not.
CREATE FUNCTION preserve_membership_commitment_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."year" IS DISTINCT FROM OLD."year"
     OR NEW."id" IS DISTINCT FROM OLD."id"
     OR (NEW."user_id" IS DISTINCT FROM OLD."user_id" AND NEW."user_id" IS NOT NULL)
     OR (NEW."submission_id" IS DISTINCT FROM OLD."submission_id" AND NEW."submission_id" IS NOT NULL)
     OR NEW."form_id" IS DISTINCT FROM OLD."form_id"
     OR NEW."accepted_at" IS DISTINCT FROM OLD."accepted_at"
     OR NEW."form_version" IS DISTINCT FROM OLD."form_version"
     OR NEW."snapshot" IS DISTINCT FROM OLD."snapshot"
     OR NEW."profile_changes" IS DISTINCT FROM OLD."profile_changes" THEN
    RAISE EXCEPTION 'An accepted membership commitment is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "membership_commitment_snapshot_immutable" BEFORE UPDATE ON "membership_commitments"
FOR EACH ROW EXECUTE FUNCTION preserve_membership_commitment_snapshot();
