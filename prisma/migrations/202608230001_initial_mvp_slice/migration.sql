CREATE TYPE "GarmentCategory" AS ENUM (
  'TOP',
  'BOTTOM',
  'OUTERWEAR',
  'FOOTWEAR',
  'UNDERWEAR',
  'ACCESSORY',
  'SPORTSWEAR',
  'FORMALWEAR',
  'SLEEPWEAR'
);

CREATE TYPE "GarmentStatus" AS ENUM (
  'CLEAN_AVAILABLE',
  'WORN_REUSABLE',
  'LAUNDRY_BIN',
  'WASHING',
  'DRYING',
  'CLEAN_PENDING_STORAGE',
  'UNAVAILABLE',
  'REPAIR',
  'RETIRED',
  'DONATED',
  'DISCARDED'
);

CREATE TYPE "OutfitStatus" AS ENUM (
  'GENERATED',
  'PRESENTED',
  'SELECTED',
  'WORN',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "households" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "household_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "garments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "category" "GarmentCategory" NOT NULL,
  "primary_color" TEXT NOT NULL,
  "status" "GarmentStatus" NOT NULL DEFAULT 'CLEAN_AVAILABLE',
  "name" TEXT,
  "wear_count" INTEGER NOT NULL DEFAULT 0,
  "last_worn_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "garments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outfits" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "status" "OutfitStatus" NOT NULL DEFAULT 'GENERATED',
  "explanation" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "selected_at" TIMESTAMP(3),
  "worn_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outfit_items" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "outfit_id" TEXT NOT NULL,
  "garment_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "garment_usage_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "garment_id" TEXT NOT NULL,
  "outfit_id" TEXT NOT NULL,
  "worn_at" TIMESTAMP(3) NOT NULL,
  "context" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "garment_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "users_household_id_idx" ON "users"("household_id");
CREATE INDEX "garments_user_id_status_idx" ON "garments"("user_id", "status");
CREATE INDEX "outfits_user_id_status_idx" ON "outfits"("user_id", "status");
CREATE UNIQUE INDEX "outfit_items_outfit_id_garment_id_key" ON "outfit_items"("outfit_id", "garment_id");
CREATE INDEX "outfit_items_garment_id_idx" ON "outfit_items"("garment_id");
CREATE UNIQUE INDEX "garment_usage_events_outfit_id_garment_id_key" ON "garment_usage_events"("outfit_id", "garment_id");
CREATE INDEX "garment_usage_events_user_id_worn_at_idx" ON "garment_usage_events"("user_id", "worn_at");

ALTER TABLE "users" ADD CONSTRAINT "users_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garments" ADD CONSTRAINT "garments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "garments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garment_usage_events" ADD CONSTRAINT "garment_usage_events_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "garments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garment_usage_events" ADD CONSTRAINT "garment_usage_events_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
