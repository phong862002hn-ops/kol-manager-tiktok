import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { notify } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";

const schema = z.object({
  rejectReason: z.string().min(1),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
    const data = schema.parse(await req.json());
    // Slice 5: fetch before snapshot
    const before = await prisma.castCost.findUnique({
      where: { id: ctx.params.id },
      include: { campaignKol: { include: { campaign: { select: { name: true } } } } },
    });
    if (!before) throw new NotFoundError("Cast không tồn tại");

    const updated = await prisma.castCost.update({
      where: { id: ctx.params.id },
      data: {
        status: "REJECTED",
        approvedById: session.user.id,
        approvedAt: new Date(),
        rejectReason: data.rejectReason,
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
        type: "CAST_REJECTED",
        title: `Cast bị từ chối: @${updated.campaignKol.username}`,
        body: `${session.user.name}: ${data.rejectReason}`,
        link: `/campaigns/${updated.campaignKol.campaignId}/kols`,
      });
    }
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
