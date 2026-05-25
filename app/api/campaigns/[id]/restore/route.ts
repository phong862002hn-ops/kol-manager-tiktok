import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";
import { NotFoundError, ConflictError } from "@/lib/errors";

/**
 * Slice 11: Manager restore Campaign đã soft-deleted.
 * Set deletedAt = null, log audit RESTORE.
 */
export async function POST(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
    const before = await prisma.campaign.findUnique({ where: { id: ctx.params.id } });
    if (!before) throw new NotFoundError("Campaign không tồn tại");
    if (!before.deletedAt) throw new ConflictError("Campaign chưa bị xóa");

    const after = await prisma.campaign.update({
      where: { id: ctx.params.id },
      data: { deletedAt: null },
    });

    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "RESTORE",
      entity: "Campaign",
      entityId: after.id,
      entityName: after.name,
      before,
      after,
    });

    return NextResponse.json(after);
  } catch (err) {
    return handleApiError(err);
  }
}
