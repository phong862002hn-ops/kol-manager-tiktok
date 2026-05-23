import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const data = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });
    if (!user) return apiError("Không tìm thấy user", 404);

    const ok = await bcrypt.compare(data.currentPassword, user.password);
    if (!ok) return apiError("Mật khẩu hiện tại không đúng");

    if (data.newPassword === data.currentPassword) {
      return apiError("Mật khẩu mới phải khác mật khẩu hiện tại");
    }

    const hash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hash },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
