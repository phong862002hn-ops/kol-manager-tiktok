import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireUpdatePermission } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";

// PATCH: chỉnh sửa amount/type/note hoặc cập nhật paidAmount
// Nếu cast đã APPROVED hoặc REJECTED và sửa amount/type → reset về PENDING
const patchSchema = z.object({
  amount: z.number().int().positive().optional(),
  costType: z.enum(["PER_VIDEO", "LUMP_SUM"]).optional(),
  note: z.string().nullable().optional(),
  paidAmount: z.number().int().nonnegative().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const data = patchSchema.parse(await req.json());

    // Slice 5 SILENT-BUG FIX: audit sửa amount/paidAmount/costType — đây là chỗ
    // tiền có thể bị đổi âm thầm (vd 1tr → 500k) mà approve không bắt được.
    const before = await prisma.castCost.findUnique({
      where: { id: ctx.params.id },
      include: { campaignKol: { include: { campaign: { select: { name: true } } } } },
    });
    if (!before) throw new NotFoundError("Cast không tồn tại");
    // Slice 10: chỉ Manager hoặc proposer được PATCH cast
    const session = await requireUpdatePermission(before.proposedById);

    // Nếu sửa amount/costType → reset về PENDING
    const resetStatus =
      (data.amount !== undefined && data.amount !== before.amount) ||
      (data.costType !== undefined && data.costType !== before.costType);

    const updated = await prisma.castCost.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.costType !== undefined && { costType: data.costType }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount }),
        ...(resetStatus && before.status !== "PENDING"
          ? {
              status: "PENDING",
              approvedById: null,
              approvedAt: null,
              rejectReason: null,
            }
          : {}),
      },
    });

    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "UPDATE",
      entity: "CastCost",
      entityId: updated.id,
      entityName: `Cast @${before.campaignKol.username} (${before.campaignKol.campaign.name})`,
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
    await requireSession();
    // Slice 5: log DELETE cast cũng quan trọng (mất record tiền)
    const before = await prisma.castCost.findUnique({
      where: { id: ctx.params.id },
      include: { campaignKol: { include: { campaign: { select: { name: true } } } } },
    });
    if (!before) throw new NotFoundError("Cast không tồn tại");
    // Slice 10: chỉ Manager hoặc proposer được DELETE cast
    const session = await requireUpdatePermission(before.proposedById);

    await prisma.castCost.delete({ where: { id: ctx.params.id } });

    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "DELETE",
      entity: "CastCost",
      entityId: before.id,
      entityName: `Cast @${before.campaignKol.username} (${before.campaignKol.campaign.name})`,
      before,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
