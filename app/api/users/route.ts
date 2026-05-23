import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession, requireManager } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

// GET: list users — bất kỳ ai login đều xem được (cần để filter staff dropdown)
// Truyền ?all=1 để Manager xem cả user bị disabled
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const showAll =
      req.nextUrl.searchParams.get("all") === "1" &&
      session.user.role === "MANAGER";
    const users = await prisma.user.findMany({
      where: showAll ? {} : { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(users);
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["STAFF", "MANAGER"]).default("STAFF"),
});

// POST: Manager tạo user mới
export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const data = createSchema.parse(await req.json());
    const email = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return apiError("Email này đã tồn tại");

    const hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: data.name.trim(),
        password: hash,
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
