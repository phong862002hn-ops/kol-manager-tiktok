import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

// GET: list của user hiện tại — mới nhất trước
//   ?unreadOnly=1 → chỉ chưa đọc
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "1";
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          recipientId: session.user.id,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { recipientId: session.user.id, isRead: false },
      }),
    ]);
    return NextResponse.json({ items, unreadCount });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST: mark all as read
export async function POST() {
  try {
    const session = await requireSession();
    await prisma.notification.updateMany({
      where: { recipientId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
