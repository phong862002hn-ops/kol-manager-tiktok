import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { notify, getManagerIds } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

const driveUrlRe = /drive\.google\.com|docs\.google\.com/;

const submitSchema = z.object({
  driveUrl: z
    .string()
    .url("Link Drive không hợp lệ")
    .refine((u) => driveUrlRe.test(u), "Phải là link Google Drive"),
});

// POST: Booking Staff submit 1 version demo cho CampaignKol slot.
// 1 KOL trong campaign = 1 Video. Lazy-create Video row trên submission đầu tiên.
export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const { driveUrl } = submitSchema.parse(await req.json());
    const campaignKolId = ctx.params.id;

    const campaignKol = await prisma.campaignKol.findUnique({
      where: { id: campaignKolId },
      select: {
        id: true,
        deletedAt: true,
        status: true,
        username: true,
        video: { select: { id: true, demoStatus: true } },
      },
    });
    if (!campaignKol || campaignKol.deletedAt) {
      throw new NotFoundError("Không tìm thấy KOL trong chiến dịch");
    }
    if (campaignKol.status !== "BOOKED") {
      throw new ValidationError("KOL phải ở trạng thái 'Chốt booking' mới được submit demo");
    }

    const currentStatus = campaignKol.video?.demoStatus ?? "NOT_SUBMITTED";
    if (currentStatus === "DEMO_PENDING") {
      throw new ConflictError("Đang chờ duyệt, không thể submit thêm");
    }
    if (currentStatus === "APPROVED") {
      throw new ConflictError("Video đã được duyệt");
    }
    if (currentStatus === "PUBLISHED") {
      throw new ConflictError("Video đã đăng TikTok");
    }

    const result = await prisma.$transaction(async (tx) => {
      const video = await tx.video.upsert({
        where: { campaignKolId },
        create: { campaignKolId, demoStatus: "DEMO_PENDING" },
        update: { demoStatus: "DEMO_PENDING" },
      });

      const maxVersion = await tx.videoSubmission.aggregate({
        where: { videoId: video.id },
        _max: { version: true },
      });
      const nextVersion = (maxVersion._max.version ?? 0) + 1;

      const submission = await tx.videoSubmission.create({
        data: {
          videoId: video.id,
          version: nextVersion,
          driveUrl,
          status: "DEMO_PENDING",
          submittedById: session.user.id,
        },
      });

      const updatedVideo = await tx.video.update({
        where: { id: video.id },
        data: { currentSubmissionId: submission.id },
      });

      return { video: updatedVideo, submission };
    });

    // Slice 5: audit
    await logAudit({
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name!,
      },
      action: "CREATE",
      entity: "VideoSubmission",
      entityId: result.submission.id,
      entityName: `@${campaignKol.username} v${result.submission.version}`,
      after: {
        videoId: result.submission.videoId,
        version: result.submission.version,
        driveUrl: result.submission.driveUrl,
        status: result.submission.status,
      },
    });

    // Slice 4: notify managers — best-effort, không block response.
    const managerIds = await getManagerIds();
    await notify(
      managerIds
        .filter((id) => id !== session.user.id)
        .map((id) => ({
          recipientId: id,
          type: "VIDEO_DEMO_PENDING" as const,
          title: `Demo v${result.submission.version} của @${campaignKol.username} chờ duyệt`,
          body: `${session.user.name} vừa submit demo`,
          link: "/videos-pending",
        }))
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
