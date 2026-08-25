ALTER TABLE "garment_images"
  ADD COLUMN "thumbnail_object_key" TEXT;

CREATE UNIQUE INDEX "garment_images_thumbnail_object_key_key"
  ON "garment_images"("thumbnail_object_key");

CREATE INDEX "garment_images_garment_id_created_at_idx"
  ON "garment_images"("garment_id", "created_at");
