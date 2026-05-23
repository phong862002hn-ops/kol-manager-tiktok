-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'MANAGER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "KolStatus" AS ENUM ('PAUSED', 'NEW_CONTACT', 'CONTACTING', 'NEGOTIATING', 'BOOKED');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('PER_VIDEO', 'LUMP_SUM');

-- CreateEnum
CREATE TYPE "CastStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SentChannel" AS ENUM ('TIKTOK', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('GIFT', 'LOAN');

-- CreateEnum
CREATE TYPE "ShipStatus" AS ENUM ('NOT_SENT', 'SHIPPING', 'DELIVERED', 'RETURNED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" INTEGER NOT NULL DEFAULT 0,
    "targetKoc" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignKol" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "tag" TEXT,
    "status" "KolStatus" NOT NULL DEFAULT 'NEW_CONTACT',
    "zalo" TEXT,
    "email" TEXT,
    "facebook" TEXT,
    "ig" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignKol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastCost" (
    "id" TEXT NOT NULL,
    "campaignKolId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "costType" "CostType" NOT NULL,
    "status" "CastStatus" NOT NULL DEFAULT 'PENDING',
    "proposedById" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "CastCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "tiktokId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "note" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentOrder" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3) NOT NULL,
    "kolUsername" TEXT NOT NULL,
    "channel" "SentChannel" NOT NULL,
    "sampleType" "SampleType" NOT NULL,
    "tiktokOrderId" TEXT,
    "products" JSONB NOT NULL,
    "staffId" TEXT,
    "status" "ShipStatus" NOT NULL DEFAULT 'NOT_SENT',
    "trackingCode" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcelImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,

    CONSTRAINT "ExcelImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiktokOrder" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "skuId" TEXT,
    "merchantSku" TEXT,
    "price" INTEGER NOT NULL,
    "paymentAmount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "paymentMethod" TEXT,
    "orderStatus" TEXT NOT NULL,
    "creatorUsername" TEXT NOT NULL,
    "contentType" TEXT,
    "contentId" TEXT,
    "commissionRate" DOUBLE PRECISION,
    "commissionBase" INTEGER,
    "commissionPayment" INTEGER,
    "createdTime" TIMESTAMP(3),
    "paidTime" TIMESTAMP(3),
    "shippedTime" TIMESTAMP(3),
    "completedTime" TIMESTAMP(3),
    "rawData" JSONB NOT NULL,

    CONSTRAINT "TiktokOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoLink" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignKol_campaignId_username_key" ON "CampaignKol"("campaignId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "CastCost_campaignKolId_key" ON "CastCost"("campaignKolId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_campaignId_tiktokId_key" ON "Product"("campaignId", "tiktokId");

-- CreateIndex
CREATE INDEX "TiktokOrder_creatorUsername_idx" ON "TiktokOrder"("creatorUsername");

-- CreateIndex
CREATE INDEX "TiktokOrder_contentId_idx" ON "TiktokOrder"("contentId");

-- CreateIndex
CREATE INDEX "TiktokOrder_orderId_idx" ON "TiktokOrder"("orderId");

-- CreateIndex
CREATE INDEX "TiktokOrder_orderStatus_idx" ON "TiktokOrder"("orderStatus");

-- CreateIndex
CREATE UNIQUE INDEX "VideoLink_contentId_key" ON "VideoLink"("contentId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignKol" ADD CONSTRAINT "CampaignKol_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastCost" ADD CONSTRAINT "CastCost_campaignKolId_fkey" FOREIGN KEY ("campaignKolId") REFERENCES "CampaignKol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastCost" ADD CONSTRAINT "CastCost_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastCost" ADD CONSTRAINT "CastCost_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentOrder" ADD CONSTRAINT "SentOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TiktokOrder" ADD CONSTRAINT "TiktokOrder_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ExcelImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
