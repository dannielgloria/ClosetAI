ALTER TABLE "users"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "timezone" TEXT,
  ADD CONSTRAINT "users_location_complete_check"
    CHECK (
      ("city" IS NULL AND "latitude" IS NULL AND "longitude" IS NULL AND "timezone" IS NULL)
      OR
      ("city" IS NOT NULL AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "timezone" IS NOT NULL)
    ),
  ADD CONSTRAINT "users_latitude_range_check" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
  ADD CONSTRAINT "users_longitude_range_check" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));
