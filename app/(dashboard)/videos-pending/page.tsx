import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideosPendingClient } from "./_components/VideosPendingClient";

export const dynamic = "force-dynamic";

export default async function VideosPendingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "MANAGER") redirect("/");

  const videos = await prisma.video.findMany({
    where: { demoStatus: "DEMO_PENDING" },
    include: {
      campaignKol: {
        select: {
          id: true,
          username: true,
          campaign: { select: { id: true, name: true } },
        },
      },
      currentSubmission: {
        include: {
          submittedBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  const rows = videos
    .filter((v) => v.currentSubmission && v.campaignKol)
    .map((v) => ({
      videoId: v.id,
      currentSubmissionId: v.currentSubmission!.id,
      kolUsername: v.campaignKol.username,
      campaignId: v.campaignKol.campaign.id,
      campaignName: v.campaignKol.campaign.name,
      version: v.currentSubmission!.version,
      driveUrl: v.currentSubmission!.driveUrl,
      submittedAt: v.currentSubmission!.submittedAt.toISOString(),
      submittedByName: v.currentSubmission!.submittedBy.name,
    }));

  return <VideosPendingClient rows={rows} />;
}
