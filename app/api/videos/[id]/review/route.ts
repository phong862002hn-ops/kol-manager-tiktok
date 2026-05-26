import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { notify } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

// Slice 1: APPROVE. Slice 2: REQUEST_REVISION (kèm comment optional).
const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPROVE") }),
  z.object({
    action: z.literal("REQUEST_REVISION"),
    comment: z.string().trim().min(1).max(2000).optional(),
  }),
]);

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const session = await requireManager();
    const data = reviewSchema.parse(await req.json());

    const video = await prisma.video.findUnique({
      where: { id: ctx.params.id },
      select: {
        id: true,
        demoStatus: true,
        currentSubmissionId: true,
        campaignKol: { select: { username: true, campaignId: true } },
      },
    });
    if (!video) throw new NotFoundError("Không tìm thấy video");
    if (video.demoStatus !== "DEMO_PENDING") {
      throw new ValidationError("Video không ở trạng thái chờ duyệt");
    }
    if (!video.currentSubmissionId) {
      throw new NotFoundError("Không tìm thấy bản submit hiện tại");
    }

    const result = await prisma.$transaction(async (tx) => {
      if (data.action === "APPROVE") {
        const submission = await tx.videoSubmission.update({
          where: { id: video.currentSubmissionId! },
          data: {
            status: "APPROVED",
            reviewedById: session.user.id,
            reviewedAt: new Date(),
          },
        });
        const updatedVideo = await tx.video.update({
          where: { id: video.id },
          data: { demoStatus: "APPROVED" },
        });
        return { video: updatedVideo, submission, comment: null };
      }

      // REQUEST_REVISION
      const submission = await tx.videoSubmission.update({
        where: { id: video.currentSubmissionId! },
        data: {
          status: "NEEDS_REVISION",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
      const updatedVideo = await tx.video.update({
        where: { id: video.id },
        data: { demoStatus: "NEEDS_REVISION" },
      });
      const comment = data.comment
        ? await tx.submissionComment.create({
            data: {
              submissionId: video.currentSubmissionId!,
              authorId: session.user.id,
              body: data.comment,
            },
          })
        : null;
      return { video: updatedVideo, submission, comment };
    });

    // Slice 5: audit
    const username = video.campaignKol?.username ?? "?";
    await logAudit({
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name!,
      },
      action: "UPDATE",
      entity: "Video",
      entityId: video.id,
      entityName: `@${username} v${result.submission.version}`,
      before: { demoStatus: "DEMO_PENDING" },
      after: {
        demoStatus: data.action === "APPROVE" ? "APPROVED" : "NEEDS_REVISION",
        reviewAction: data.action,
        comment: data.action === "REQUEST_REVISION" ? data.comment ?? null : null,
      },
    });

    // Slice 4: notify người submit về kết quả review.
    const submitterId = result.submission.submittedById;
    if (submitterId && submitterId !== session.user.id) {
      const link = video.campaignKol
        ? `/campaigns/${video.campaignKol.campaignId}/videos`
        : undefined;
      if (data.action === "APPROVE") {
        await notify({
          recipientId: submitterId,
          type: "VIDEO_DEMO_APPROVED",
          title: `Demo @${username} đã được duyệt`,
          body: `${session.user.name} duyệt v${result.submission.version}`,
          link,
        });
      } else {
        await notify({
          recipientId: submitterId,
          type: "VIDEO_DEMO_REVISION",
          title: `Demo @${username} cần sửa`,
          body:
            data.comment ??
            `${session.user.name} yêu cầu sửa v${result.submission.version}`,
          link,
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
