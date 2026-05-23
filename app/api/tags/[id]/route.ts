import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireManager();
    const data = patchSchema.parse(await req.json());
    const updated = await prisma.tag.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireManager();
    // CASCADE sẽ tự xoá hết KolTag references
    await prisma.tag.delete({ where: { id: ctx.params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
