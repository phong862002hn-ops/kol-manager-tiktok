"use client";
import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetcher } from "@/lib/fetcher";
import { formatNumber } from "@/lib/format";
import { toast } from "sonner";

type Suggestion = {
  tiktokId: string;
  name: string;
  sku: string | null;
  orderCount: number;
};

export function ProductSuggestDialog({
  campaignId,
  trigger,
}: {
  campaignId: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useSWR<Suggestion[]>(
    open ? `/api/campaigns/${campaignId}/products/suggest` : null,
    fetcher
  );

  function toggle(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSubmitting(true);
    const items = (data ?? []).filter((s) => selected.has(s.tiktokId));
    let success = 0;
    for (const item of items) {
      const res = await fetch(`/api/campaigns/${campaignId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiktokId: item.tiktokId,
          name: item.name,
          sku: item.sku,
        }),
      });
      if (res.ok) success += 1;
    }
    setSubmitting(false);
    toast.success(`Đã thêm ${success}/${items.length} sản phẩm`);
    setSelected(new Set());
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gợi ý sản phẩm từ Excel</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-gray-500">
          Các sản phẩm KOL trong campaign này đã từng bán nhưng chưa có trong campaign.
        </div>
        <div className="flex-1 overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Đang tải...</div>
          ) : !data || data.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Không có gợi ý mới.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 w-10"></th>
                  <th className="px-3 py-2 font-medium">Tên</th>
                  <th className="px-3 py-2 font-medium">ID TikTok</th>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium text-right">Số đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((s) => (
                  <tr
                    key={s.tiktokId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggle(s.tiktokId)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(s.tiktokId)}
                        onChange={() => toggle(s.tiktokId)}
                      />
                    </td>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">
                      {s.tiktokId}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{s.sku ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(s.orderCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DialogFooter>
          <div className="flex-1 text-sm text-gray-500 self-center">
            Đã chọn {selected.size}
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button onClick={handleAdd} disabled={submitting || selected.size === 0}>
            {submitting ? "Đang thêm..." : `Thêm ${selected.size} sản phẩm`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
