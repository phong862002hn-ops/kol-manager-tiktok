import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireDeletePermission } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  budget: z.number().int().nonnegative().optional(),
  targetKoc: z.number().int().nonnegative().optional(),
  targetVideos: z.number().int().nonnegative().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional(),
});

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const campaign = await prisma.campaign.findUnique({
      where: { id: ctx.params.id, deletedAt: null },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { kols: true, products: true, sentOrders: true } },
      },
    });
    if (!campaign) return apiError("Không tìm thấy chiến dịch", 404);
    return NextResponse.json(campaign);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = updateSchema.parse(body);
    const before = await prisma.campaign.findUnique({ where: { id: ctx.params.id } });
    if (!before || before.deletedAt) return apiError("Không tìm thấy chiến dịch", 404);
    const updated = await prisma.campaign.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.targetKoc !== undefined && { targetKoc: data.targetKoc }),
        ...(data.targetVideos !== undefined && { targetVideos: data.targetVideos }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "UPDATE",
      entity: "Campaign",
      entityId: updated.id,
      entityName: updated.name,
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
    const existing = await prisma.campaign.findUnique({ where: { id: ctx.params.id } });
    if (!existing) return apiError("Không tìm thấy chiến dịch", 404);
    if (existing.deletedAt) return apiError("Chiến dịch đã bị xóa từ trước");

    // Soft-delete: Staff chỉ xóa được campaign mình tạo, Manager xóa hết
    const session = await requireDeletePermission(existing.createdById);

    const updated = await prisma.campaign.update({
      where: { id: ctx.params.id },
      data: { deletedAt: new Date() },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "DELETE",
      entity: "Campaign",
      entityId: updated.id,
      entityName: existing.name,
      before: existing,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
