import { prisma } from "@/lib/prisma";
import { isCancelledOrder } from "@/lib/constants";
import { formatNumber, formatVnd } from "@/lib/format";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { RevenueChart } from "./_components/RevenueChart";
import { CurrencyDistributionChart } from "./_components/DistributionChart";
import { ExportRevenueButton } from "./_components/ExportRevenueButton";
import { RevenueTable } from "./_components/RevenueTable";

export const dynamic = "force-dynamic";

function parseDateParam(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const from = parseDateParam(searchParams.from);
  const to = parseDateParam(searchParams.to);
  // Include end day fully
  const toEnd = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;

  const orders = await prisma.tiktokOrder.findMany({
    where: {
      import: { deletedAt: null },
      ...(from || toEnd
        ? {
            createdTime: {
              ...(from ? { gte: from } : {}),
              ...(toEnd ? { lte: toEnd } : {}),
            },
          }
        : {}),
    },
    select: {
      creatorUsername: true,
      orderStatus: true,
      commissionBase: true,
      commissionPayment: true,
      actualCommission: true,
    },
  });

  const byCreator = new Map<
    string,
    { orders: number; revenue: number; commission: number; actualCommission: number }
  >();
  for (const o of orders) {
    if (isCancelledOrder(o.orderStatus)) continue;
    const u = o.creatorUsername.toLowerCase();
    let v = byCreator.get(u);
    if (!v) {
      v = { orders: 0, revenue: 0, commission: 0, actualCommission: 0 };
      byCreator.set(u, v);
    }
    v.orders += 1;
    // Doanh thu KOL = Cơ sở hoa hồng (giá thanh toán thực tế, không gồm ship/thuế)
    // Tham khảo: https://seller-vn.tiktok.com/university/essay?knowledge_id=6837840205842177
    v.revenue += o.commissionBase ?? 0;
    v.commission += o.commissionPayment ?? 0;
    v.actualCommission += o.actualCommission ?? 0;
  }

  const rows = Array.from(byCreator.entries())
    .map(([username, v]) => ({
      username,
      ...v,
      commissionRate: v.revenue > 0 ? (v.commission / v.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topChart = rows.slice(0, 10).map((r) => ({
    username: r.username.length > 12 ? r.username.slice(0, 12) + "…" : r.username,
    revenue: r.revenue,
    commission: r.commission,
  }));

  // Distribution: top 10 + others (gộp KOL còn lại thành "Khác")
  const TOP_N = 10;
  const topN = rows.slice(0, TOP_N);
  const others = rows.slice(TOP_N);
  const othersRevenue = others.reduce((s, r) => s + r.revenue, 0);
  const distribution = [
    ...topN.map((r) => ({ name: `@${r.username}`, value: r.revenue })),
    ...(othersRevenue > 0
      ? [{ name: `Khác (${others.length})`, value: othersRevenue }]
      : []),
  ];
  const othersDetail = others.map((r) => ({
    username: r.username,
    orders: r.orders,
    revenue: r.revenue,
    commission: r.commission,
  }));

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalActualCommission = rows.reduce((s, r) => s + r.actualCommission, 0);
  const avgCommissionRate =
    totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Doanh thu KOL</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {rows.length} KOL có đơn (đã loại đơn hủy)
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DateRangeFilter />
          <ExportRevenueButton />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Tổng KOL" value={formatNumber(rows.length)} />
        <Kpi
          label="Tổng doanh thu"
          value={formatVnd(totalRevenue)}
          tip="Tính trên Cơ sở hoa hồng — giá thanh toán thực tế (sau giảm giá, KHÔNG gồm phí ship/thuế khách trả thêm)"
        />
        <Kpi
          label="HH ước tính"
          value={formatVnd(totalCommission)}
          tip="Cơ sở HH × Tỷ lệ HH tiêu chuẩn — chưa quyết toán"
        />
        <Kpi
          label="HH thực tế"
          value={formatVnd(totalActualCommission)}
          tip="HH sau quyết toán (đơn đã hoàn thành, đã trừ hoàn trả)"
        />
        <Kpi label="Tỷ lệ HH TB" value={`${avgCommissionRate.toFixed(1)}%`} />
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart data={topChart} />
          </div>
          <CurrencyDistributionChart
            title="Tỷ trọng doanh thu"
            subtitle={`Top ${TOP_N} + ${others.length} KOL còn lại`}
            data={distribution}
            othersDetail={othersDetail}
          />
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          Không có đơn nào trong khoảng thời gian này.
        </div>
      ) : (
        <RevenueTable rows={rows} />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tip,
}: {
  label: string;
  value: string;
  tip?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4" title={tip}>
      <div className="text-[11px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {label}
        {tip && <span className="text-gray-400 cursor-help">ⓘ</span>}
      </div>
      <div className="text-xl font-semibold text-gray-900 mt-2">{value}</div>
    </div>
  );
}
