ALTER TABLE "playlist_songs"
ADD COLUMN "key_signature" TEXT,
ADD COLUMN "assigned_singer" TEXT;

UPDATE "playlist_songs" AS "playlist_song"
SET
  "key_signature" = "song"."key_signature",
  "assigned_singer" = "song"."assigned_singer"
FROM "songs" AS "song"
WHERE "playlist_song"."song_id" = "song"."id";

ALTER TABLE "songs"
DROP COLUMN "key_signature",
DROP COLUMN "assigned_singer";
