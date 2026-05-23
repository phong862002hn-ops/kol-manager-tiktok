import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { normalizeUsername } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { notify, getManagerIds } from "@/lib/notifications";
import { formatVnd } from "@/lib/format";

const createSchema = z.object({
  username: z.string().min(1),
  tag: z.string().nullable().optional(),
  status: z.enum(["PAUSED", "NEW_CONTACT", "CONTACTING", "NEGOTIATING", "BOOKED"]).default("NEW_CONTACT"),
  zalo: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  ig: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  staffId: z.string().nullable().optional(),
  castAmount: z.number().int().nonnegative().nullable().optional(),
  castType: z.enum(["PER_VIDEO", "LUMP_SUM"]).nullable().optional(),
});

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const kols = await prisma.campaignKol.findMany({
      where: { campaignId: ctx.params.id, deletedAt: null },
      include: { castCost: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(kols);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = createSchema.parse(body);
    const username = normalizeUsername(data.username);

    // Cho phép re-create nếu bản cũ đã soft-deleted
    const existing = await prisma.campaignKol.findUnique({
      where: { campaignId_username: { campaignId: ctx.params.id, username } },
    });
    if (existing && !existing.deletedAt)
      return apiError("KOL này đã có trong chiến dịch");

    let created;
    if (existing && existing.deletedAt) {
      // Restore + update
      created = await prisma.campaignKol.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          tag: data.tag ?? null,
          status: data.status,
          zalo: data.zalo ?? null,
          email: data.email ?? null,
          facebook: data.facebook ?? null,
          ig: data.ig ?? null,
          note: data.note ?? null,
          staffId: data.staffId ?? null,
        },
        include: { castCost: true },
      });
    } else {
      created = await prisma.campaignKol.create({
        data: {
          campaignId: ctx.params.id,
          username,
          tag: data.tag ?? null,
          status: data.status,
          zalo: data.zalo ?? null,
          email: data.email ?? null,
          facebook: data.facebook ?? null,
          ig: data.ig ?? null,
          note: data.note ?? null,
          staffId: data.staffId ?? null,
          createdById: session.user.id,
          ...(data.castAmount && data.castType
            ? {
                castCost: {
                  create: {
                    amount: data.castAmount,
                    costType: data.castType,
                    proposedById: session.user.id,
                  },
                },
              }
            : {}),
        },
        include: { castCost: true },
      });
    }

    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "CREATE",
      entity: "CampaignKol",
      entityId: created.id,
      entityName: `@${created.username}`,
      after: created,
    });

    // Nếu kèm cast → notify Managers (kể cả người tự đề xuất)
    if (created.castCost) {
      const managerIds = await getManagerIds();
      await notify(
        managerIds.map((rid) => ({
          recipientId: rid,
          type: "CAST_PENDING" as const,
          title: `Cast mới chờ duyệt: @${created.username}`,
          body: `${session.user.name} đề xuất ${formatVnd(created.castCost!.amount)} (${created.castCost!.costType === "PER_VIDEO" ? "mỗi video" : "cả campaign"})`,
          link: `/approvals`,
        }))
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
