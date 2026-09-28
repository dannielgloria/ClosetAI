CREATE TYPE "OutfitVisualizationStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "outfit_visualizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "outfit_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "OutfitVisualizationStatus" NOT NULL DEFAULT 'PENDING',
  "object_key" TEXT,
  "mime_type" TEXT,
  "provider" TEXT,
  "model" TEXT,
  "prompt_version" TEXT,
  "error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "outfit_visualizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outfit_visualizations_object_key_key" ON "outfit_visualizations"("object_key");
CREATE INDEX "outfit_visualizations_outfit_id_created_at_idx" ON "outfit_visualizations"("outfit_id", "created_at");
CREATE INDEX "outfit_visualizations_user_id_status_idx" ON "outfit_visualizations"("user_id", "status");

ALTER TABLE "outfit_visualizations"
  ADD CONSTRAINT "outfit_visualizations_outfit_id_fkey"
  FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outfit_visualizations"
  ADD CONSTRAINT "outfit_visualizations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
