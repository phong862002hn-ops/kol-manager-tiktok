"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductFormDialog } from "./ProductFormDialog";
import { ProductSuggestDialog } from "./ProductSuggestDialog";
import { formatNumber, formatVnd } from "@/lib/format";
import { toast } from "sonner";

type Row = {
  id: string;
  tiktokId: string;
  name: string;
  sku: string | null;
  note: string | null;
  kolCount: number;
  orders: number;
  revenue: number;
};

export function ProductListClient({
  campaignId,
  rows,
}: {
  campaignId: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDelete(row: Row) {
    if (!confirm(`Xóa sản phẩm "${row.name}"?`)) return;
    setBusy(row.id);
    const res = await fetch(`/api/products/${row.id}`, { method: "DELETE" });
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
        <div className="text-sm text-muted-foreground">{rows.length} sản phẩm</div>
        <div className="flex gap-2">
          <ProductSuggestDialog
            campaignId={campaignId}
            trigger={<Button variant="outline">Gợi ý từ Excel</Button>}
          />
          <ProductFormDialog
            campaignId={campaignId}
            trigger={<Button>+ Thêm sản phẩm</Button>}
          />
          <Button variant="outline" disabled title="Sẽ tích hợp ở Phase 5">
            Pull từ kho
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          Chưa có sản phẩm. Bấm &quot;+ Thêm sản phẩm&quot; hoặc &quot;Gợi ý từ Excel&quot;.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Sản phẩm</th>
                <th className="px-4 py-3 font-medium">ID TikTok</th>
                <th className="px-4 py-3 font-medium">SKU nội bộ</th>
                <th className="px-4 py-3 font-medium text-right">KOL bán</th>
                <th className="px-4 py-3 font-medium text-right">Đơn</th>
                <th className="px-4 py-3 font-medium text-right">Doanh thu</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.name}</div>
                    {r.note && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {r.note}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {r.tiktokId}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.sku ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {formatNumber(r.kolCount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatNumber(r.orders)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatVnd(r.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <ProductFormDialog
                      campaignId={campaignId}
                      product={r}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Sửa
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(r)}
                      disabled={busy === r.id}
                      className="text-destructive hover:text-destructive"
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
