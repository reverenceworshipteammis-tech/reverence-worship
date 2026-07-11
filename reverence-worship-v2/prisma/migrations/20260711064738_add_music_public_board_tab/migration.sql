-- CreateTable
CREATE TABLE "public_board" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'update',
    "event_date" TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_youtube_videos" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "youtube_id" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_youtube_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_featured_images" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "is_hero" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_featured_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_board_created_by_idx" ON "public_board"("created_by");

-- CreateIndex
CREATE INDEX "public_board_is_published_idx" ON "public_board"("is_published");

-- CreateIndex
CREATE INDEX "public_board_is_pinned_created_at_idx" ON "public_board"("is_pinned", "created_at");

-- CreateIndex
CREATE INDEX "landing_youtube_videos_created_by_idx" ON "landing_youtube_videos"("created_by");

-- CreateIndex
CREATE INDEX "landing_youtube_videos_sort_order_idx" ON "landing_youtube_videos"("sort_order");

-- CreateIndex
CREATE INDEX "landing_featured_images_created_by_idx" ON "landing_featured_images"("created_by");

-- CreateIndex
CREATE INDEX "landing_featured_images_sort_order_idx" ON "landing_featured_images"("sort_order");

-- AddForeignKey
ALTER TABLE "public_board" ADD CONSTRAINT "public_board_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_youtube_videos" ADD CONSTRAINT "landing_youtube_videos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_featured_images" ADD CONSTRAINT "landing_featured_images_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
