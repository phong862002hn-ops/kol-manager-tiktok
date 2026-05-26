-- CreateEnum
CREATE TYPE "VideoDemoStatus" AS ENUM ('NOT_SUBMITTED', 'DEMO_PENDING', 'APPROVED', 'NEEDS_REVISION', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DEMO_PENDING', 'APPROVED', 'NEEDS_REVISION');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "campaignKolId" TEXT NOT NULL,
    "demoStatus" "VideoDemoStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "currentSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSubmission" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "driveUrl" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DEMO_PENDING',
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "VideoSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_campaignKolId_key" ON "Video"("campaignKolId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_currentSubmissionId_key" ON "Video"("currentSubmissionId");

-- CreateIndex
CREATE INDEX "Video_demoStatus_idx" ON "Video"("demoStatus");

-- CreateIndex
CREATE INDEX "VideoSubmission_videoId_version_idx" ON "VideoSubmission"("videoId", "version");

-- CreateIndex
CREATE INDEX "VideoSubmission_status_idx" ON "VideoSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSubmission_videoId_version_key" ON "VideoSubmission"("videoId", "version");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_campaignKolId_fkey" FOREIGN KEY ("campaignKolId") REFERENCES "CampaignKol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_currentSubmissionId_fkey" FOREIGN KEY ("currentSubmissionId") REFERENCES "VideoSubmission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VideoSubmission" ADD CONSTRAINT "VideoSubmission_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSubmission" ADD CONSTRAINT "VideoSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSubmission" ADD CONSTRAINT "VideoSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
