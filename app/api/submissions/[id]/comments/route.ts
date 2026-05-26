import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

// GET: list comments của 1 submission (cả old version đều xem được — read-only).
export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    await requireSession();
    const submissionId = ctx.params.id;

    const exists = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("Không tìm thấy submission");

    const comments = await prisma.submissionComment.findMany({
      where: { submissionId },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

// POST: chỉ comment trên CURRENT submission được. Version cũ read-only.
export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const { body } = createSchema.parse(await req.json());
    const submissionId = ctx.params.id;

    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, currentOf: { select: { id: true } } },
    });
    if (!submission) throw new NotFoundError("Không tìm thấy submission");
    if (!submission.currentOf) {
      throw new ValidationError(
        "Không thể bình luận trên version cũ — version đã bị thay thế"
      );
    }

    const created = await prisma.submissionComment.create({
      data: {
        submissionId,
        authorId: session.user.id,
        body,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
