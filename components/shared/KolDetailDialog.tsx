"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fetcher } from "@/lib/fetcher";
import {
  KOL_STATUS_LABELS,
  KOL_STATUS_COLORS,
  CAST_STATUS_LABELS,
  CAST_STATUS_COLORS,
  COST_TYPE_LABELS,
  isCancelledOrder,
} from "@/lib/constants";
import { formatVnd, formatNumber, formatDate, formatDateTime, shortOrderId } from "@/lib/format";
import { toast } from "sonner";

type Detail = {
  id: string;
  username: string;
  tag: string | null;
  status: string;
  zalo: string | null;
  email: string | null;
  facebook: string | null;
  ig: string | null;
  note: string | null;
  createdAt: string;
  campaign: { id: string; name: string };
  staff: { id: string; name: string; email: string } | null;
  profile: {
    followerCount: number | null;
    malePercent: number | null;
    note: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  } | null;
  cast: {
    id: string;
    amount: number;
    costType: string;
    status: string;
    paidAmount: number;
    note: string | null;
    proposedBy: string;
    proposedAt: string;
    approvedBy: string | null;
    approvedAt: string | null;
    rejectReason: string | null;
  } | null;
  stats: {
    totalOrders: number;
    validOrders: number;
    revenue: number;
    commission: number;
    actualCommission: number;
    castApproved: number;
    profit: number;
    videoCount: number;
  };
  videos: {
    contentId: string;
    orders: number;
    gmv: number;
    commission: number;
    url: string | null;
  }[];
  recentOrders: {
    id: string;
    orderId: string;
    productName: string;
    contentType: string | null;
    paymentAmount: number;
    commissionPayment: number | null;
    orderStatus: string;
    createdTime: string | null;
  }[];
};

export function KolDetailDialog({
  campaignKolId,
  open,
  onOpenChange,
}: {
  campaignKolId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data, isLoading } = useSWR<Detail>(
    open && campaignKolId ? `/api/kols/${campaignKolId}/detail` : null,
    fetcher
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data ? `@${data.username}` : "Đang tải..."}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Đang tải...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header chips */}
            <div className="flex flex-wrap gap-2 items-center">
              <StatusBadge
                label={KOL_STATUS_LABELS[data.status]}
                colorClass={KOL_STATUS_COLORS[data.status]}
              />
              {data.tag && (
                <StatusBadge label={data.tag} colorClass="bg-blue-100 text-blue-700" />
              )}
              <Link
                href={`/campaigns/${data.campaign.id}`}
                className="text-xs text-blue-600 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {data.campaign.name}
              </Link>
              <span className="text-xs text-gray-400">
                Thêm vào {formatDate(data.createdAt)}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Đơn hợp lệ" value={formatNumber(data.stats.validOrders)} sub={`${data.stats.totalOrders} tổng`} />
              <Kpi label="Video ra đơn" value={formatNumber(data.stats.videoCount)} />
              <Kpi
                label="Doanh thu"
                value={formatVnd(data.stats.revenue)}
                sub={`HH ƯT ${formatVnd(data.stats.commission)}${data.stats.actualCommission > 0 ? ` · TT ${formatVnd(data.stats.actualCommission)}` : ""}`}
              />
              <Kpi
                label="Lợi nhuận"
                value={formatVnd(data.stats.profit)}
                sub={data.stats.castApproved > 0 ? `− Cast ${formatVnd(data.stats.castApproved)}` : undefined}
                valueClass={data.stats.profit >= 0 ? "text-green-700" : "text-red-700"}
              />
            </div>

            {/* Profile TikTok (cross-campaign) */}
            <Section title="Profile TikTok">
              <ProfileEditor username={data.username} initial={data.profile} />
            </Section>

            {/* Liên hệ + nhân sự */}
            <Section title="Liên hệ & phụ trách">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <Field label="Nhân sự phụ trách" value={data.staff?.name ?? null} />
                <Field label="Zalo" value={data.zalo} />
                <Field label="Email" value={data.email} />
                <Field label="Facebook" value={data.facebook} />
                <Field label="Instagram" value={data.ig} />
              </div>
              {data.note && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-2">
                  {data.note}
                </div>
              )}
            </Section>

            {/* Cast info */}
            {data.cast && (
              <Section title="Chi phí cast">
                <div className="bg-white border border-gray-200 rounded p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số tiền</span>
                    <span className="font-semibold">{formatVnd(data.cast.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loại</span>
                    <span>{COST_TYPE_LABELS[data.cast.costType]}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Trạng thái</span>
                    <StatusBadge
                      label={CAST_STATUS_LABELS[data.cast.status]}
                      colorClass={CAST_STATUS_COLORS[data.cast.status]}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Đã thanh toán</span>
                    <span>{formatVnd(data.cast.paidAmount)}</span>
                  </div>
                  <div className="border-t pt-2 text-xs text-gray-500">
                    Đề xuất bởi <span className="font-medium text-gray-700">{data.cast.proposedBy}</span> · {formatDateTime(data.cast.proposedAt)}
                  </div>
                  {data.cast.approvedBy && (
                    <div className="text-xs text-gray-500">
                      Xử lý bởi <span className="font-medium text-gray-700">{data.cast.approvedBy}</span>
                      {data.cast.approvedAt ? ` · ${formatDateTime(data.cast.approvedAt)}` : ""}
                    </div>
                  )}
                  {data.cast.rejectReason && (
                    <div className="text-xs text-red-600">Lý do: {data.cast.rejectReason}</div>
                  )}
                  {data.cast.note && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                      Ghi chú: {data.cast.note}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Videos */}
            {data.videos.length > 0 && (
              <Section title={`Video (${data.videos.length})`}>
                <div className="border rounded overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                        <th className="px-3 py-2 font-medium">Video ID</th>
                        <th className="px-3 py-2 font-medium text-right">Đơn</th>
                        <th className="px-3 py-2 font-medium text-right">GMV</th>
                        <th className="px-3 py-2 font-medium text-right">HH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.videos.map((v) => (
                        <tr key={v.contentId} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">
                            {v.url ? (
                              <a
                                href={v.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {v.contentId.slice(-12)} ↗
                              </a>
                            ) : (
                              <span className="text-gray-600">{v.contentId.slice(-12)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{formatNumber(v.orders)}</td>
                          <td className="px-3 py-2 text-right">{formatVnd(v.gmv)}</td>
                          <td className="px-3 py-2 text-right">{formatVnd(v.commission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* Recent orders */}
            {data.recentOrders.length > 0 && (
              <Section title={`Đơn gần đây (${data.recentOrders.length})`}>
                <div className="border rounded overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                        <th className="px-3 py-2 font-medium">ID</th>
                        <th className="px-3 py-2 font-medium">Sản phẩm</th>
                        <th className="px-3 py-2 font-medium text-right">Giá trị</th>
                        <th className="px-3 py-2 font-medium">Trạng thái</th>
                        <th className="px-3 py-2 font-medium">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.recentOrders.map((o) => {
                        const cancelled = isCancelledOrder(o.orderStatus);
                        return (
                          <tr
                            key={o.id}
                            className={`hover:bg-gray-50 ${cancelled ? "text-gray-400" : ""}`}
                          >
                            <td className="px-3 py-2 font-mono text-xs">
                              ...{shortOrderId(o.orderId)}
                            </td>
                            <td className="px-3 py-2 max-w-xs truncate" title={o.productName}>
                              {o.productName}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatVnd(o.paymentAmount)}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge
                                label={o.orderStatus}
                                colorClass={
                                  cancelled ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                                }
                              />
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {formatDateTime(o.createdTime)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Kpi({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded p-3">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${valueClass ?? "text-gray-900"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "—"}</div>
    </div>
  );
}

function ProfileEditor({
  username,
  initial,
}: {
  username: string;
  initial: {
    followerCount: number | null;
    malePercent: number | null;
    note: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  } | null;
}) {
  const [editing, setEditing] = useState(false);
  const [followers, setFollowers] = useState(
    initial?.followerCount?.toString() ?? ""
  );
  const [male, setMale] = useState(initial?.malePercent?.toString() ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(initial);

  async function handleSave() {
    setSaving(true);
    const malePct = male === "" ? null : Math.min(100, Math.max(0, parseFloat(male)));
    const res = await fetch(
      `/api/kol-profiles/${encodeURIComponent(username.toLowerCase())}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerCount: followers === "" ? null : parseInt(followers) || 0,
          malePercent: malePct,
          note: note || null,
        }),
      }
    );
    setSaving(false);
    if (!res.ok) {
      toast.error("Lưu thất bại");
      return;
    }
    const updated = await res.json();
    setData({
      followerCount: updated.followerCount,
      malePercent: updated.malePercent,
      note: updated.note,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    });
    setEditing(false);
    toast.success("Đã lưu profile");
  }

  const femalePct =
    data?.malePercent != null ? Math.max(0, 100 - data.malePercent) : null;

  if (!editing) {
    return (
      <div className="bg-white border border-gray-200 rounded p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Followers</div>
            <div className="text-lg font-semibold text-gray-900">
              {data?.followerCount != null
                ? formatNumber(data.followerCount)
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Tỉ lệ giới tính follower</div>
            {data?.malePercent != null ? (
              <div className="mt-1">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="text-blue-600 font-semibold">
                    ♂ {data.malePercent.toFixed(0)}%
                  </span>
                  <span className="text-pink-600 font-semibold">
                    ♀ {femalePct!.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full overflow-hidden bg-pink-200 flex">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${data.malePercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">—</div>
            )}
          </div>
        </div>
        {data?.note && (
          <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
            {data.note}
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="text-[11px] text-gray-400">
            {data?.updatedAt
              ? `Cập nhật ${formatDateTime(data.updatedAt)} bởi ${data.updatedBy ?? "—"}`
              : "Chưa có dữ liệu — bấm sửa để nhập"}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Sửa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="followers" className="text-xs">
            Số lượng follower
          </Label>
          <Input
            id="followers"
            type="number"
            min="0"
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            placeholder="VD: 25000"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="male" className="text-xs">
            % follower nam (0-100)
          </Label>
          <Input
            id="male"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={male}
            onChange={(e) => setMale(e.target.value)}
            placeholder="VD: 35"
          />
          {male !== "" && (
            <div className="text-[11px] text-gray-500">
              Nữ tự suy ra = {(100 - parseFloat(male || "0")).toFixed(0)}%
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="profile-note" className="text-xs">
          Ghi chú
        </Label>
        <Input
          id="profile-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Khác biệt, đặc điểm, kênh chính..."
        />
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t">
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
          Hủy
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </div>
  );
}
