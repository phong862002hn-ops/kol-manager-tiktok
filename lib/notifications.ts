// Helper tạo notification. Best-effort — không throw nếu fail.
import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "COMMENT_NEW"
  | "CAST_PENDING"
  | "CAST_APPROVED"
  | "CAST_REJECTED"
  | "SENT_ORDER_STATUS";

type NotifyParams = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

// Slice 12: window dedup — không tạo noti trùng (recipientId + type + link)
// nếu noti tương tự đã được tạo trong DEDUP_WINDOW_MS gần đây.
// Mục tiêu: tránh spam khi user click 2x, hoặc khi API trigger 2 lần liên tiếp.
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 phút

async function shouldSkipDuplicate(p: NotifyParams): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);
  const existing = await prisma.notification.findFirst({
    where: {
      recipientId: p.recipientId,
      type: p.type,
      link: p.link ?? null,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return existing !== null;
}

export async function notify(params: NotifyParams | NotifyParams[]) {
  const list = Array.isArray(params) ? params : [params];
  if (list.length === 0) return;
  try {
    // Slice 12: filter out duplicates trong window
    const toCreate: NotifyParams[] = [];
    for (const p of list) {
      const skip = await shouldSkipDuplicate(p);
      if (!skip) toCreate.push(p);
    }
    if (toCreate.length === 0) return;

    await prisma.notification.createMany({
      data: toCreate.map((p) => ({
        recipientId: p.recipientId,
        type: p.type,
        title: p.title,
        body: p.body ?? null,
        link: p.link ?? null,
      })),
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

// Lấy danh sách Manager để broadcast (vd cast PENDING)
export async function getManagerIds(): Promise<string[]> {
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER", active: true },
    select: { id: true },
  });
  return managers.map((m) => m.id);
}
