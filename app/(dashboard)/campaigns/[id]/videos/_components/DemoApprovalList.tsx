"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  VideoStatusBadge,
  type VideoDemoStatus,
} from "@/components/video/VideoStatusBadge";
import { VideoDemoSubmitDialog } from "@/components/video/VideoDemoSubmitDialog";
import { CommentThread } from "@/components/video/CommentThread";
import { SubmissionHistoryAccordion } from "@/components/video/SubmissionHistoryAccordion";
import { formatDateTime } from "@/lib/format";

export type DemoRow = {
  campaignKolId: string;
  username: string;
  demoStatus: VideoDemoStatus;
  videoId: string | null;
  currentSubmission: {
    id: string;
    version: number;
    driveUrl: string;
    submittedAt: string;
  } | null;
};

const FILTER_OPTIONS: { value: VideoDemoStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "NOT_SUBMITTED", label: "Chưa có demo" },
  { value: "DEMO_PENDING", label: "Chờ duyệt" },
  { value: "NEEDS_REVISION", label: "Cần sửa" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "PUBLISHED", label: "Đã đăng" },
];

export function DemoApprovalList({ rows }: { rows: DemoRow[] }) {
  const [submitFor, setSubmitFor] = useState<DemoRow | null>(null);
  const [detailFor, setDetailFor] = useState<DemoRow | null>(null);
  const [filter, setFilter] = useState<VideoDemoStatus | "ALL">("ALL");

  // Count theo status để hiển thị bên cạnh button filter
  const counts = useMemo(() => {
    const acc: Record<string, number> = { ALL: rows.length };
    for (const r of rows) acc[r.demoStatus] = (acc[r.demoStatus] ?? 0) + 1;
    return acc;
  }, [rows]);

  const filteredRows = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((r) => r.demoStatus === filter)),
    [rows, filter]
  );

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
        Chưa có KOL nào đã &quot;Chốt booking&quot;. Cập nhật trạng thái KOL ở tab &quot;KOL&quot; thành <span className="font-medium text-foreground">Chốt booking</span> để hiển thị ở đây.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_OPTIONS.map((opt) => {
          const count = counts[opt.value] ?? 0;
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
              <span
                className={cn(
                  "font-mono tabular-nums text-[10px] rounded px-1.5",
                  active ? "bg-primary-foreground/20" : "bg-muted-foreground/15"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

    <div className="bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-3 font-medium w-12">#</th>
            <th className="px-3 py-3 font-medium">KOL</th>
            <th className="px-3 py-3 font-medium">Trạng thái demo</th>
            <th className="px-3 py-3 font-medium">Version</th>
            <th className="px-3 py-3 font-medium">Link demo</th>
            <th className="px-3 py-3 font-medium text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filteredRows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                Không có KOL nào ở trạng thái này.
              </td>
            </tr>
          ) : null}
          {filteredRows.map((r, i) => {
            const canSubmit =
              r.demoStatus === "NOT_SUBMITTED" || r.demoStatus === "NEEDS_REVISION";
            const hasSubmission = !!r.currentSubmission;
            return (
              <tr key={r.campaignKolId} className="hover:bg-muted/60">
                <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2.5">@{r.username}</td>
                <td className="px-3 py-2.5">
                  <VideoStatusBadge status={r.demoStatus} />
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {r.currentSubmission ? `v${r.currentSubmission.version}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {r.currentSubmission ? (
                    <a
                      href={r.currentSubmission.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Mở Drive ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2.5 text-right space-x-1.5">
                  {hasSubmission ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailFor(r)}
                    >
                      Chi tiết
                    </Button>
                  ) : null}
                  {canSubmit ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setSubmitFor(r)}
                    >
                      {r.demoStatus === "NOT_SUBMITTED" ? "Submit demo" : "Submit lại"}
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {submitFor ? (
        <VideoDemoSubmitDialog
          campaignKolId={submitFor.campaignKolId}
          kolUsername={submitFor.username}
          open={true}
          onOpenChange={(o) => !o && setSubmitFor(null)}
        />
      ) : null}

      <Dialog open={!!detailFor} onOpenChange={(o) => !o && setDetailFor(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Demo của @{detailFor?.username}
            </DialogTitle>
          </DialogHeader>
          {detailFor?.currentSubmission ? (
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Trạng thái</div>
                  <div className="flex-1">
                    <VideoStatusBadge status={detailFor.demoStatus} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Version</div>
                  <div className="flex-1">v{detailFor.currentSubmission.version}</div>
                </div>
                <div className="flex gap-3">
                  <div className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Submit lúc</div>
                  <div className="flex-1">{formatDateTime(detailFor.currentSubmission.submittedAt)}</div>
                </div>
                <div className="flex gap-3">
                  <div className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Link Drive</div>
                  <div className="flex-1">
                    <a
                      href={detailFor.currentSubmission.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {detailFor.currentSubmission.driveUrl} ↗
                    </a>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Bình luận
                </div>
                <CommentThread
                  submissionId={detailFor.currentSubmission.id}
                  canPost
                />
              </div>

              {detailFor.videoId ? (
                <div className="border-t border-border pt-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Lịch sử version
                  </div>
                  <SubmissionHistoryAccordion
                    videoId={detailFor.videoId}
                    excludeSubmissionId={detailFor.currentSubmission.id}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
