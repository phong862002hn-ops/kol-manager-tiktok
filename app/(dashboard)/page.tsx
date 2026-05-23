import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isCancelledOrder } from "@/lib/constants";
import { formatNumber, formatVnd } from "@/lib/format";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";

export const dynamic = "force-dynamic";

function parseDateParam(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

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

  // Cross-shop: tất cả đơn từ Excel + tất cả KOL trong mọi campaign
  const [allOrders, allKols, campaigns, allCastCosts] = await Promise.all([
    prisma.tiktokOrder.findMany({
      where: { ...dateFilter, import: { deletedAt: null } },
      select: {
        creatorUsername: true,
        commissionBase: true,
        commissionPayment: true,
        orderStatus: true,
      },
    }),
    prisma.campaignKol.findMany({
      where: { deletedAt: null },
      select: { username: true },
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

  for (const o of allOrders) {
    if (isCancelledOrder(o.orderStatus)) continue;
    validOrders += 1;
    revenue += o.commissionBase ?? 0;
    commission += o.commissionPayment ?? 0;
    const u = o.creatorUsername.toLowerCase();
    let v = byCreator.get(u);
    if (!v) {
      v = { orders: 0, revenue: 0, commission: 0 };
      byCreator.set(u, v);
    }
    v.orders += 1;
    v.revenue += o.commissionBase ?? 0;
    v.commission += o.commissionPayment ?? 0;
  }

  const approvedCast = allCastCosts._sum.amount ?? 0;
  const profit = revenue - commission - approvedCast;

  // Top 10 cross-shop
  const top10 = Array.from(byCreator.entries())
    .map(([username, v]) => ({ username, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const uniqueKolsInCampaigns = new Set(
    allKols.map((k) => k.username.toLowerCase())
  ).size;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tổng quan</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Dữ liệu cross-campaign toàn shop
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Tổng KOL"
          primary={formatNumber(byCreator.size)}
          sub={`${uniqueKolsInCampaigns} trong campaign`}
        />
        <Kpi
          label="Tổng đơn hợp lệ"
          primary={formatNumber(validOrders)}
          sub={`${campaigns} chiến dịch`}
        />
        <Kpi label="Doanh thu" primary={formatVnd(revenue)} sub={`Hoa hồng ${formatVnd(commission)}`} />
        <Kpi
          label="Lợi nhuận"
          primary={formatVnd(profit)}
          sub={`− Cast ${formatVnd(approvedCast)}`}
          valueClass={profit >= 0 ? "text-green-700" : "text-red-700"}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Top 10 KOL ra tiền (toàn shop)
        </h2>
        {top10.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
            Chưa có đơn nào. <Link href="/imports" className="text-blue-600 hover:underline">Import file Excel</Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-medium w-12">#</th>
                  <th className="px-4 py-3 font-medium">KOL</th>
                  <th className="px-4 py-3 font-medium text-right">Đơn</th>
                  <th className="px-4 py-3 font-medium text-right">Doanh thu</th>
                  <th className="px-4 py-3 font-medium text-right">Hoa hồng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {top10.map((k, i) => (
                  <tr key={k.username} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">@{k.username}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(k.orders)}</td>
                    <td className="px-4 py-3 text-right">{formatVnd(k.revenue)}</td>
                    <td className="px-4 py-3 text-right">{formatVnd(k.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  primary,
  sub,
  valueClass,
}: {
  label: string;
  primary: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${valueClass ?? "text-gray-900"}`}>
        {primary}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
