import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["STAFF", "MANAGER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
    const data = patchSchema.parse(await req.json());

    // Không cho phép Manager tự disable mình hoặc tự hạ role mình
    if (ctx.params.id === session.user.id) {
      if (data.active === false) return apiError("Không thể vô hiệu hóa chính bạn");
      if (data.role && data.role !== "MANAGER")
        return apiError("Không thể hạ role chính bạn");
    }

    const updated = await prisma.user.update({
      where: { id: ctx.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.email !== undefined && { email: data.email.trim().toLowerCase() }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.password !== undefined && { password: await bcrypt.hash(data.password, 10) }),
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await requireManager();
    if (ctx.params.id === session.user.id) {
      return apiError("Không thể xóa chính bạn");
    }
    // Soft-delete: set active=false thay vì xóa hẳn (vì user có thể là proposer/approver
    // của CastCost, references onDelete chưa setup)
    await prisma.user.update({
      where: { id: ctx.params.id },
      data: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
