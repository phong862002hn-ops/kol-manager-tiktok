import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

export type AuditEntity =
  | "Campaign"
  | "CampaignKol"
  | "Product"
  | "SentOrder"
  | "VideoLink"
  | "ExcelImport"
  | "User"
  | "CastCost";

type LogParams = {
  user: { id: string; email: string; name: string };
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName?: string | null;
  before?: unknown;
  after?: unknown;
};

/**
 * Ghi log vào DB. Best-effort — nếu log fail không throw, chỉ console.error
 * (để API mutation không bị block bởi log lỗi).
 */
export async function logAudit(params: LogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.user.id,
        userEmail: params.user.email,
        userName: params.user.name,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityName: params.entityName ?? null,
        beforeJson: params.before === undefined ? Prisma.JsonNull : (params.before as Prisma.InputJsonValue),
        afterJson: params.after === undefined ? Prisma.JsonNull : (params.after as Prisma.InputJsonValue),
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}
