CREATE TYPE "GarmentStateTransitionType" AS ENUM (
  'MARK_WORN_REUSABLE',
  'SEND_TO_LAUNDRY',
  'START_WASHING',
  'START_DRYING',
  'MARK_CLEAN_PENDING_STORAGE',
  'MARK_CLEAN_AVAILABLE',
  'MARK_UNAVAILABLE',
  'SEND_TO_REPAIR',
  'RETURN_FROM_REPAIR',
  'RETIRE',
  'RESTORE',
  'DONATE',
  'DISCARD'
);

CREATE TABLE "garment_state_transitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "garment_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "from_status" "GarmentStatus" NOT NULL,
  "to_status" "GarmentStatus" NOT NULL,
  "transition" "GarmentStateTransitionType" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "garment_state_transitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "garment_state_transitions_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "garment_state_transitions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "garment_state_transitions_garment_id_created_at_idx" ON "garment_state_transitions"("garment_id", "created_at");
CREATE INDEX "garment_state_transitions_user_id_created_at_idx" ON "garment_state_transitions"("user_id", "created_at");
