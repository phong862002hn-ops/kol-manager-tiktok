"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SentOrderFormDialog, type SentOrderRow, type KolOpt, type ProductOpt, type UserOpt } from "./SentOrderFormDialog";
import {
  SAMPLE_TYPE_LABELS,
  SENT_CHANNEL_LABELS,
  SHIP_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { toast } from "sonner";

const SHIP_STATUS_COLORS: Record<string, string> = {
  NOT_SENT: "bg-gray-100 text-gray-700",
  SHIPPING: "bg-yellow-100 text-yellow-700",
  DELIVERED: "bg-green-100 text-green-700",
  RETURNED: "bg-red-100 text-red-700",
};

export function SentOrderListClient({
  campaignId,
  kols,
  products,
  users,
  orders,
}: {
  campaignId: string;
  kols: KolOpt[];
  products: ProductOpt[];
  users: UserOpt[];
  orders: (SentOrderRow & { staffName: string | null })[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDelete(o: SentOrderRow) {
    if (!confirm(`Xóa đơn gửi cho @${o.kolUsername}?`)) return;
    setBusy(o.id);
    const res = await fetch(`/api/sent-orders/${o.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      toast.error("Xóa thất bại");
      return;
    }
    toast.success("Đã xóa");
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">{orders.length} đơn gửi</div>
        <SentOrderFormDialog
          campaignId={campaignId}
          kols={kols}
          products={products}
          users={users}
          trigger={<Button>+ Gửi đơn mới</Button>}
        />
      </div>

      {kols.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4">
          Chưa có KOL trong campaign. Vào tab &quot;KOL&quot; để thêm trước.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          Chưa có đơn gửi mẫu nào.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-3 font-medium">Ngày</th>
                <th className="px-3 py-3 font-medium">KOL</th>
                <th className="px-3 py-3 font-medium">Kênh</th>
                <th className="px-3 py-3 font-medium">Hình thức</th>
                <th className="px-3 py-3 font-medium">Mã đơn TikTok</th>
                <th className="px-3 py-3 font-medium">Sản phẩm</th>
                <th className="px-3 py-3 font-medium">Nhân sự</th>
                <th className="px-3 py-3 font-medium">Mã vận đơn</th>
                <th className="px-3 py-3 font-medium">Trạng thái</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-xs">{formatDate(o.sentDate)}</td>
                  <td className="px-3 py-2.5 font-medium">@{o.kolUsername}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {SENT_CHANNEL_LABELS[o.channel]}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {SAMPLE_TYPE_LABELS[o.sampleType]}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                    {o.tiktokOrderId ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {o.products.length === 0 ? (
                      "—"
                    ) : (
                      <div className="space-y-0.5">
                        {o.products.slice(0, 2).map((p, i) => (
                          <div key={i}>
                            {p.productName}{" "}
                            <span className="text-gray-400">×{formatNumber(p.quantity)}</span>
                          </div>
                        ))}
                        {o.products.length > 2 && (
                          <div className="text-gray-400">
                            +{o.products.length - 2} khác
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    {o.staffName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {o.trackingCode ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge
                      label={SHIP_STATUS_LABELS[o.status]}
                      colorClass={SHIP_STATUS_COLORS[o.status]}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <SentOrderFormDialog
                      campaignId={campaignId}
                      kols={kols}
                      products={products}
                      users={users}
                      order={o}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Sửa
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(o)}
                      disabled={busy === o.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
