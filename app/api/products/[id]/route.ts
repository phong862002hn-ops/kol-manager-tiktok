import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireDeletePermission } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const data = patchSchema.parse(await req.json());
    const before = await prisma.product.findUnique({ where: { id: ctx.params.id } });
    if (!before || before.deletedAt) return apiError("Không tìm thấy sản phẩm", 404);
    const updated = await prisma.product.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.note !== undefined && { note: data.note }),
      },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "UPDATE",
      entity: "Product",
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
    const existing = await prisma.product.findUnique({ where: { id: ctx.params.id } });
    if (!existing) return apiError("Không tìm thấy sản phẩm", 404);
    if (existing.deletedAt) return apiError("Đã bị xóa từ trước");
    const session = await requireDeletePermission(existing.createdById);
    await prisma.product.update({
      where: { id: ctx.params.id },
      data: { deletedAt: new Date() },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "DELETE",
      entity: "Product",
      entityId: existing.id,
      entityName: existing.name,
      before: existing,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
