import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireManager } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSession();
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { kols: true } } },
    });
    return NextResponse.json(tags);
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color phải là hex 6 ký tự").optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const data = createSchema.parse(await req.json());
    const name = data.name.trim();
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) return apiError("Tag với tên này đã tồn tại");
    const created = await prisma.tag.create({
      data: { name, color: data.color ?? "#94a3b8" },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
