import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { NotFoundError, ValidationError } from "@/lib/errors";

// Slice 1: chỉ APPROVE. Slice 2 sẽ thêm REQUEST_REVISION.
const reviewSchema = z.object({
  action: z.literal("APPROVE"),
});

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const session = await requireManager();
    reviewSchema.parse(await req.json());

    const video = await prisma.video.findUnique({
      where: { id: ctx.params.id },
      select: { id: true, demoStatus: true, currentSubmissionId: true },
    });
    if (!video) throw new NotFoundError("Không tìm thấy video");
    if (video.demoStatus !== "DEMO_PENDING") {
      throw new ValidationError("Video không ở trạng thái chờ duyệt");
    }
    if (!video.currentSubmissionId) {
      throw new NotFoundError("Không tìm thấy bản submit hiện tại");
    }

    const result = await prisma.$transaction(async (tx) => {
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
      return { video: updatedVideo, submission };
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
