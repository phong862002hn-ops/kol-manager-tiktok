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

export async function notify(params: NotifyParams | NotifyParams[]) {
  const list = Array.isArray(params) ? params : [params];
  if (list.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: list.map((p) => ({
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
