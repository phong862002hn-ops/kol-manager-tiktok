"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { formatNumber, formatVnd, formatDateTime, shortOrderId } from "@/lib/format";
import { isCancelledOrder } from "@/lib/constants";

type Row = {
  id: string;
  orderId: string;
  creatorUsername: string;
  contentType: string | null;
  productName: string;
  sku: string | null;
  paymentAmount: number;
  commissionPayment: number | null;
  orderStatus: string;
  createdTime: string | null;
};

export function OrderListClient({
  rows,
  kpi,
  page,
  totalPages,
  filter,
  campaignId,
}: {
  rows: Row[];
  kpi: { total: number; valid: number; revenue: number; commission: number };
  page: number;
  totalPages: number;
  filter: string;
  campaignId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function changeFilter(f: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("filter", f);
    sp.delete("page");
    router.push(`/campaigns/${campaignId}/orders?${sp.toString()}`);
  }
  function gotoPage(p: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    router.push(`/campaigns/${campaignId}/orders?${sp.toString()}`);
  }

  return (
    <div className="p-8">
      <div className="mb-4">
        <DateRangeFilter />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Tổng đơn" value={formatNumber(kpi.total)} />
        <Kpi label="Đơn hợp lệ" value={formatNumber(kpi.valid)} />
        <Kpi label="Doanh thu" value={formatVnd(kpi.revenue)} />
        <Kpi label="Hoa hồng" value={formatVnd(kpi.commission)} />
      </div>

      <div className="flex items-center gap-2 mb-3 text-sm">
        {[
          { v: "all", l: "Tất cả" },
          { v: "valid", l: "Hợp lệ" },
          { v: "cancelled", l: "Đã hủy" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => changeFilter(f.v)}
            className={`px-3 py-1.5 rounded border text-xs font-medium ${
              filter === f.v
                ? "bg-primary-soft border-primary/40 text-primary"
                : "bg-card border-border text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          Không có đơn nào. Hãy import file Excel TikTok Shop trước.
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 font-medium">ID đơn</th>
                  <th className="px-3 py-3 font-medium">KOL</th>
                  <th className="px-3 py-3 font-medium">Loại</th>
                  <th className="px-3 py-3 font-medium">Sản phẩm</th>
                  <th className="px-3 py-3 font-medium">SKU</th>
                  <th className="px-3 py-3 font-medium text-right">Giá trị</th>
                  <th className="px-3 py-3 font-medium text-right">Hoa hồng</th>
                  <th className="px-3 py-3 font-medium">Trạng thái</th>
                  <th className="px-3 py-3 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const cancelled = isCancelledOrder(r.orderStatus);
                  return (
                    <tr key={r.id} className={cancelled ? "text-muted-foreground/70" : ""}>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        ...{shortOrderId(r.orderId)}
                      </td>
                      <td className="px-3 py-2.5">@{r.creatorUsername}</td>
                      <td className="px-3 py-2.5 text-xs">{r.contentType ?? "—"}</td>
                      <td className="px-3 py-2.5 max-w-xs truncate" title={r.productName}>
                        {r.productName}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.sku ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        {formatVnd(r.paymentAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatVnd(r.commissionPayment ?? 0)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={r.orderStatus}
                          colorClass={
                            cancelled
                              ? "bg-destructive-soft text-destructive"
                              : "bg-muted text-foreground"
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {formatDateTime(r.createdTime)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-muted-foreground">
                Trang {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => gotoPage(page - 1)}
                >
                  ← Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => gotoPage(page + 1)}
                >
                  Sau →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold text-foreground mt-2">{value}</div>
    </div>
  );
}
