import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

// GET: list TẤT CẢ submissions của 1 Video (history). Order desc theo version.
// Eager load comments + submittedBy + reviewedBy.
export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    await requireSession();
    const videoId = ctx.params.id;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, currentSubmissionId: true },
    });
    if (!video) throw new NotFoundError("Không tìm thấy video");

    const submissions = await prisma.videoSubmission.findMany({
      where: { videoId },
      include: {
        submittedBy: { select: { id: true, name: true, role: true } },
        reviewedBy: { select: { id: true, name: true, role: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { version: "desc" },
    });

    return NextResponse.json({
      currentSubmissionId: video.currentSubmissionId,
      submissions,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
