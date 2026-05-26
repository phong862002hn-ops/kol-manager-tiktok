"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

type Row = {
  videoId: string;
  kolUsername: string;
  campaignId: string;
  campaignName: string;
  version: number;
  driveUrl: string;
  submittedAt: string;
  submittedByName: string;
};

export function VideosPendingClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const [approving, setApproving] = useState(false);

  async function handleApprove() {
    if (!reviewing) return;
    setApproving(true);
    const res = await fetch(`/api/videos/${reviewing.videoId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    setApproving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Duyệt thất bại");
      return;
    }
    toast.success(`Đã duyệt video @${reviewing.kolUsername}`);
    setReviewing(null);
    router.refresh();
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Video cần duyệt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Danh sách demo Booking Staff đã gửi, chờ Quản lý Shop duyệt.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          Không có video nào đang chờ duyệt.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3 font-medium w-12">#</th>
                <th className="px-3 py-3 font-medium">KOL</th>
                <th className="px-3 py-3 font-medium">Chiến dịch</th>
                <th className="px-3 py-3 font-medium">Version</th>
                <th className="px-3 py-3 font-medium">Submit lúc</th>
                <th className="px-3 py-3 font-medium">Người submit</th>
                <th className="px-3 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.videoId} className="hover:bg-muted/60">
                  <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5">@{r.kolUsername}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/campaigns/${r.campaignId}/videos`}
                      className="text-primary hover:underline"
                    >
                      {r.campaignName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs">v{r.version}</td>
                  <td className="px-3 py-2.5 text-xs">{formatDateTime(r.submittedAt)}</td>
                  <td className="px-3 py-2.5 text-xs">{r.submittedByName}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" onClick={() => setReviewing(r)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Duyệt video demo</DialogTitle>
          </DialogHeader>
          {reviewing ? (
            <div className="space-y-3 text-sm">
              <Row label="KOL">@{reviewing.kolUsername}</Row>
              <Row label="Chiến dịch">{reviewing.campaignName}</Row>
              <Row label="Version">v{reviewing.version}</Row>
              <Row label="Người submit">{reviewing.submittedByName}</Row>
              <Row label="Submit lúc">{formatDateTime(reviewing.submittedAt)}</Row>
              <Row label="Link demo">
                <a
                  href={reviewing.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {reviewing.driveUrl} ↗
                </a>
              </Row>
              <div className="rounded border border-dashed border-border p-4 text-xs text-muted-foreground">
                Xem video trên Drive ở tab mới, sau đó quay lại đây để duyệt.
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled
              title="Tính năng sắp có (Slice 2)"
            >
              Yêu cầu sửa
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? "Đang duyệt..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-28 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
