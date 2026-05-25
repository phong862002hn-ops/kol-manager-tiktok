import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireDeletePermission, requireUpdatePermission } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { normalizeUsername } from "@/lib/format";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  username: z.string().min(1).optional(),
  tag: z.string().nullable().optional(),
  status: z.enum(["PAUSED", "NEW_CONTACT", "CONTACTING", "NEGOTIATING", "BOOKED"]).optional(),
  zalo: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  ig: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  staffId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const body = await req.json();
    const data = updateSchema.parse(body);
    const before = await prisma.campaignKol.findUnique({ where: { id: ctx.params.id } });
    if (!before || before.deletedAt) return apiError("Không tìm thấy KOL", 404);
    // Slice 10: chỉ Manager hoặc creator được PATCH
    const session = await requireUpdatePermission(before.createdById);
    const updated = await prisma.campaignKol.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.username !== undefined && { username: normalizeUsername(data.username) }),
        ...(data.tag !== undefined && { tag: data.tag }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.zalo !== undefined && { zalo: data.zalo }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.facebook !== undefined && { facebook: data.facebook }),
        ...(data.ig !== undefined && { ig: data.ig }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.staffId !== undefined && { staffId: data.staffId }),
      },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "UPDATE",
      entity: "CampaignKol",
      entityId: updated.id,
      entityName: `@${updated.username}`,
      before,
      after: updated,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const existing = await prisma.campaignKol.findUnique({ where: { id: ctx.params.id } });
    if (!existing) return apiError("Không tìm thấy KOL", 404);
    if (existing.deletedAt) return apiError("KOL đã bị xóa từ trước");
    const session = await requireDeletePermission(existing.createdById);
    const updated = await prisma.campaignKol.update({
      where: { id: ctx.params.id },
      data: { deletedAt: new Date() },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "DELETE",
      entity: "CampaignKol",
      entityId: updated.id,
      entityName: `@${existing.username}`,
      before: existing,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
