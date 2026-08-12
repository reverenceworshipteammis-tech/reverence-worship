ALTER TABLE "songs"
ADD COLUMN "imported_filename" TEXT;

CREATE UNIQUE INDEX "songs_imported_filename_key"
ON "songs"("imported_filename");
