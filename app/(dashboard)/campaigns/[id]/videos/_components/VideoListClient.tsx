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
} from "@/components/ui/dialog";
import { formatNumber, formatVnd } from "@/lib/format";
import { toast } from "sonner";

type Row = {
  contentId: string;
  username: string;
  contentType: string | null;
  totalOrders: number;
  validOrders: number;
  gmv: number;
  commission: number;
  url: string | null;
  note: string | null;
};

export function VideoListClient({
  rows,
  kpi,
}: {
  rows: Row[];
  kpi: { count: number; gmv: number; avgGmv: number };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit(r: Row) {
    setEditing(r);
    setUrl(r.url ?? "");
    setNote(r.note ?? "");
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/video-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: editing.contentId, url, note: note || null }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Lưu thất bại");
      return;
    }
    toast.success("Đã lưu");
    setEditing(null);
    router.refresh();
  }

  function copyContentId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Đã copy ID");
  }

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Kpi label="Tổng video" value={formatNumber(kpi.count)} />
        <Kpi label="Tổng GMV" value={formatVnd(kpi.gmv)} />
        <Kpi label="GMV TB/video" value={formatVnd(kpi.avgGmv)} />
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          Chưa có video. Import file Excel để bắt đầu.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3 font-medium w-12">#</th>
                <th className="px-3 py-3 font-medium">Video ID</th>
                <th className="px-3 py-3 font-medium">KOL</th>
                <th className="px-3 py-3 font-medium">Loại</th>
                <th className="px-3 py-3 font-medium text-right">Đơn</th>
                <th className="px-3 py-3 font-medium text-right">GMV</th>
                <th className="px-3 py-3 font-medium text-right">Hoa hồng</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.contentId} className="hover:bg-muted/60">
                  <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => copyContentId(r.contentId)}
                      className="font-mono text-xs text-foreground hover:text-primary"
                      title="Click để copy"
                    >
                      {r.contentId.slice(-12)}
                    </button>
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs text-primary hover:underline"
                      >
                        Mở ↗
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">@{r.username}</td>
                  <td className="px-3 py-2.5 text-xs">{r.contentType ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    {r.validOrders}
                    {r.totalOrders !== r.validOrders && (
                      <span className="text-muted-foreground/70">/{r.totalOrders}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {formatVnd(r.gmv)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{formatVnd(r.commission)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      {r.url ? "Sửa link" : "Thêm link"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link video TikTok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Video ID: <span className="font-mono">{editing?.contentId}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL TikTok</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving || !url}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
