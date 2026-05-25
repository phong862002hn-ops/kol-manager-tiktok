import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireDeletePermission, requireUpdatePermission } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { SHIP_STATUS_LABELS } from "@/lib/constants";

const productItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
});

const patchSchema = z.object({
  sentDate: z.string().optional(),
  kolUsername: z.string().min(1).optional(),
  channel: z.enum(["TIKTOK", "EXTERNAL"]).optional(),
  sampleType: z.enum(["GIFT", "LOAN"]).optional(),
  tiktokOrderId: z.string().nullable().optional(),
  products: z.array(productItemSchema).min(1).optional(),
  staffId: z.string().nullable().optional(),
  status: z.enum(["NOT_SENT", "SHIPPING", "DELIVERED", "RETURNED"]).optional(),
  trackingCode: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const data = patchSchema.parse(await req.json());
    const before = await prisma.sentOrder.findUnique({ where: { id: ctx.params.id } });
    if (!before || before.deletedAt) return apiError("Không tìm thấy đơn", 404);
    // Slice 10: chỉ Manager hoặc creator được PATCH
    const session = await requireUpdatePermission(before.createdById);
    const updated = await prisma.sentOrder.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.sentDate !== undefined && { sentDate: new Date(data.sentDate) }),
        ...(data.kolUsername !== undefined && { kolUsername: data.kolUsername }),
        ...(data.channel !== undefined && { channel: data.channel }),
        ...(data.sampleType !== undefined && { sampleType: data.sampleType }),
        ...(data.tiktokOrderId !== undefined && { tiktokOrderId: data.tiktokOrderId }),
        ...(data.products !== undefined && {
          products: data.products as unknown as Prisma.InputJsonValue,
        }),
        ...(data.staffId !== undefined && { staffId: data.staffId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.trackingCode !== undefined && { trackingCode: data.trackingCode }),
        ...(data.note !== undefined && { note: data.note }),
      },
    });

    // Notify khi status đổi → staff phụ trách KOL (tìm trong CampaignKol theo username)
    if (data.status !== undefined && data.status !== before.status) {
      const ck = await prisma.campaignKol.findFirst({
        where: {
          campaignId: updated.campaignId,
          username: updated.kolUsername.toLowerCase(),
          deletedAt: null,
        },
        select: { staffId: true },
      });
      if (ck?.staffId && ck.staffId !== session.user.id) {
        await notify({
          recipientId: ck.staffId,
          type: "SENT_ORDER_STATUS",
          title: `Đơn gửi @${updated.kolUsername}: ${SHIP_STATUS_LABELS[data.status] ?? data.status}`,
          body: updated.trackingCode ? `Mã vận đơn: ${updated.trackingCode}` : undefined,
          link: `/campaigns/${updated.campaignId}/sent`,
        });
      }
    }

    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "UPDATE",
      entity: "SentOrder",
      entityId: updated.id,
      entityName: `Gửi @${updated.kolUsername}`,
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
    const existing = await prisma.sentOrder.findUnique({ where: { id: ctx.params.id } });
    if (!existing) return apiError("Không tìm thấy đơn", 404);
    if (existing.deletedAt) return apiError("Đã bị xóa từ trước");
    const session = await requireDeletePermission(existing.createdById);
    await prisma.sentOrder.update({
      where: { id: ctx.params.id },
      data: { deletedAt: new Date() },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "DELETE",
      entity: "SentOrder",
      entityId: existing.id,
      entityName: `Gửi @${existing.kolUsername}`,
      before: existing,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
