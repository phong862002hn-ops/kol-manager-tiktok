import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditClient } from "./_components/AuditClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function Page({
  searchParams,
}: {
  searchParams: { page?: string; entity?: string; action?: string; userId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "MANAGER") redirect("/");

  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);
  const where: Record<string, unknown> = {};
  if (searchParams.entity) where.entity = searchParams.entity;
  if (searchParams.action) where.action = searchParams.action;
  if (searchParams.userId) where.userId = searchParams.userId;

  const [logs, total, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AuditClient
      logs={logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userEmail: l.userEmail,
        userName: l.userName,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        entityName: l.entityName,
        beforeJson: l.beforeJson as unknown,
        afterJson: l.afterJson as unknown,
        createdAt: l.createdAt.toISOString(),
      }))}
      users={users}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filterEntity={searchParams.entity ?? ""}
      filterAction={searchParams.action ?? ""}
      filterUserId={searchParams.userId ?? ""}
    />
  );
}
