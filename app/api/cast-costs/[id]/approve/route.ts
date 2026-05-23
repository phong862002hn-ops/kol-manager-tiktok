import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { notify } from "@/lib/notifications";
import { formatVnd } from "@/lib/format";

export async function POST(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
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
