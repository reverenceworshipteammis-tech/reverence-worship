ALTER TABLE "users"
  ADD COLUMN "highest_education_level" TEXT,
  ADD COLUMN "other_education_level" TEXT,
  ADD COLUMN "education_field_of_study" TEXT,
  ADD COLUMN "education_institution" TEXT,
  ADD COLUMN "education_completion_year" INTEGER;

CREATE TABLE "education_qualifications" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "field_of_study" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "completion_year" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_qualifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "education_qualifications_user_id_idx" ON "education_qualifications"("user_id");

ALTER TABLE "education_qualifications"
  ADD CONSTRAINT "education_qualifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
