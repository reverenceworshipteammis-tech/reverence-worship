CREATE TABLE "playlist_sessions" (
  "id" SERIAL NOT NULL,
  "playlist_id" INTEGER NOT NULL,
  "service_number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playlist_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "playlist_sessions_playlist_id_service_number_display_order_key"
ON "playlist_sessions"("playlist_id", "service_number", "display_order");

CREATE INDEX "playlist_sessions_playlist_id_service_number_idx"
ON "playlist_sessions"("playlist_id", "service_number");

ALTER TABLE "playlist_sessions"
ADD CONSTRAINT "playlist_sessions_playlist_id_fkey"
FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "playlist_sessions" ("playlist_id", "service_number", "name", "display_order")
SELECT playlist."id", service_number, 'General', 1
FROM "playlists" playlist
CROSS JOIN LATERAL generate_series(1, playlist."service_count") AS service_number;

ALTER TABLE "playlist_songs"
ADD COLUMN "session_id" INTEGER;

DROP INDEX "playlist_songs_playlist_id_song_id_key";

INSERT INTO "playlist_songs" (
  "playlist_id",
  "session_id",
  "song_id",
  "display_order",
  "service_number",
  "created_at"
)
SELECT
  assignment."playlist_id",
  session."id",
  assignment."song_id",
  assignment."display_order",
  session."service_number",
  assignment."created_at"
FROM "playlist_songs" assignment
JOIN "playlists" playlist ON playlist."id" = assignment."playlist_id"
JOIN "playlist_sessions" session
  ON session."playlist_id" = assignment."playlist_id"
 AND session."service_number" BETWEEN 2 AND playlist."service_count"
WHERE assignment."service_number" IS NULL;

UPDATE "playlist_songs" assignment
SET "session_id" = session."id"
FROM "playlists" playlist, "playlist_sessions" session
WHERE playlist."id" = assignment."playlist_id"
  AND session."playlist_id" = assignment."playlist_id"
  AND session."service_number" = CASE
    WHEN assignment."service_number" BETWEEN 1 AND playlist."service_count"
      THEN assignment."service_number"
    ELSE 1
  END;

ALTER TABLE "playlist_songs"
ALTER COLUMN "session_id" SET NOT NULL;

ALTER TABLE "playlist_songs"
DROP CONSTRAINT "playlist_songs_service_number_check";

ALTER TABLE "playlist_songs"
DROP COLUMN "service_number";

CREATE UNIQUE INDEX "playlist_songs_session_id_song_id_key"
ON "playlist_songs"("session_id", "song_id");

CREATE INDEX "playlist_songs_session_id_idx"
ON "playlist_songs"("session_id");

ALTER TABLE "playlist_songs"
ADD CONSTRAINT "playlist_songs_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "playlist_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "playlist_songs"
DROP CONSTRAINT "playlist_songs_playlist_id_fkey";

ALTER TABLE "playlist_songs"
DROP COLUMN "playlist_id";
