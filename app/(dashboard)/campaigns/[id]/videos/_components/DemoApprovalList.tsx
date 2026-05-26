"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  VideoStatusBadge,
  type VideoDemoStatus,
} from "@/components/video/VideoStatusBadge";
import { VideoDemoSubmitDialog } from "@/components/video/VideoDemoSubmitDialog";

export type DemoRow = {
  campaignKolId: string;
  username: string;
  demoStatus: VideoDemoStatus;
  currentSubmission: {
    version: number;
    driveUrl: string;
    submittedAt: string;
  } | null;
};

export function DemoApprovalList({ rows }: { rows: DemoRow[] }) {
  const [openFor, setOpenFor] = useState<DemoRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
        Chưa có KOL nào đã &quot;Chốt booking&quot;. Cập nhật trạng thái KOL ở tab &quot;KOL&quot; thành <span className="font-medium text-foreground">Chốt booking</span> để hiển thị ở đây.
      </div>
    );
  }

  return (
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
          {rows.map((r, i) => {
            const canSubmit =
              r.demoStatus === "NOT_SUBMITTED" || r.demoStatus === "NEEDS_REVISION";
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
                <td className="px-3 py-2.5 text-right">
                  {canSubmit ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setOpenFor(r)}
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

      {openFor ? (
        <VideoDemoSubmitDialog
          campaignKolId={openFor.campaignKolId}
          kolUsername={openFor.username}
          open={true}
          onOpenChange={(o) => !o && setOpenFor(null)}
        />
      ) : null}
    </div>
  );
}
