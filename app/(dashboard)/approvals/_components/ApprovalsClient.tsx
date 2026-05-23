"use client";
import { useState } from "react";
import Link from "next/link";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KolDetailDialog } from "@/components/shared/KolDetailDialog";
import { formatDateTime, formatVnd } from "@/lib/format";
import { CAST_STATUS_COLORS, CAST_STATUS_LABELS, COST_TYPE_LABELS } from "@/lib/constants";
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

  async function handleApprove(c: Pending) {
    if (!confirm(`Duyệt cast ${formatVnd(c.amount)} cho @${c.kolUsername}?`)) return;
    setBusy(c.id);
    const res = await fetch(`/api/cast-costs/${c.id}/approve`, { method: "POST" });
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

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Duyệt chi phí cast</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {pending.length} đề xuất chờ duyệt · {history.length} đã xử lý
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Chờ duyệt ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
            Không có đề xuất chờ duyệt.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pending.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-lg p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => setDetailKolId(c.kolId)}
                      className="font-semibold text-gray-900 hover:text-blue-600 text-left"
                    >
                      @{c.kolUsername}
                    </button>
                    <div>
                      <Link
                        href={`/campaigns/${c.campaignId}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {c.campaignName}
                      </Link>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-gray-900">
                      {formatVnd(c.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {COST_TYPE_LABELS[c.costType]}
                    </div>
                  </div>
                </div>
                {c.note && (
                  <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-2">
                    {c.note}
                  </div>
                )}
                <div className="mt-3 text-xs text-gray-500">
                  Đề xuất bởi <span className="font-medium">{c.proposedBy}</span> ·{" "}
                  {formatDateTime(c.proposedAt)}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(c)}
                    disabled={busy === c.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRejectTarget(c);
                      setRejectReason("");
                    }}
                    disabled={busy === c.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Lịch sử ({history.length})
        </h2>
        {history.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
            Chưa có lịch sử.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-medium">KOL</th>
                  <th className="px-4 py-3 font-medium">Chiến dịch</th>
                  <th className="px-4 py-3 font-medium text-right">Số tiền</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Đề xuất</th>
                  <th className="px-4 py-3 font-medium">Xử lý bởi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDetailKolId(c.kolId)}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        @{c.kolUsername}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/campaigns/${c.campaignId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {c.campaignName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{formatVnd(c.amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {COST_TYPE_LABELS[c.costType]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          label={CAST_STATUS_LABELS[c.status]}
                          colorClass={CAST_STATUS_COLORS[c.status]}
                        />
                        {c.rejectReason && (
                          <span
                            className="text-xs text-red-600 max-w-xs truncate"
                            title={c.rejectReason}
                          >
                            {c.rejectReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div>{c.proposedBy}</div>
                      <div className="text-gray-400">
                        {formatDateTime(c.proposedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div>{c.approvedBy ?? "—"}</div>
                      {c.approvedAt && (
                        <div className="text-gray-400">
                          {formatDateTime(c.approvedAt)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <div className="text-sm text-gray-600">
              {rejectTarget && (
                <>
                  Số tiền: <span className="font-medium">{formatVnd(rejectTarget.amount)}</span>{" "}
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
              onClick={handleReject}
              disabled={!rejectReason.trim() || busy === rejectTarget?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
