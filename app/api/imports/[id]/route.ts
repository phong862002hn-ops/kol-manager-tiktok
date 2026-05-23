import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";

// CHỈ Manager mới xóa được import — vì xóa = cascade xóa hết TiktokOrder (mất doanh thu)
export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
    const existing = await prisma.excelImport.findUnique({
      where: { id: ctx.params.id },
    });
    if (!existing) return apiError("Không tìm thấy", 404);
    if (existing.deletedAt) return apiError("Đã bị xóa từ trước");

    await prisma.excelImport.update({
      where: { id: ctx.params.id },
      data: { deletedAt: new Date() },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "DELETE",
      entity: "ExcelImport",
      entityId: existing.id,
      entityName: `${existing.fileName} (${existing.rowCount} dòng)`,
      before: existing,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
