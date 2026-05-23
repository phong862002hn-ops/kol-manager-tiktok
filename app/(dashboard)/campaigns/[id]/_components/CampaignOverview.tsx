"use client";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { formatNumber, formatVnd } from "@/lib/format";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { StaffFilter } from "@/components/shared/StaffFilter";
import { KpiCard } from "@/components/shared/KpiCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Sparkline } from "@/components/shared/Sparkline";
import { HorizontalBarChart } from "@/components/shared/HorizontalBarChart";
import { Progress } from "@/components/shared/Progress";
import { Avatar } from "@/components/shared/Avatar";
import { SemanticBadge } from "@/components/shared/SemanticBadge";

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
    <div>
      {/* Sticky filter bar */}
      <div className="sticky top-[57px] z-10 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
          <DateRangeFilter />
          <StaffFilter />
        </div>
      </div>

      <div className="px-6 py-5 space-y-7">
        {isLoading || !data ? (
          <SkeletonBlocks />
        ) : (
          <>
            {/* ── Hero: 2 big progress cards ───────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BigProgress
                label="KOC ĐÃ BOOKING"
                current={data.totalBookedKols}
                target={data.targetKocs}
                unit="KOC"
                color="hsl(var(--primary))"
              />
              <BigProgress
                label="VIDEO CÓ ĐƠN VỀ"
                current={data.totalVideosWithOrders}
                target={data.targetVideos}
                unit="Video"
                color="hsl(var(--warning))"
                slowIfBehind
              />
            </div>

            {/* ── KPI strip ────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Tìm kiếm KOC"
                value={formatNumber(data.searchedKocs)}
                sub="KOC scan trong khoảng đang chọn"
              />
              <KpiCard
                label="Tổng COD"
                value={formatVnd(data.totalCod)}
                sub={`trên ${formatNumber(data.approvedCount)} đơn duyệt`}
              />
              <KpiCard
                label="KOC đã duyệt"
                value={formatNumber(data.approvedCount)}
                sub="trong campaign này"
              />
              <KpiCard
                label="Doanh thu video"
                value={formatVnd(data.videoRevenue)}
                sub={`trên ${formatNumber(data.totalVideosWithOrders)} video có đơn`}
              />
            </div>

            {/* ── Tiến độ theo chiều ───────────────────────────── */}
            <section>
              <SectionHeader
                title="Tiến độ theo chiều"
                sub="Theo sản phẩm, nhân sự và nhóm KOC"
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <SubCard title="Theo sản phẩm">
                  <HorizontalBarChart
                    data={data.productProgress.slice(0, 6).map((p) => ({
                      name: p.name,
                      value: p.booked,
                      label: `${formatNumber(p.booked)} KOC`,
                    }))}
                  />
                </SubCard>
                <SubCard title="Theo nhân sự">
                  {data.staffProgress.length === 0 ? (
                    <Empty />
                  ) : (
                    <div>
                      {data.staffProgress.map((s, i, arr) => (
                        <div
                          key={s.staffId}
                          className={`flex items-center justify-between py-2 text-[13px] ${
                            i === arr.length - 1 ? "" : "border-b border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={s.name} size={22} />
                            <span className="text-foreground truncate">
                              {s.name}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums shrink-0 pl-2">
                            <span className="text-foreground font-medium">
                              {formatNumber(s.kocCount)}
                            </span>{" "}
                            KOC ·{" "}
                            <span className="text-foreground font-medium">
                              {formatNumber(s.videoCount)}
                            </span>{" "}
                            video
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SubCard>
                <SubCard title="Theo nhóm KOC">
                  <HorizontalBarChart
                    data={data.tagProgress.slice(0, 6).map((t) => ({
                      name: t.tag,
                      value: t.count,
                      label: `${formatNumber(t.count)} KOC`,
                    }))}
                  />
                </SubCard>
              </div>
            </section>

            {/* ── Chi phí cast / hàng mẫu ───────────────────────── */}
            <section>
              <SectionHeader
                title="Chi phí cast · hàng mẫu"
                sub="Tổng quan đầu tư cho từng KOC"
              />
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-7">
                  <StatColumn
                    label="KOC đã gửi mẫu"
                    value={formatNumber(data.sampleManagement.kocSent)}
                  />
                  <StatColumn
                    label="Tổng chi phí cast"
                    value={formatVnd(data.sampleManagement.totalCost)}
                    divider
                  />
                  <StatColumn
                    label="Đã thanh toán"
                    value={formatVnd(data.sampleManagement.paid)}
                    sub={pctOf(data.sampleManagement.paid, data.sampleManagement.totalCost)}
                    valueColor="text-success"
                    divider
                  />
                  <StatColumn
                    label="Chưa thanh toán"
                    value={formatVnd(data.sampleManagement.unpaid)}
                    sub={pctOf(data.sampleManagement.unpaid, data.sampleManagement.totalCost)}
                    valueColor="text-destructive"
                    divider
                  />
                </div>
              </div>
            </section>

            {/* ── Xu hướng theo thời gian ───────────────────────── */}
            <section>
              <SectionHeader
                title="Xu hướng theo thời gian"
                sub={`${data.kocSearchByDate.length} ngày gần nhất`}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <TrendCard
                  title="KOC tìm kiếm / ngày"
                  total={data.kocSearchByDate.reduce((a, b) => a + b.count, 0)}
                  data={data.kocSearchByDate.map((d) => d.count)}
                  color="hsl(var(--primary))"
                />
                <TrendCard
                  title="Video đăng / ngày"
                  total={data.videoByDate.reduce((a, b) => a + b.count, 0)}
                  data={data.videoByDate.map((d) => d.count)}
                  color="hsl(var(--success))"
                />
              </div>
            </section>

            {/* ── Phân tích doanh thu theo chiều ───────────────── */}
            <section>
              <SectionHeader
                title="Doanh thu theo chiều"
                sub="Top 5 mỗi nhóm"
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <RankCard
                  title="Theo nhóm KOC"
                  rows={data.revenueByTag.slice(0, 5).map((r) => ({
                    name: r.tag,
                    value: r.revenue,
                    percent: r.percent,
                  }))}
                />
                <RankCard
                  title="Theo sản phẩm"
                  rows={data.revenueByProduct.slice(0, 5).map((r) => ({
                    name: r.name,
                    value: r.revenue,
                    percent: r.percent,
                  }))}
                />
                <RankCard
                  title="Theo nhân sự"
                  rows={data.revenueByStaff.slice(0, 5).map((r) => ({
                    name: r.name,
                    value: r.revenue,
                    percent: r.percent,
                  }))}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function BigProgress({
  label,
  current,
  target,
  unit,
  color,
  slowIfBehind,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  slowIfBehind?: boolean;
}) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const remain = Math.max(0, target - current);
  const behind = slowIfBehind && pct < 30;
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
            {label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-semibold tabular-nums tracking-tight leading-none">
              {formatNumber(current)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {target > 0 ? formatNumber(target) : "—"} {unit}
            </span>
          </div>
        </div>
        {target > 0 && (
          <SemanticBadge
            variant={behind ? "warning" : current >= target ? "success" : "primary"}
            dot
          >
            {behind ? "Chậm tiến độ" : `${pct}% mục tiêu`}
          </SemanticBadge>
        )}
      </div>
      <Progress value={current} max={target || 1} color={color} />
      <div className="flex justify-between text-[11.5px] text-muted-foreground mt-2">
        <span>
          Còn lại{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatNumber(remain)} {unit}
          </span>
        </span>
        {target > 0 && (
          <span className="tabular-nums">{pct}% mục tiêu</span>
        )}
      </div>
    </div>
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
    <div
      className={`rounded-lg border border-border bg-card p-4 ${className}`}
    >
      <div className="text-[12.5px] font-semibold text-foreground mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function StatColumn({
  label,
  value,
  sub,
  valueColor,
  divider,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? "lg:border-l lg:border-border lg:pl-7" : ""}>
      <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-2">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold tabular-nums tracking-tight ${
          valueColor ?? "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11.5px] text-muted-foreground tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}

function TrendCard({
  title,
  total,
  data,
  color,
}: {
  title: string;
  total: number;
  data: number[];
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12.5px] font-semibold text-foreground">
          {title}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          tổng{" "}
          <span className="text-foreground font-medium">
            {formatNumber(total)}
          </span>
        </span>
      </div>
      <Sparkline data={data} color={color} height={100} showAxis={false} />
    </div>
  );
}

function RankCard({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; value: number; percent: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[12.5px] font-semibold text-foreground mb-3">
        {title}
      </div>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className="flex justify-between gap-2 text-xs"
            >
              <span className="text-foreground line-clamp-1 flex-1">
                {r.name}
              </span>
              <span className="text-foreground font-medium tabular-nums shrink-0">
                {formatVnd(r.value)}{" "}
                <span className="text-muted-foreground font-normal">
                  ({r.percent}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-center py-6 text-xs text-muted-foreground">
      Chưa có dữ liệu
    </div>
  );
}

function SkeletonBlocks() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-muted animate-pulse" />
    </div>
  );
}

function pctOf(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}
