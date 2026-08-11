ALTER TABLE "playlists"
ADD COLUMN "service_count" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "playlist_songs"
ADD COLUMN "service_number" INTEGER;

UPDATE "playlist_songs"
SET "service_number" = 1;

ALTER TABLE "playlists"
ADD CONSTRAINT "playlists_service_count_check"
CHECK ("service_count" BETWEEN 1 AND 10);

ALTER TABLE "playlist_songs"
ADD CONSTRAINT "playlist_songs_service_number_check"
CHECK ("service_number" IS NULL OR "service_number" BETWEEN 1 AND 10);
