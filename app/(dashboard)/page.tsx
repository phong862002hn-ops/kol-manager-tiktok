import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isCancelledOrder } from "@/lib/constants";
import { formatNumber, formatVnd } from "@/lib/format";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { KpiCard } from "@/components/shared/KpiCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Sparkline } from "@/components/shared/Sparkline";
import { Progress } from "@/components/shared/Progress";
import { Avatar } from "@/components/shared/Avatar";

export const dynamic = "force-dynamic";

function parseDateParam(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

const PIPELINE_ORDER = [
  { key: "NEW_CONTACT", label: "Mới liên hệ" },
  { key: "CONTACTING", label: "Đang liên hệ" },
  { key: "NEGOTIATING", label: "Đang thương lượng" },
  { key: "BOOKED", label: "Đã chốt" },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
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

  const [allOrders, allKols, kolStatusGroups, campaigns, allCastCosts] =
    await Promise.all([
      prisma.tiktokOrder.findMany({
        where: { ...dateFilter, import: { deletedAt: null } },
        select: {
          creatorUsername: true,
          commissionBase: true,
          commissionPayment: true,
          orderStatus: true,
          createdTime: true,
        },
      }),
      prisma.campaignKol.findMany({
        where: { deletedAt: null },
        select: { username: true },
      }),
      prisma.campaignKol.groupBy({
        by: ["status"],
        where: { deletedAt: null, campaign: { deletedAt: null } },
        _count: { _all: true },
      }),
      prisma.campaign.count({ where: { deletedAt: null } }),
      prisma.castCost.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true },
      }),
    ]);

  let revenue = 0;
  let commission = 0;
  let validOrders = 0;
  const byCreator = new Map<
    string,
    { orders: number; revenue: number; commission: number }
  >();
  const revenueByDay = new Map<string, number>();

  for (const o of allOrders) {
    if (isCancelledOrder(o.orderStatus)) continue;
    validOrders += 1;
    const base = o.commissionBase ?? 0;
    const comm = o.commissionPayment ?? 0;
    revenue += base;
    commission += comm;
    const u = o.creatorUsername.toLowerCase();
    let v = byCreator.get(u);
    if (!v) {
      v = { orders: 0, revenue: 0, commission: 0 };
      byCreator.set(u, v);
    }
    v.orders += 1;
    v.revenue += base;
    v.commission += comm;

    if (o.createdTime) {
      const key = o.createdTime.toISOString().slice(0, 10);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + base);
    }
  }

  const approvedCast = allCastCosts._sum.amount ?? 0;
  const profit = revenue - commission - approvedCast;

  const top10 = Array.from(byCreator.entries())
    .map(([username, v]) => ({ username, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const uniqueKolsInCampaigns = new Set(
    allKols.map((k) => k.username.toLowerCase())
  ).size;

  const sparklineData = (() => {
    const sorted = Array.from(revenueByDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-21);
    return sorted.map(([, v]) => v);
  })();

  const statusCountMap = new Map<string, number>();
  for (const g of kolStatusGroups) {
    statusCountMap.set(g.status, g._count._all);
  }
  const totalPipeline =
    PIPELINE_ORDER.reduce(
      (acc, s) => acc + (statusCountMap.get(s.key) ?? 0),
      0
    ) || 1;
  const withOrders = byCreator.size;

  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-[57px] z-10 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
          <DateRangeFilter />
          <div className="ml-auto text-xs text-muted-foreground">
            {campaigns} chiến dịch đang theo dõi
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="KOL hoạt động"
            value={formatNumber(byCreator.size)}
            sub={`${uniqueKolsInCampaigns} trong campaign`}
          />
          <KpiCard
            label="Đơn hợp lệ"
            value={formatNumber(validOrders)}
            sub={`${campaigns} chiến dịch`}
          />
          <KpiCard
            label="Doanh thu"
            value={formatVnd(revenue)}
            sub={`Hoa hồng ${formatVnd(commission)}`}
          />
          <KpiCard
            label="Lợi nhuận ròng"
            value={formatVnd(profit)}
            deltaDir={profit >= 0 ? "up" : "down"}
            sub={`− Cast ${formatVnd(approvedCast)}`}
          />
        </div>

        {/* Chart + pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <SectionHeader
              title="Doanh thu theo ngày"
              sub={
                sparklineData.length > 0
                  ? `${sparklineData.length} ngày gần nhất`
                  : "Chưa có dữ liệu trong khoảng đang chọn"
              }
            />
            <div className="flex items-baseline gap-2.5 mb-3">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatVnd(revenue)}
              </span>
            </div>
            <Sparkline
              data={sparklineData}
              height={180}
              showAxis={false}
              color="hsl(var(--primary))"
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <SectionHeader
              title="Pipeline KOL"
              sub={`${totalPipeline} KOL trong campaign`}
            />
            <div className="space-y-3">
              {PIPELINE_ORDER.map((stage) => {
                const count = statusCountMap.get(stage.key) ?? 0;
                const pct = Math.round((count / totalPipeline) * 100);
                return (
                  <div key={stage.key}>
                    <div className="flex justify-between text-[12.5px] mb-1.5">
                      <span className="text-foreground">{stage.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        <span className="text-foreground font-medium">
                          {formatNumber(count)}
                        </span>{" "}
                        · {pct}%
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      color={
                        stage.key === "BOOKED"
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground) / 0.7)"
                      }
                    />
                  </div>
                );
              })}
              <div className="pt-3 mt-3 border-t border-border">
                <div className="flex justify-between text-[12.5px] mb-1.5">
                  <span className="text-foreground">Có đơn về</span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="text-foreground font-medium">
                      {formatNumber(withOrders)}
                    </span>{" "}
                    KOL
                  </span>
                </div>
                <Progress
                  value={withOrders}
                  max={Math.max(totalPipeline, withOrders, 1)}
                  color="hsl(var(--success))"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top KOL table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Top KOL ra tiền
              </h2>
              <div className="text-xs text-muted-foreground mt-0.5">
                Sắp xếp theo doanh thu · toàn shop
              </div>
            </div>
            {byCreator.size > 10 && (
              <Link
                href="/kols"
                className="text-xs font-medium text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                Xem tất cả {formatNumber(byCreator.size)} →
              </Link>
            )}
          </div>
          {top10.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Chưa có đơn nào.{" "}
              <Link
                href="/imports"
                className="text-primary hover:underline"
              >
                Import file Excel
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
                    <th className="px-4 py-2.5 font-medium w-12">#</th>
                    <th className="px-4 py-2.5 font-medium">KOL</th>
                    <th className="px-4 py-2.5 font-medium text-right">Đơn</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Doanh thu
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Hoa hồng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((k, i) => (
                    <tr
                      key={k.username}
                      className="border-b border-border last:border-b-0 hover:bg-muted/60 transition-colors duration-150"
                    >
                      <td className="px-4 py-2.5 text-muted-foreground tabular-nums text-xs">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={k.username} size={26} />
                          <div className="font-medium text-foreground">
                            @{k.username}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatNumber(k.orders)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {formatVnd(k.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatVnd(k.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
