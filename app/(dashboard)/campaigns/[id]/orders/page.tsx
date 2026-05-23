import { prisma } from "@/lib/prisma";
import { OrderListClient } from "./_components/OrderListClient";
import { isCancelledOrder } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function parseDateParam(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string; filter?: string; from?: string; to?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);
  const filter = searchParams.filter ?? "all"; // all | valid | cancelled
  const from = parseDateParam(searchParams.from);
  const to = parseDateParam(searchParams.to);
  const toEnd = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;
  const dateFilter =
    from || toEnd
      ? {
          createdTime: {
            ...(from ? { gte: from } : {}),
            ...(toEnd ? { lte: toEnd } : {}),
          },
        }
      : {};

  const kols = await prisma.campaignKol.findMany({
    where: { campaignId: params.id, deletedAt: null },
    select: { username: true },
  });
  const usernames = kols.map((k) => k.username);

  if (usernames.length === 0) {
    return (
      <OrderListClient
        rows={[]}
        kpi={{ total: 0, valid: 0, revenue: 0, commission: 0 }}
        page={1}
        totalPages={1}
        filter={filter}
        campaignId={params.id}
      />
    );
  }

  // KPI tính trên TOÀN BỘ đơn (không phân trang)
  const allOrders = await prisma.tiktokOrder.findMany({
    where: {
      creatorUsername: { in: usernames, mode: "insensitive" },
      import: { deletedAt: null },
      ...dateFilter,
    },
    select: {
      orderStatus: true,
      commissionBase: true,
      commissionPayment: true,
    },
  });
  let revenue = 0;
  let commission = 0;
  let valid = 0;
  for (const o of allOrders) {
    if (!isCancelledOrder(o.orderStatus)) {
      valid += 1;
      // Doanh thu = Cơ sở hoa hồng (không gồm ship/thuế)
      revenue += o.commissionBase ?? 0;
      commission += o.commissionPayment ?? 0;
    }
  }

  // Build where clause cho filter
  let whereFilter = {};
  if (filter === "valid") {
    whereFilter = { orderStatus: { notIn: ["Đã hủy", "Hủy"] } };
  } else if (filter === "cancelled") {
    whereFilter = { orderStatus: { in: ["Đã hủy", "Hủy"] } };
  }

  const where = {
    creatorUsername: { in: usernames, mode: "insensitive" as const },
    import: { deletedAt: null },
    ...whereFilter,
    ...dateFilter,
  };

  const total = await prisma.tiktokOrder.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = await prisma.tiktokOrder.findMany({
    where,
    orderBy: { createdTime: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      orderId: true,
      creatorUsername: true,
      contentType: true,
      productName: true,
      sku: true,
      paymentAmount: true,
      commissionPayment: true,
      orderStatus: true,
      createdTime: true,
    },
  });

  return (
    <OrderListClient
      rows={rows.map((r) => ({
        ...r,
        createdTime: r.createdTime?.toISOString() ?? null,
      }))}
      kpi={{ total: allOrders.length, valid, revenue, commission }}
      page={page}
      totalPages={totalPages}
      filter={filter}
      campaignId={params.id}
    />
  );
}
