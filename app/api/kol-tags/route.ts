import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { normalizeUsername } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET ?username=xxx → list tag của 1 KOL
// GET ?usernames=a,b,c → bulk lấy tag cho nhiều KOL (dùng ở bảng /kols)
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const usernameParam = req.nextUrl.searchParams.get("username");
    const usernamesParam = req.nextUrl.searchParams.get("usernames");

    if (usernameParam) {
      const username = normalizeUsername(usernameParam);
      const links = await prisma.kolTag.findMany({
        where: { username },
        include: { tag: true },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(links.map((l) => l.tag));
    }

    if (usernamesParam) {
      const usernames = usernamesParam
        .split(",")
        .map((u) => normalizeUsername(u))
        .filter(Boolean);
      const links = await prisma.kolTag.findMany({
        where: { username: { in: usernames } },
        include: { tag: true },
      });
      // Group: { username: [tag, ...] }
      const grouped: Record<string, Array<typeof links[number]["tag"]>> = {};
      for (const l of links) {
        if (!grouped[l.username]) grouped[l.username] = [];
        grouped[l.username].push(l.tag);
      }
      return NextResponse.json(grouped);
    }

    return apiError("Thiếu ?username hoặc ?usernames");
  } catch (err) {
    return handleApiError(err);
  }
}

// POST: gắn tag cho KOL (idempotent qua UNIQUE constraint)
const assignSchema = z.object({
  username: z.string().min(1),
  tagId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const data = assignSchema.parse(await req.json());
    const username = normalizeUsername(data.username);
    const link = await prisma.kolTag.upsert({
      where: { username_tagId: { username, tagId: data.tagId } },
      update: {},
      create: { username, tagId: data.tagId },
      include: { tag: true },
    });
    return NextResponse.json(link.tag, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE: gỡ tag khỏi KOL
export async function DELETE(req: NextRequest) {
  try {
    await requireSession();
    const username = normalizeUsername(req.nextUrl.searchParams.get("username") ?? "");
    const tagId = req.nextUrl.searchParams.get("tagId") ?? "";
    if (!username || !tagId) return apiError("Thiếu username hoặc tagId");
    await prisma.kolTag.deleteMany({
      where: { username, tagId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
