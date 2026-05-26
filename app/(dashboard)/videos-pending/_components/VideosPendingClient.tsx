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
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { CommentThread } from "@/components/video/CommentThread";
import { SubmissionHistoryAccordion } from "@/components/video/SubmissionHistoryAccordion";

type Row = {
  videoId: string;
  currentSubmissionId: string;
  kolUsername: string;
  campaignId: string;
  campaignName: string;
  version: number;
  driveUrl: string;
  submittedAt: string;
  submittedByName: string;
};

type Mode = null | "review" | "revision";

export function VideosPendingClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");

  function openReview(r: Row) {
    setReviewing(r);
    setMode("review");
    setRevisionComment("");
  }

  function close() {
    setReviewing(null);
    setMode(null);
    setRevisionComment("");
  }

  async function handleApprove() {
    if (!reviewing) return;
    setBusy(true);
    const res = await fetch(`/api/videos/${reviewing.videoId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Duyệt thất bại");
      return;
    }
    toast.success(`Đã duyệt video @${reviewing.kolUsername}`);
    close();
    router.refresh();
  }

  async function handleRequestRevision() {
    if (!reviewing) return;
    const comment = revisionComment.trim();
    setBusy(true);
    const res = await fetch(`/api/videos/${reviewing.videoId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "REQUEST_REVISION",
        ...(comment ? { comment } : {}),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Gửi yêu cầu sửa thất bại");
      return;
    }
    toast.success(`Đã yêu cầu @${reviewing.kolUsername} sửa demo`);
    close();
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
                    <Button size="sm" onClick={() => openReview(r)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "revision" ? "Yêu cầu sửa demo" : "Duyệt video demo"}
            </DialogTitle>
          </DialogHeader>
          {reviewing ? (
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <InfoRow label="KOL">@{reviewing.kolUsername}</InfoRow>
                <InfoRow label="Chiến dịch">{reviewing.campaignName}</InfoRow>
                <InfoRow label="Version">v{reviewing.version}</InfoRow>
                <InfoRow label="Người submit">{reviewing.submittedByName}</InfoRow>
                <InfoRow label="Submit lúc">{formatDateTime(reviewing.submittedAt)}</InfoRow>
                <InfoRow label="Link demo">
                  <a
                    href={reviewing.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {reviewing.driveUrl} ↗
                  </a>
                </InfoRow>
              </div>

              {mode === "review" ? (
                <>
                  <div className="border-t border-border pt-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Bình luận
                    </div>
                    <CommentThread
                      submissionId={reviewing.currentSubmissionId}
                      canPost
                    />
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Lịch sử version
                    </div>
                    <SubmissionHistoryAccordion
                      videoId={reviewing.videoId}
                      excludeSubmissionId={reviewing.currentSubmissionId}
                    />
                  </div>
                </>
              ) : (
                <div className="border-t border-border pt-3 space-y-2">
                  <Label htmlFor="revisionComment">
                    Lý do yêu cầu sửa (sẽ lưu thành comment)
                  </Label>
                  <textarea
                    id="revisionComment"
                    value={revisionComment}
                    onChange={(e) => setRevisionComment(e.target.value)}
                    placeholder="Ví dụ: thiếu shot mở hộp, ánh sáng yếu, chốt sai giá..."
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Comment optional. Có thể bỏ trống nếu chỉ muốn đánh dấu cần sửa.
                  </p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            {mode === "review" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setMode("revision")}
                  disabled={busy}
                >
                  Yêu cầu sửa
                </Button>
                <Button onClick={handleApprove} disabled={busy}>
                  {busy ? "Đang duyệt..." : "Approve"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setMode("review")}
                  disabled={busy}
                >
                  Quay lại
                </Button>
                <Button onClick={handleRequestRevision} disabled={busy}>
                  {busy ? "Đang gửi..." : "Gửi yêu cầu sửa"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-28 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
