-- CreateTable
CREATE TABLE "workspace_notification_prefs" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "workspace_id" VARCHAR(36) NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_notification_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_notification_prefs_workspace_id_idx" ON "workspace_notification_prefs"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_notification_prefs_user_id_workspace_id_key" ON "workspace_notification_prefs"("user_id", "workspace_id");

-- AddForeignKey
ALTER TABLE "workspace_notification_prefs" ADD CONSTRAINT "workspace_notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_notification_prefs" ADD CONSTRAINT "workspace_notification_prefs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
