ALTER TABLE "songs"
ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE INDEX "songs_is_archived_title_idx"
ON "songs"("is_archived", "title");
