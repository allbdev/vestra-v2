-- CreateTable
CREATE TABLE "onboarding" (
    "id" VARCHAR(36) NOT NULL,
    "step" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_user_id_idx" ON "onboarding"("user_id");

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
