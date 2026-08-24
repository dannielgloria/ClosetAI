CREATE TYPE "GarmentSubcategory" AS ENUM ('T_SHIRT', 'SHIRT', 'SWEATER', 'HOODIE', 'JACKET', 'JEANS', 'TROUSERS', 'SHORTS', 'SKIRT', 'DRESS', 'SNEAKERS', 'BOOTS', 'DRESS_SHOES', 'SANDALS', 'ACCESSORY', 'UNKNOWN');
CREATE TYPE "GarmentPattern" AS ENUM ('SOLID', 'STRIPED', 'CHECKED', 'PRINTED', 'TEXTURED', 'UNKNOWN');
CREATE TYPE "GarmentFit" AS ENUM ('SLIM', 'REGULAR', 'RELAXED', 'OVERSIZED', 'UNKNOWN');
CREATE TYPE "GarmentMaterial" AS ENUM ('COTTON', 'DENIM', 'WOOL', 'LINEN', 'LEATHER', 'SYNTHETIC', 'KNIT', 'UNKNOWN');

ALTER TABLE "garments" ADD COLUMN "subcategory" "GarmentSubcategory";
ALTER TABLE "garments" ADD COLUMN "secondary_colors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "garments" ADD COLUMN "pattern" "GarmentPattern";
ALTER TABLE "garments" ADD COLUMN "fit" "GarmentFit";
ALTER TABLE "garments" ADD COLUMN "estimated_material" "GarmentMaterial";
ALTER TABLE "garments" ADD COLUMN "formality" INTEGER;

CREATE TABLE "garment_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "garment_id" UUID,
  "object_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "garment_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "garment_images_object_key_key" ON "garment_images"("object_key");
CREATE INDEX "garment_images_user_id_created_at_idx" ON "garment_images"("user_id", "created_at");
CREATE INDEX "garment_images_garment_id_idx" ON "garment_images"("garment_id");

ALTER TABLE "garment_images" ADD CONSTRAINT "garment_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garment_images" ADD CONSTRAINT "garment_images_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "garments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
