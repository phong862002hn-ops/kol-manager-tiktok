-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94a3b8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateTable
CREATE TABLE "KolTag" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KolTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KolTag_username_tagId_key" ON "KolTag"("username", "tagId");
CREATE INDEX "KolTag_username_idx" ON "KolTag"("username");
CREATE INDEX "KolTag_tagId_idx" ON "KolTag"("tagId");

ALTER TABLE "KolTag" ADD CONSTRAINT "KolTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "KolComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "campaignKolId" TEXT,
    "kolUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "KolComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KolComment_campaignKolId_createdAt_idx" ON "KolComment"("campaignKolId", "createdAt");
CREATE INDEX "KolComment_kolUsername_createdAt_idx" ON "KolComment"("kolUsername", "createdAt");
CREATE INDEX "KolComment_userId_idx" ON "KolComment"("userId");

ALTER TABLE "KolComment" ADD CONSTRAINT "KolComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "KolComment" ADD CONSTRAINT "KolComment_campaignKolId_fkey" FOREIGN KEY ("campaignKolId") REFERENCES "CampaignKol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
