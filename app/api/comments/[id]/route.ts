import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";

// Xoá comment: chỉ author hoặc Manager
export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const c = await prisma.kolComment.findUnique({ where: { id: ctx.params.id } });
    if (!c || c.deletedAt) return apiError("Không tìm thấy comment", 404);
    if (c.userId !== session.user.id && session.user.role !== "MANAGER") {
      return apiError("Không có quyền xoá comment này", 403);
    }
    await prisma.kolComment.update({
      where: { id: ctx.params.id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
