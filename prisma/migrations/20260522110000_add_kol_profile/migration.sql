-- CreateTable
CREATE TABLE "KolProfile" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "followerCount" INTEGER,
    "malePercent" DOUBLE PRECISION,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "KolProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KolProfile_username_key" ON "KolProfile"("username");
CREATE INDEX "KolProfile_username_idx" ON "KolProfile"("username");
