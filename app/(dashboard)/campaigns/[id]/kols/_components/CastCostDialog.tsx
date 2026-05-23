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
import { COST_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";

type ExistingCast = {
  id: string;
  amount: number;
  costType: string;
  status: string;
  paidAmount: number;
  note: string | null;
  rejectReason?: string | null;
};

export function CastCostDialog({
  campaignKolId,
  kolUsername,
  existing,
  trigger,
}: {
  campaignKolId: string;
  kolUsername: string;
  existing: ExistingCast | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState(String(existing?.amount ?? ""));
  const [costType, setCostType] = useState(existing?.costType ?? "PER_VIDEO");
  const [note, setNote] = useState(existing?.note ?? "");
  const [paidAmount, setPaidAmount] = useState(String(existing?.paidAmount ?? 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let res: Response;
    if (existing) {
      res = await fetch(`/api/cast-costs/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(amount) || 0,
          costType,
          note: note || null,
          paidAmount: parseInt(paidAmount) || 0,
        }),
      });
    } else {
      res = await fetch("/api/cast-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignKolId,
          amount: parseInt(amount) || 0,
          costType,
          note: note || null,
        }),
      });
    }

    setLoading(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Có lỗi xảy ra");
      return;
    }
    toast.success(existing ? "Đã cập nhật" : "Đã đề xuất cast");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirm("Xóa đề xuất cast này?")) return;
    setLoading(true);
    const res = await fetch(`/api/cast-costs/${existing.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Xóa thất bại");
      return;
    }
    toast.success("Đã xóa");
    setOpen(false);
    router.refresh();
  }

  const willResetStatus =
    existing &&
    existing.status !== "PENDING" &&
    (parseInt(amount) !== existing.amount || costType !== existing.costType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Sửa cast" : "Đề xuất cast"} cho @{kolUsername}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {existing?.status === "REJECTED" && existing.rejectReason && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">
                ⚠ Đề xuất trước bị từ chối
              </div>
              <div className="text-sm text-red-900 whitespace-pre-wrap">
                {existing.rejectReason}
              </div>
              <div className="text-[11px] text-red-700 mt-2">
                Sửa số tiền hoặc loại → tự reset về &quot;Chờ duyệt&quot; để Manager xem lại.
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền (VND) *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Loại</Label>
            <Select value={costType} onValueChange={(v) => v && setCostType(v)}>
              <SelectTrigger className="w-full">
                <SelectLabelText value={costType} labels={COST_TYPE_LABELS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PER_VIDEO">Mỗi video</SelectItem>
                <SelectItem value="LUMP_SUM">Cả campaign</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {existing && (
            <div className="space-y-2">
              <Label htmlFor="paidAmount">Đã thanh toán (VND)</Label>
              <Input
                id="paidAmount"
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Tracking riêng — không ảnh hưởng tính lợi nhuận.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {willResetStatus && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
              Sửa số tiền hoặc loại sẽ reset trạng thái về &quot;Chờ duyệt&quot;.
            </div>
          )}
          <DialogFooter className="gap-2 flex-row justify-between sm:justify-between">
            <div>
              {existing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  Xóa
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Đang lưu..." : existing ? "Cập nhật" : "Đề xuất"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
