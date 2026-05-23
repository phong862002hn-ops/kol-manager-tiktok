import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";

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

    const current = await prisma.castCost.findUnique({ where: { id: ctx.params.id } });
    if (!current) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    // Nếu sửa amount/costType → reset về PENDING
    const resetStatus =
      (data.amount !== undefined && data.amount !== current.amount) ||
      (data.costType !== undefined && data.costType !== current.costType);

    const updated = await prisma.castCost.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.costType !== undefined && { costType: data.costType }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount }),
        ...(resetStatus && current.status !== "PENDING"
          ? {
              status: "PENDING",
              approvedById: null,
              approvedAt: null,
              rejectReason: null,
            }
          : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    await prisma.castCost.delete({ where: { id: ctx.params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
