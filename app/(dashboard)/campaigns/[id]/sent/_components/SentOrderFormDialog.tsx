"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectLabelText } from "@/components/shared/SelectLabel";
import { ProductPickerDialog } from "./ProductPickerDialog";
import { SHIP_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export type KolOpt = { id: string; username: string };
export type ProductOpt = { id: string; tiktokId: string; name: string; sku: string | null };
export type UserOpt = { id: string; name: string };

export type SentOrderRow = {
  id: string;
  sentDate: string;
  kolUsername: string;
  channel: string;
  sampleType: string;
  tiktokOrderId: string | null;
  products: Array<{ productId: string; productName: string; quantity: number }>;
  staffId: string | null;
  status: string;
  trackingCode: string | null;
  note: string | null;
};

type ProductLine = { productId: string; productName: string; quantity: number };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function SentOrderFormDialog({
  campaignId,
  kols,
  products,
  users,
  order,
  trigger,
}: {
  campaignId: string;
  kols: KolOpt[];
  products: ProductOpt[];
  users: UserOpt[];
  order?: SentOrderRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sentDate, setSentDate] = useState(
    order?.sentDate ? order.sentDate.slice(0, 10) : todayISO()
  );
  const [kolUsername, setKolUsername] = useState(order?.kolUsername ?? "");
  const [staffId, setStaffId] = useState(order?.staffId ?? "");
  const [channel, setChannel] = useState(order?.channel ?? "TIKTOK");
  const [sampleType, setSampleType] = useState(order?.sampleType ?? "GIFT");
  const [tiktokOrderId, setTiktokOrderId] = useState(order?.tiktokOrderId ?? "");
  const [status, setStatus] = useState(order?.status ?? "NOT_SENT");
  const [trackingCode, setTrackingCode] = useState(order?.trackingCode ?? "");
  const [note, setNote] = useState(order?.note ?? "");
  const [lines, setLines] = useState<ProductLine[]>(
    order?.products && order.products.length > 0 ? order.products : []
  );

  function addPicked(items: ProductOpt[]) {
    const additions = items.map((p) => ({
      productId: p.tiktokId,
      productName: p.name,
      quantity: 1,
    }));
    setLines([...lines, ...additions]);
  }
  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }
  function updateQty(i: number, q: number) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, quantity: q } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kolUsername) {
      toast.error("Chọn KOL");
      return;
    }
    if (lines.length === 0) {
      toast.error("Chọn ít nhất 1 sản phẩm");
      return;
    }
    setLoading(true);
    const payload = {
      sentDate,
      kolUsername,
      channel,
      sampleType,
      tiktokOrderId: tiktokOrderId || null,
      products: lines,
      staffId: staffId || null,
      status,
      trackingCode: trackingCode || null,
      note: note || null,
    };
    const isEdit = !!order;
    const url = isEdit
      ? `/api/sent-orders/${order.id}`
      : `/api/campaigns/${campaignId}/sent-orders`;
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Có lỗi xảy ra");
      return;
    }
    toast.success(isEdit ? "Đã cập nhật" : "Đã tạo đơn gửi");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? "Sửa đơn gửi" : "Gửi đơn mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sentDate">Ngày gửi *</Label>
              <Input
                id="sentDate"
                type="date"
                value={sentDate}
                onChange={(e) => setSentDate(e.target.value)}
                onClick={(e) => {
                  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                  el.showPicker?.();
                }}
                required
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label>KOL *</Label>
              <Select value={kolUsername} onValueChange={(v) => v && setKolUsername(v)}>
                <SelectTrigger className="w-full">
                  <span data-slot="select-value" className="flex flex-1 text-left">
                    {kolUsername ? `@${kolUsername}` : <span className="text-gray-400">Chọn KOL trong campaign</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {kols.map((k) => (
                    <SelectItem key={k.id} value={k.username}>
                      @{k.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nhân sự phụ trách</Label>
              <Select value={staffId} onValueChange={(v) => v && setStaffId(v)}>
                <SelectTrigger className="w-full">
                  <span data-slot="select-value" className="flex flex-1 text-left">
                    {users.find((u) => u.id === staffId)?.name ?? (
                      <span className="text-gray-400">—</span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktokOrderId">Mã đơn TikTok</Label>
              <Input
                id="tiktokOrderId"
                value={tiktokOrderId}
                onChange={(e) => setTiktokOrderId(e.target.value)}
                placeholder="Nếu gửi qua TikTok"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block mb-2">Loại gửi đơn</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="channel"
                    checked={channel === "TIKTOK"}
                    onChange={() => setChannel("TIKTOK")}
                  />
                  Gửi đơn TikTok
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="channel"
                    checked={channel === "EXTERNAL"}
                    onChange={() => setChannel("EXTERNAL")}
                  />
                  Ngoài sàn
                </label>
              </div>
            </div>
            <div>
              <Label className="block mb-2">Hình thức mẫu</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sampleType"
                    checked={sampleType === "GIFT"}
                    onChange={() => setSampleType("GIFT")}
                  />
                  Tặng
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sampleType"
                    checked={sampleType === "LOAN"}
                    onChange={() => setSampleType("LOAN")}
                  />
                  Mượn
                </label>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Sản phẩm gửi *</Label>
              <ProductPickerDialog
                products={products}
                excludeIds={lines.map((l) => l.productId)}
                onAdd={addPicked}
                trigger={
                  <Button type="button" size="sm" variant="outline">
                    + Thêm sản phẩm
                  </Button>
                }
              />
            </div>
            {lines.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded p-3 text-center">
                Chưa có sản phẩm. Bấm &quot;+ Thêm sản phẩm&quot; để chọn.
              </div>
            ) : (
              <div className="border rounded-md divide-y">
                {lines.map((l, i) => {
                  const p = products.find((x) => x.tiktokId === l.productId);
                  return (
                    <div key={l.productId} className="flex gap-2 items-center p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 line-clamp-1">
                          {p?.name ?? l.productName}
                        </div>
                        {p?.sku && (
                          <div className="text-xs text-gray-500">{p.sku}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`qty-${i}`} className="text-xs text-gray-500">
                          SL
                        </Label>
                        <Input
                          id={`qty-${i}`}
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => updateQty(i, parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(i)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Trạng thái giao</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectLabelText value={status} labels={SHIP_STATUS_LABELS} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_SENT">Chưa gửi</SelectItem>
                  <SelectItem value="SHIPPING">Đang giao</SelectItem>
                  <SelectItem value="DELIVERED">Đã nhận</SelectItem>
                  <SelectItem value="RETURNED">Hoàn về</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingCode">Mã vận đơn</Label>
              <Input
                id="trackingCode"
                value={trackingCode}
                onChange={(e) => {
                  const next = e.target.value;
                  setTrackingCode(next);
                  // Nhập mã vận đơn khi đang "Chưa gửi" → tự chuyển "Đang giao"
                  if (next.trim() && status === "NOT_SENT") {
                    setStatus("SHIPPING");
                  }
                }}
              />
              {trackingCode.trim() && status === "SHIPPING" && (
                <p className="text-xs text-gray-500">
                  Tự đổi trạng thái sang &quot;Đang giao&quot; vì đã có mã vận đơn.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : order ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
