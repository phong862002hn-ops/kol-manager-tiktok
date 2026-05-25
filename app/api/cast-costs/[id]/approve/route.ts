import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { notify } from "@/lib/notifications";
import { formatVnd } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";

export async function POST(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
    // Slice 5: fetch before snapshot cho audit log
    const before = await prisma.castCost.findUnique({
      where: { id: ctx.params.id },
      include: { campaignKol: { include: { campaign: { select: { name: true } } } } },
    });
    if (!before) throw new NotFoundError("Cast không tồn tại");

    const updated = await prisma.castCost.update({
      where: { id: ctx.params.id },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
        rejectReason: null,
      },
      include: {
        campaignKol: { select: { username: true, campaignId: true } },
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

    if (updated.proposedById !== session.user.id) {
      await notify({
        recipientId: updated.proposedById,
        type: "CAST_APPROVED",
        title: `Cast được duyệt: @${updated.campaignKol.username}`,
        body: `${session.user.name} đã duyệt ${formatVnd(updated.amount)}`,
        link: `/campaigns/${updated.campaignKol.campaignId}/kols`,
      });
    }
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
