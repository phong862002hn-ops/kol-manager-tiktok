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

type Tag = { id: string; name: string; color: string; kolCount: number };

// Palette gợi ý
const COLORS = [
  "#2563eb", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#6366f1", "#94a3b8",
];

export function TagsClient({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDelete(t: Tag) {
    if (!confirm(`Xoá tag "${t.name}"? ${t.kolCount} KOL đang gắn sẽ bị gỡ.`))
      return;
    setBusy(t.id);
    const res = await fetch(`/api/tags/${t.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      toast.error("Xoá thất bại");
      return;
    }
    toast.success("Đã xoá");
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Quản lý Tag</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {tags.length} tag — dùng để phân loại KOL (VIP, Affiliate, Livestream...)
          </p>
        </div>
        <TagFormDialog trigger={<Button>+ Thêm tag</Button>} />
      </div>

      {tags.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          Chưa có tag nào. Bấm &quot;+ Thêm tag&quot; để tạo.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tag</th>
                <th className="px-4 py-3 font-medium">Màu</th>
                <th className="px-4 py-3 font-medium text-right">Số KOL gắn</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tags.map((t) => (
                <tr key={t.id} className="hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {t.color}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {t.kolCount}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <TagFormDialog
                      tag={t}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Sửa
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t)}
                      disabled={busy === t.id}
                      className="text-destructive hover:text-destructive"
                    >
                      Xoá
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

function TagFormDialog({
  tag,
  trigger,
}: {
  tag?: Tag;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? COLORS[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const isEdit = !!tag;
    const res = await fetch(isEdit ? `/api/tags/${tag.id}` : "/api/tags", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    setLoading(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Có lỗi xảy ra");
      return;
    }
    toast.success(isEdit ? "Đã cập nhật" : "Đã thêm tag");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tag ? `Sửa tag "${tag.name}"` : "Thêm tag mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên tag *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="VD: KOL doanh số cao"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label>Màu</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    color === c
                      ? "border-foreground ring-2 ring-offset-1 ring-ring"
                      : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Preview:{" "}
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {name || "Tên tag"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : tag ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
