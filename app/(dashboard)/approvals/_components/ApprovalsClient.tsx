"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
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
import { Avatar } from "@/components/shared/Avatar";
import { SemanticBadge } from "@/components/shared/SemanticBadge";
import { KolDetailDialog } from "@/components/shared/KolDetailDialog";
import { formatDateTime, formatVnd } from "@/lib/format";
import { COST_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Pending = {
  id: string;
  kolId: string;
  amount: number;
  costType: string;
  note: string | null;
  proposedAt: string;
  proposedBy: string;
  kolUsername: string;
  campaignId: string;
  campaignName: string;
};

type History = Pending & {
  status: string;
  rejectReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
};

const STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  APPROVED: "success",
  REJECTED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

type Tab = "pending" | "approved" | "rejected";

export function ApprovalsClient({
  pending,
  history,
}: {
  pending: Pending[];
  history: Omit<History, "note">[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Pending | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailKolId, setDetailKolId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  const approved = useMemo(
    () => history.filter((h) => h.status === "APPROVED"),
    [history]
  );
  const rejected = useMemo(
    () => history.filter((h) => h.status === "REJECTED"),
    [history]
  );

  async function handleApprove(c: Pending) {
    if (!confirm(`Duyệt cast ${formatVnd(c.amount)} cho @${c.kolUsername}?`))
      return;
    setBusy(c.id);
    const res = await fetch(`/api/cast-costs/${c.id}/approve`, {
      method: "POST",
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Duyệt thất bại");
      return;
    }
    toast.success("Đã duyệt");
    router.refresh();
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setBusy(rejectTarget.id);
    const res = await fetch(`/api/cast-costs/${rejectTarget.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Từ chối thất bại");
      return;
    }
    toast.success("Đã từ chối");
    setRejectTarget(null);
    setRejectReason("");
    router.refresh();
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Chờ duyệt", count: pending.length },
    { id: "approved", label: "Đã duyệt", count: approved.length },
    { id: "rejected", label: "Đã từ chối", count: rejected.length },
  ];

  return (
    <div>
      {/* Tab pills */}
      <div className="border-b border-border bg-background sticky top-[57px] z-10">
        <div className="px-6 py-3 flex items-center gap-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium cursor-pointer transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10.5px] font-semibold tabular-nums",
                    active
                      ? "bg-primary-soft text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-5">
        {tab === "pending" &&
          (pending.length === 0 ? (
            <Empty text="Không có đề xuất chờ duyệt." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {pending.map((c) => (
                <article
                  key={c.id}
                  className="rounded-lg border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <Avatar name={c.kolUsername} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <button
                          type="button"
                          onClick={() => setDetailKolId(c.kolId)}
                          className="font-semibold text-foreground text-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm cursor-pointer"
                        >
                          @{c.kolUsername}
                        </button>
                        <Link
                          href={`/campaigns/${c.campaignId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {c.campaignName}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">
                          · {c.proposedBy} đề xuất · {formatDateTime(c.proposedAt)}
                        </span>
                      </div>
                      <div className="text-[13px] text-foreground">
                        {COST_TYPE_LABELS[c.costType]}
                      </div>
                      {c.note && (
                        <div className="mt-2 text-xs text-muted-foreground px-3 py-2 bg-muted/50 rounded border-l-2 border-border">
                          {c.note}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold tabular-nums tracking-tight">
                        {formatVnd(c.amount)}
                      </div>
                      <div className="mt-2.5 flex gap-1.5 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRejectTarget(c);
                            setRejectReason("");
                          }}
                          disabled={busy === c.id}
                          className="cursor-pointer"
                        >
                          Từ chối
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(c)}
                          disabled={busy === c.id}
                          className="cursor-pointer"
                        >
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            strokeWidth={1.75}
                          />
                          Duyệt
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))}

        {tab === "approved" && (
          <HistoryTable
            rows={approved}
            emptyText="Chưa có đề xuất đã duyệt."
            onOpenKol={setDetailKolId}
          />
        )}
        {tab === "rejected" && (
          <HistoryTable
            rows={rejected}
            emptyText="Chưa có đề xuất bị từ chối."
            onOpenKol={setDetailKolId}
          />
        )}
      </div>

      <KolDetailDialog
        campaignKolId={detailKolId}
        open={!!detailKolId}
        onOpenChange={(o) => !o && setDetailKolId(null)}
      />

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Từ chối cast cho @{rejectTarget?.kolUsername}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {rejectTarget && (
                <>
                  Số tiền:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatVnd(rejectTarget.amount)}
                  </span>{" "}
                  ({COST_TYPE_LABELS[rejectTarget.costType]})
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do từ chối *</Label>
              <Input
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: quá cao, đàm phán lại..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || busy === rejectTarget?.id}
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryTable({
  rows,
  emptyText,
  onOpenKol,
}: {
  rows: Omit<History, "note">[];
  emptyText: string;
  onOpenKol: (kolId: string) => void;
}) {
  if (rows.length === 0) return <Empty text={emptyText} />;
  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
            <th className="px-4 py-2.5 font-medium">KOL</th>
            <th className="px-4 py-2.5 font-medium">Chiến dịch</th>
            <th className="px-4 py-2.5 font-medium text-right">Số tiền</th>
            <th className="px-4 py-2.5 font-medium">Loại</th>
            <th className="px-4 py-2.5 font-medium">Trạng thái</th>
            <th className="px-4 py-2.5 font-medium">Đề xuất</th>
            <th className="px-4 py-2.5 font-medium">Xử lý bởi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              className="border-b border-border last:border-b-0 hover:bg-muted/60 transition-colors duration-150"
            >
              <td className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => onOpenKol(c.kolId)}
                  className="font-medium text-foreground hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  @{c.kolUsername}
                </button>
              </td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/campaigns/${c.campaignId}`}
                  className="text-primary hover:underline"
                >
                  {c.campaignName}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                {formatVnd(c.amount)}
              </td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">
                {COST_TYPE_LABELS[c.costType]}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex flex-col gap-1">
                  <SemanticBadge
                    variant={STATUS_VARIANT[c.status] ?? "secondary"}
                    dot
                  >
                    {STATUS_LABEL[c.status] ?? c.status}
                  </SemanticBadge>
                  {c.rejectReason && (
                    <span
                      className="text-xs text-destructive max-w-xs truncate"
                      title={c.rejectReason}
                    >
                      {c.rejectReason}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">
                <div>{c.proposedBy}</div>
                <div className="text-muted-foreground/70 tabular-nums">
                  {formatDateTime(c.proposedAt)}
                </div>
              </td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">
                <div>{c.approvedBy ?? "—"}</div>
                {c.approvedAt && (
                  <div className="text-muted-foreground/70 tabular-nums">
                    {formatDateTime(c.approvedAt)}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
