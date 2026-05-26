"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type SubmissionStatus = "DEMO_PENDING" | "APPROVED" | "NEEDS_REVISION";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: "STAFF" | "MANAGER" };
};

type Submission = {
  id: string;
  version: number;
  driveUrl: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  submittedBy: { id: string; name: string; role: "STAFF" | "MANAGER" };
  reviewedBy: { id: string; name: string; role: "STAFF" | "MANAGER" } | null;
  comments: Comment[];
};

const STATUS_META: Record<SubmissionStatus, { label: string; cls: string }> = {
  DEMO_PENDING: {
    label: "Chờ duyệt",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  APPROVED: {
    label: "Đã duyệt",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  NEEDS_REVISION: {
    label: "Cần sửa",
    cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
};

type Props = {
  videoId: string;
  /** Submission ID hiện tại — sẽ bị loại khỏi danh sách history (đã hiển thị ở chỗ khác). */
  excludeSubmissionId?: string;
};

export function SubmissionHistoryAccordion({ videoId, excludeSubmissionId }: Props) {
  const [data, setData] = useState<Submission[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/videos/${videoId}/submissions`)
      .then((r) => (r.ok ? r.json() : { submissions: [] }))
      .then((res: { submissions: Submission[] }) => {
        if (!cancelled) setData(res.submissions);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (data === null) {
    return <div className="text-xs text-muted-foreground">Đang tải lịch sử...</div>;
  }

  const filtered = excludeSubmissionId
    ? data.filter((s) => s.id !== excludeSubmissionId)
    : data;

  if (filtered.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Chưa có version nào trước đó.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {filtered.map((s) => {
        const meta = STATUS_META[s.status];
        const isOpen = expanded.has(s.id);
        return (
          <div
            key={s.id}
            className="rounded border border-border bg-muted/20 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40 text-left"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform",
                  isOpen ? "rotate-0" : "-rotate-90"
                )}
                strokeWidth={2}
              />
              <span className="font-mono text-xs">v{s.version}</span>
              <Badge variant="outline" className={cn("border-transparent", meta.cls)}>
                {meta.label}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDateTime(s.submittedAt)}
              </span>
            </button>
            {isOpen ? (
              <div className="px-3 py-2 border-t border-border space-y-2 text-sm bg-background">
                <Row label="Người submit">{s.submittedBy.name}</Row>
                <Row label="Link Drive">
                  <a
                    href={s.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {s.driveUrl} ↗
                  </a>
                </Row>
                {s.reviewedBy ? (
                  <Row label="Được duyệt bởi">
                    {s.reviewedBy.name}
                    {s.reviewedAt ? ` · ${formatDateTime(s.reviewedAt)}` : null}
                  </Row>
                ) : null}
                {s.comments.length > 0 ? (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                      Bình luận ({s.comments.length})
                    </div>
                    <div className="space-y-1.5">
                      {s.comments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded border border-border bg-muted/30 px-2.5 py-1.5 text-xs"
                        >
                          <div className="text-[10px] text-muted-foreground mb-0.5">
                            <span className="font-medium text-foreground">{c.author.name}</span>
                            {" · "}
                            {formatDateTime(c.createdAt)}
                          </div>
                          <div className="whitespace-pre-wrap">{c.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="text-[10px] text-muted-foreground italic pt-1">
                  Version cũ — read-only.
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
