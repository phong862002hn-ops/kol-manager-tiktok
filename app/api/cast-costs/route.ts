import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { notify, getManagerIds } from "@/lib/notifications";
import { formatVnd } from "@/lib/format";

// POST: tạo cast mới cho 1 CampaignKol đã có
const createSchema = z.object({
  campaignKolId: z.string().min(1),
  amount: z.number().int().positive(),
  costType: z.enum(["PER_VIDEO", "LUMP_SUM"]),
  note: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const data = createSchema.parse(await req.json());

    const existing = await prisma.castCost.findUnique({
      where: { campaignKolId: data.campaignKolId },
    });
    if (existing) return apiError("KOL này đã có đề xuất cast");

    const created = await prisma.castCost.create({
      data: {
        campaignKolId: data.campaignKolId,
        amount: data.amount,
        costType: data.costType,
        note: data.note ?? null,
        proposedById: session.user.id,
      },
    });

    // Notify ALL Managers (kể cả người tự đề xuất nếu họ là Manager).
    // Cast pending là việc quan trọng → đảm bảo không bị bỏ sót dù tự tạo.
    const ck = await prisma.campaignKol.findUnique({
      where: { id: data.campaignKolId },
      select: { username: true, campaignId: true },
    });
    const managerIds = await getManagerIds();
    if (ck) {
      await notify(
        managerIds.map((rid) => ({
          recipientId: rid,
          type: "CAST_PENDING" as const,
          title: `Cast mới chờ duyệt: @${ck.username}`,
          body: `${session.user.name} đề xuất ${formatVnd(data.amount)} (${data.costType === "PER_VIDEO" ? "mỗi video" : "cả campaign"})`,
          link: `/approvals`,
        }))
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
