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
import { toast } from "sonner";

type Product = {
  id: string;
  tiktokId: string;
  name: string;
  sku: string | null;
  note: string | null;
};

export function ProductFormDialog({
  campaignId,
  product,
  trigger,
}: {
  campaignId: string;
  product?: Product;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tiktokId, setTiktokId] = useState(product?.tiktokId ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [note, setNote] = useState(product?.note ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const isEdit = !!product;
    const url = isEdit ? `/api/products/${product.id}` : `/api/campaigns/${campaignId}/products`;
    const method = isEdit ? "PATCH" : "POST";
    const payload: Record<string, unknown> = {
      name,
      sku: sku || null,
      note: note || null,
    };
    if (!isEdit) payload.tiktokId = tiktokId;
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
    toast.success(isEdit ? "Đã cập nhật" : "Đã thêm sản phẩm");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tiktokId">ID sản phẩm TikTok *</Label>
            <Input
              id="tiktokId"
              value={tiktokId}
              onChange={(e) => setTiktokId(e.target.value)}
              required
              disabled={!!product}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Tên sản phẩm *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU nội bộ</Label>
            <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
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
              {loading ? "Đang lưu..." : product ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
