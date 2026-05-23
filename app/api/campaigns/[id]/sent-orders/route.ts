import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";

const productItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createSchema = z.object({
  sentDate: z.string().min(1),
  kolUsername: z.string().min(1),
  channel: z.enum(["TIKTOK", "EXTERNAL"]),
  sampleType: z.enum(["GIFT", "LOAN"]),
  tiktokOrderId: z.string().nullable().optional(),
  products: z.array(productItemSchema).min(1),
  staffId: z.string().nullable().optional(),
  status: z.enum(["NOT_SENT", "SHIPPING", "DELIVERED", "RETURNED"]).default("NOT_SENT"),
  trackingCode: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const orders = await prisma.sentOrder.findMany({
      where: { campaignId: ctx.params.id, deletedAt: null },
      orderBy: { sentDate: "desc" },
    });
    return NextResponse.json(orders);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const data = createSchema.parse(await req.json());
    const created = await prisma.sentOrder.create({
      data: {
        campaignId: ctx.params.id,
        sentDate: new Date(data.sentDate),
        kolUsername: data.kolUsername,
        channel: data.channel,
        sampleType: data.sampleType,
        tiktokOrderId: data.tiktokOrderId ?? null,
        products: data.products as unknown as Prisma.InputJsonValue,
        staffId: data.staffId ?? null,
        status: data.status,
        trackingCode: data.trackingCode ?? null,
        note: data.note ?? null,
        createdById: session.user.id,
      },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "CREATE",
      entity: "SentOrder",
      entityId: created.id,
      entityName: `Gửi @${created.kolUsername}`,
      after: created,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
