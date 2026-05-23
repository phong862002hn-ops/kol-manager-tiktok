import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";

// Mark 1 notification as read
export async function POST(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const n = await prisma.notification.findUnique({ where: { id: ctx.params.id } });
    if (!n || n.recipientId !== session.user.id) {
      return apiError("Không tìm thấy", 404);
    }
    await prisma.notification.update({
      where: { id: ctx.params.id },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
