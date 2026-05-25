import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";
import { NotFoundError, ConflictError } from "@/lib/errors";

/**
 * Slice 11: Manager restore ExcelImport đã soft-deleted.
 * Set deletedAt = null, log audit RESTORE.
 * TiktokOrder con vẫn còn (vì soft-delete không cascade) → restore import = order hiển thị lại.
 */
export async function POST(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
    const before = await prisma.excelImport.findUnique({ where: { id: ctx.params.id } });
    if (!before) throw new NotFoundError("Import không tồn tại");
    if (!before.deletedAt) throw new ConflictError("Import chưa bị xóa");

    const after = await prisma.excelImport.update({
      where: { id: ctx.params.id },
      data: { deletedAt: null },
    });

    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "RESTORE",
      entity: "ExcelImport",
      entityId: after.id,
      entityName: `${after.fileName} (${after.rowCount} dòng)`,
      before,
      after,
    });

    return NextResponse.json(after);
  } catch (err) {
    return handleApiError(err);
  }
}
