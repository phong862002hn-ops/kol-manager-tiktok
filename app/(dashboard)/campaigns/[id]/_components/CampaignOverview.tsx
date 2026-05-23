"use client";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { formatNumber, formatVnd } from "@/lib/format";
import { KOL_STATUS_LABELS } from "@/lib/constants";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { StaffFilter } from "@/components/shared/StaffFilter";
import {
  CountPieChart,
  CurrencyPieChart,
  GmvBarChart,
  TimeLineChart,
} from "./OverviewCharts";

type Overview = {
  totalBookedKols: number;
  targetKocs: number;
  totalVideosWithOrders: number;
  targetVideos: number;
  searchedKocs: number;
  totalCod: number;
  approvedCount: number;
  videoRevenue: number;
  productProgress: { productId: string; name: string; booked: number; orderCount: number }[];
  staffProgress: { staffId: string; name: string; kocCount: number; videoCount: number }[];
  tagProgress: { tag: string; count: number }[];
  contactStatus: Record<string, number>;
  collaborationStatus: { sampleSent: number; completed: number };
  staffPerformance: { staffId: string; name: string; done: number; total: number; percent: number }[];
  sampleManagement: { kocSent: number; totalCost: number; paid: number; unpaid: number };
  revenueByTag: { tag: string; revenue: number; percent: number }[];
  revenueByProduct: { productId: string; name: string; revenue: number; percent: number }[];
  revenueByStaff: { staffId: string; name: string; revenue: number; percent: number }[];
  videoRatioByStaff: { staffId: string; name: string; count: number; percent: number }[];
  videoRevenueRatioByStaff: { staffId: string; name: string; revenue: number; percent: number }[];
  kocRatioByTag: { tag: string; count: number; percent: number }[];
  gmvByProduct: { productId: string; name: string; gmv: number }[];
  kocSearchByDate: { date: string; count: number }[];
  videoByDate: { date: string; count: number }[];
};

export function CampaignOverview({ campaignId }: { campaignId: string }) {
  const params = useSearchParams();
  const qs = params.toString();
  const { data, isLoading } = useSWR<Overview>(
    `/api/campaigns/${campaignId}/overview${qs ? `?${qs}` : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Filter sticky top */}
      <div className="sticky top-0 z-10 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 bg-gray-50/95 backdrop-blur border-b border-gray-200 flex items-center gap-3 flex-wrap">
        <DateRangeFilter />
        <StaffFilter />
      </div>

      {isLoading || !data ? (
        <Skeleton />
      ) : (
        <>
          {/* ═══════ NHÓM 1 ═══════ */}
          <Group
            badge="Tổng quan chiến dịch"
            badgeColor="bg-blue-600"
            subtitle="Toàn bộ tình hình booking, video và các KPI chính."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProgressCard
                icon="📦"
                title="Tổng KOC đã booking"
                current={data.totalBookedKols}
                target={data.targetKocs}
                unit="KOC"
                color="bg-blue-500"
              />
              <ProgressCard
                icon="🎬"
                title="Tiến độ KOC làm video"
                current={data.totalVideosWithOrders}
                target={data.targetVideos}
                unit="Video"
                color="bg-cyan-500"
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <StatCard icon="🔍" label="Tìm kiếm KOC" value={formatNumber(data.searchedKocs)} sub="KOC" />
              <StatCard icon="💰" label="Tổng COD" value={formatVnd(data.totalCod)} />
              <StatCard icon="✅" label="Đã duyệt (booking)" value={formatNumber(data.approvedCount)} sub="KOC" />
              <StatCard icon="💵" label="Doanh thu video" value={formatVnd(data.videoRevenue)} />
            </div>
          </Group>

          {/* ═══════ NHÓM 2 ═══════ */}
          <Group
            badge="Theo dõi tiến độ chi tiết"
            badgeColor="bg-indigo-600"
            subtitle="Theo dõi tiến độ booking theo sản phẩm, nhân sự và nhóm KOC."
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SubCard title="Quản lý tiến độ theo sản phẩm">
                {data.productProgress.length === 0 ? (
                  <Empty />
                ) : (
                  <div className="space-y-3">
                    {data.productProgress.map((p) => (
                      <ProgressLine
                        key={p.productId}
                        label={p.name}
                        current={p.booked}
                        meta={`${formatNumber(p.orderCount)} đơn`}
                      />
                    ))}
                  </div>
                )}
              </SubCard>
              <SubCard title="Quản lý tiến độ theo nhân sự">
                {data.staffProgress.length === 0 ? (
                  <Empty />
                ) : (
                  <div className="space-y-2">
                    {data.staffProgress.map((s) => (
                      <div
                        key={s.staffId}
                        className="flex justify-between items-baseline text-sm border-b border-gray-100 last:border-0 py-2"
                      >
                        <span className="text-gray-900 font-medium">{s.name}</span>
                        <span className="text-xs text-gray-500">
                          {formatNumber(s.kocCount)} KOC · {formatNumber(s.videoCount)} video
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SubCard>
              <SubCard title="Quản lý tiến độ theo nhóm KOC">
                {data.tagProgress.length === 0 ? (
                  <Empty />
                ) : (
                  <div className="space-y-3">
                    {data.tagProgress.map((t) => (
                      <ProgressLine
                        key={t.tag}
                        label={t.tag}
                        current={t.count}
                        meta={`${formatNumber(t.count)} KOC`}
                      />
                    ))}
                  </div>
                )}
              </SubCard>
            </div>
          </Group>

          {/* ═══════ NHÓM 3 ═══════ */}
          <Group
            badge="Vận hành liên hệ và hợp tác"
            badgeColor="bg-purple-600"
            subtitle="Kiểm soát pipeline làm việc theo trạng thái và năng suất của từng nhân sự."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubCard title="Quản lý trạng thái liên hệ">
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(data.contactStatus).map(([s, n]) => (
                    <div
                      key={s}
                      className="border border-gray-200 rounded-md p-3 text-center hover:bg-purple-50 transition"
                    >
                      <div className="text-[11px] text-gray-500">
                        {KOL_STATUS_LABELS[s] ?? s}
                      </div>
                      <div className="text-2xl font-semibold text-gray-900 mt-1">{n}</div>
                    </div>
                  ))}
                </div>
              </SubCard>
              <SubCard title="Quản lý trạng thái hợp tác">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <MiniBox label="Gửi mẫu" value={data.collaborationStatus.sampleSent} />
                  <MiniBox
                    label="Đã hoàn thành"
                    value={data.collaborationStatus.completed}
                    color="text-green-700"
                  />
                </div>
                <div className="border-t pt-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Năng suất theo nhân sự
                  </div>
                  {data.staffPerformance.length === 0 ? (
                    <Empty />
                  ) : (
                    <div className="space-y-2">
                      {data.staffPerformance.map((s) => (
                        <div key={s.staffId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700">{s.name}</span>
                            <span className="text-gray-500">
                              {s.done}/{s.total} · {s.percent}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all"
                              style={{ width: `${s.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SubCard>
            </div>
          </Group>

          {/* ═══════ NHÓM 4 ═══════ */}
          <Group
            badge="Hàng mẫu và hiệu suất nhanh"
            badgeColor="bg-emerald-600"
            subtitle="Tổng hợp chi phí hàng mẫu/cast và doanh thu theo các chiều phân tích."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubCard title="Quản lý hàng mẫu / cast" className="bg-emerald-50/30">
                <div className="divide-y divide-emerald-100/60 text-sm">
                  <KVRow label="KOC đã gửi mẫu" value={formatNumber(data.sampleManagement.kocSent)} />
                  <KVRow label="Tổng chi phí cast" value={formatVnd(data.sampleManagement.totalCost)} />
                  <KVRow
                    label="Đã thanh toán"
                    value={formatVnd(data.sampleManagement.paid)}
                    valueClass="text-green-700 font-semibold"
                  />
                  <KVRow
                    label="Chưa thanh toán"
                    value={formatVnd(data.sampleManagement.unpaid)}
                    valueClass="text-red-700 font-semibold"
                  />
                </div>
              </SubCard>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <RankBox title="Doanh thu theo nhóm KOC" rows={data.revenueByTag.slice(0, 5).map((r) => ({ name: r.tag, value: r.revenue, percent: r.percent }))} />
                <RankBox title="Doanh thu theo sản phẩm" rows={data.revenueByProduct.slice(0, 5).map((r) => ({ name: r.name, value: r.revenue, percent: r.percent }))} />
                <RankBox title="Doanh thu theo nhân sự" rows={data.revenueByStaff.slice(0, 5).map((r) => ({ name: r.name, value: r.revenue, percent: r.percent }))} />
              </div>
            </div>
          </Group>

          {/* ═══════ NHÓM 5 ═══════ */}
          <Group
            badge="Phân tích mở rộng"
            badgeColor="bg-slate-800"
            subtitle="Các biểu đồ tổng hợp theo ngày và theo tỉ trọng để đối chiếu dữ liệu."
          >
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 border-l-4 border-blue-300 pl-3">
                Phân bổ nguồn lực — cơ cấu video, doanh thu, tag và sản phẩm
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SubCard title="Tỉ trọng video theo nhân sự">
                  <CountPieChart
                    data={data.videoRatioByStaff.map((v) => ({ name: v.name, value: v.count }))}
                  />
                </SubCard>
                <SubCard title="Tỉ trọng doanh thu video theo nhân sự">
                  <CurrencyPieChart
                    data={data.videoRevenueRatioByStaff.map((v) => ({ name: v.name, value: v.revenue }))}
                  />
                </SubCard>
                <SubCard title="Tỉ trọng KOC theo nhãn (tag)">
                  <CountPieChart
                    data={data.kocRatioByTag.map((v) => ({ name: v.tag, value: v.count }))}
                  />
                </SubCard>
                <SubCard title="GMV theo sản phẩm (Top 8)">
                  <GmvBarChart data={data.gmvByProduct} />
                </SubCard>
              </div>

              <div className="text-sm font-medium text-gray-700 border-l-4 border-blue-300 pl-3 mt-6">
                Xu hướng theo thời gian — 21 ngày gần nhất
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SubCard title="Tìm kiếm KOC theo ngày">
                  <TimeLineChart data={data.kocSearchByDate} color="#2563eb" />
                </SubCard>
                <SubCard title="Video KOC theo ngày">
                  <TimeLineChart data={data.videoByDate} color="#8b5cf6" />
                </SubCard>
              </div>
            </div>
          </Group>
        </>
      )}
    </div>
  );
}

// ═══════ Sub-components ═══════

function Group({
  badge,
  badgeColor,
  subtitle,
  children,
}: {
  badge: string;
  badgeColor: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${badgeColor}`}
        >
          {badge}
        </span>
        <span className="text-xs text-gray-500 mt-1.5">{subtitle}</span>
      </div>
      {children}
    </section>
  );
}

function SubCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function ProgressCard({
  icon,
  title,
  current,
  target,
  unit,
  color,
}: {
  icon: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const remain = Math.max(0, target - current);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{pct}%</div>
      <div className="flex justify-between text-xs text-gray-500 mt-2 mb-1.5">
        <span>Hiện tại {formatNumber(current)}</span>
        <span>Mục tiêu {target > 0 ? formatNumber(target) : "—"}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Còn lại: <span className="font-medium text-gray-700">{formatNumber(remain)} {unit}</span>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ProgressLine({
  label,
  current,
  meta,
}: {
  label: string;
  current: number;
  meta: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-700 font-medium line-clamp-1">{label}</span>
        <span className="text-gray-500 whitespace-nowrap pl-2">{meta}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all"
          style={{ width: `${Math.min(100, current * 8)}%` }}
        />
      </div>
    </div>
  );
}

function MiniBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="border border-gray-200 rounded-md p-3 text-center">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color ?? "text-gray-900"}`}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

function KVRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-baseline py-2">
      <span className="text-gray-600">{label}</span>
      <span className={valueClass ?? "text-gray-900 font-medium"}>{value}</span>
    </div>
  );
}

function RankBox({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; value: number; percent: number }[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </div>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-700 line-clamp-1 flex-1 pr-2">{r.name}</span>
              <span className="text-gray-900 font-medium whitespace-nowrap">
                {formatVnd(r.value)} <span className="text-gray-400">({r.percent}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <div className="text-center py-6 text-xs text-gray-400">📭 Chưa có dữ liệu</div>;
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}
