import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  tiktokId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const products = await prisma.product.findMany({
      where: { campaignId: ctx.params.id, deletedAt: null },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const data = createSchema.parse(await req.json());

    const existing = await prisma.product.findUnique({
      where: { campaignId_tiktokId: { campaignId: ctx.params.id, tiktokId: data.tiktokId } },
    });
    if (existing && !existing.deletedAt)
      return apiError("Sản phẩm với ID TikTok này đã có trong campaign");

    let created;
    if (existing && existing.deletedAt) {
      created = await prisma.product.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          name: data.name,
          sku: data.sku ?? null,
          note: data.note ?? null,
        },
      });
    } else {
      created = await prisma.product.create({
        data: {
          campaignId: ctx.params.id,
          tiktokId: data.tiktokId,
          name: data.name,
          sku: data.sku ?? null,
          note: data.note ?? null,
          createdById: session.user.id,
        },
      });
    }
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "CREATE",
      entity: "Product",
      entityId: created.id,
      entityName: created.name,
      after: created,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
