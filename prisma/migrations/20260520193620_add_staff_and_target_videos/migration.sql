-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "targetVideos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CampaignKol" ADD COLUMN     "staffId" TEXT;

-- CreateIndex
CREATE INDEX "CampaignKol_staffId_idx" ON "CampaignKol"("staffId");

-- AddForeignKey
ALTER TABLE "CampaignKol" ADD CONSTRAINT "CampaignKol_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
