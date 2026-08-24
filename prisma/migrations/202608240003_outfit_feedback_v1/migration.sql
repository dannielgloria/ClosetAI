-- CreateEnum
CREATE TYPE "OutfitFeedbackDecision" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "outfit_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outfit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "decision" "OutfitFeedbackDecision" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outfit_feedback_outfit_id_idx" ON "outfit_feedback"("outfit_id");

-- CreateIndex
CREATE INDEX "outfit_feedback_user_id_created_at_idx" ON "outfit_feedback"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "outfit_feedback" ADD CONSTRAINT "outfit_feedback_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_feedback" ADD CONSTRAINT "outfit_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
