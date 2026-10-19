DROP INDEX "membership_commitments_user_id_year_key";
CREATE INDEX "membership_commitments_user_id_year_idx" ON "membership_commitments"("user_id", "year");
