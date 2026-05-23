"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KolCommentThread } from "@/components/shared/KolCommentThread";
import { KolDetailDialog } from "@/components/shared/KolDetailDialog";
import { KolFormDialog, type KolRow } from "./KolFormDialog";
import { CastCostDialog } from "./CastCostDialog";
import { KOL_STATUS_COLORS, KOL_STATUS_LABELS, CAST_STATUS_COLORS, CAST_STATUS_LABELS } from "@/lib/constants";
import { formatVnd, formatNumber } from "@/lib/format";
import { toast } from "sonner";

type Row = KolRow & {
  staffName: string | null;
  commentCount: number;
  orders: number;
  revenue: number;
  commission: number;
  castApproved: number;
  castId: string | null;
  castStatus: string | null;
  castProposed: number;
  castType: string | null;
  castPaid: number;
  castNote: string | null;
  castRejectReason: string | null;
  profit: number;
};

export function KolListClient({
  campaignId,
  rows,
}: {
  campaignId: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<Row | null>(null);
  const [detailTarget, setDetailTarget] = useState<Row | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<
    "username" | "orders" | "revenue" | "commission" | "castApproved" | "profit"
  >("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => r.username.toLowerCase().includes(q))
      : [...rows];
    list.sort((a, b) => {
      const dir = sortOrder === "desc" ? -1 : 1;
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb) * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
    return list;
  }, [rows, query, sortKey, sortOrder]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortOrder(key === "username" ? "asc" : "desc");
    }
  }
  function sortIcon(key: typeof sortKey) {
    if (sortKey !== key) return <span className="opacity-30">⇅</span>;
    return <span>{sortOrder === "desc" ? "▼" : "▲"}</span>;
  }

  async function handleDelete(row: Row) {
    if (!confirm(`Xóa KOL @${row.username}?`)) return;
    setBusyId(row.id);
    const res = await fetch(`/api/kols/${row.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Xóa thất bại");
      return;
    }
    toast.success("Đã xóa");
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <Input
            placeholder="Tìm KOL theo username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs h-9"
          />
          <div className="text-sm text-muted-foreground">
            {query
              ? `${filteredRows.length} / ${rows.length} KOL`
              : `${rows.length} KOL`}
          </div>
        </div>
        <KolFormDialog
          campaignId={campaignId}
          trigger={<Button>+ Thêm KOL</Button>}
        />
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          Chưa có KOL. Bấm &quot;+ Thêm KOL&quot; để thêm.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("username")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Username <span className="text-[10px]">{sortIcon("username")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Tag</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Nhân sự</th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort("orders")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Đơn <span className="text-[10px]">{sortIcon("orders")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort("revenue")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Doanh thu <span className="text-[10px]">{sortIcon("revenue")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort("commission")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Hoa hồng <span className="text-[10px]">{sortIcon("commission")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort("castApproved")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Cast <span className="text-[10px]">{sortIcon("castApproved")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort("profit")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Lợi nhuận <span className="text-[10px]">{sortIcon("profit")}</span>
                  </button>
                </th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 && query ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Không tìm thấy KOL khớp &quot;{query}&quot;
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDetailTarget(r)}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      @{r.username}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.tag ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={KOL_STATUS_LABELS[r.status]}
                      colorClass={KOL_STATUS_COLORS[r.status]}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.staffName ?? <span className="text-muted-foreground/50">— Chưa gán —</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(r.orders)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatVnd(r.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatVnd(r.commission)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CastCostDialog
                      campaignKolId={r.id}
                      kolUsername={r.username}
                      existing={
                        r.castId
                          ? {
                              id: r.castId,
                              amount: r.castProposed,
                              costType: r.castType ?? "PER_VIDEO",
                              status: r.castStatus ?? "PENDING",
                              paidAmount: r.castPaid,
                              note: r.castNote,
                              rejectReason: r.castRejectReason,
                            }
                          : null
                      }
                      trigger={
                        r.castProposed > 0 ? (
                          <button
                            className="flex flex-col items-end gap-0.5 hover:opacity-70"
                            title={
                              r.castStatus === "REJECTED" && r.castRejectReason
                                ? `Lý do từ chối: ${r.castRejectReason}`
                                : undefined
                            }
                          >
                            <span className="text-foreground text-sm">
                              {formatVnd(r.castProposed)}
                            </span>
                            {r.castStatus && (
                              <StatusBadge
                                label={CAST_STATUS_LABELS[r.castStatus]}
                                colorClass={CAST_STATUS_COLORS[r.castStatus]}
                              />
                            )}
                            {r.castStatus === "REJECTED" && r.castRejectReason && (
                              <span
                                className="text-[10px] text-destructive max-w-[160px] truncate text-right italic"
                                title={r.castRejectReason}
                              >
                                {r.castRejectReason}
                              </span>
                            )}
                          </button>
                        ) : (
                          <button className="text-xs text-primary hover:underline">
                            + Đề xuất
                          </button>
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span
                      className={
                        r.profit >= 0 ? "text-success" : "text-destructive"
                      }
                    >
                      {formatVnd(r.profit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCommentTarget(r)}
                      title="Bình luận về KOL này trong campaign"
                      aria-label="Bình luận"
                      className={r.commentCount > 0 ? "text-primary" : ""}
                    >
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {r.commentCount > 0 && (
                        <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums">
                          {r.commentCount}
                        </span>
                      )}
                    </Button>
                    <KolFormDialog
                      campaignId={campaignId}
                      kol={r}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Sửa
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(r)}
                      disabled={busyId === r.id}
                      className="text-destructive hover:text-destructive"
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KolDetailDialog
        campaignKolId={detailTarget?.id ?? null}
        open={!!detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
      />

      <Dialog
        open={!!commentTarget}
        onOpenChange={(o) => !o && setCommentTarget(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Bình luận về @{commentTarget?.username}
              <div className="text-xs font-normal text-muted-foreground mt-1">
                Thread riêng trong campaign này
              </div>
            </DialogTitle>
          </DialogHeader>
          {commentTarget && (
            <KolCommentThread
              campaignKolId={commentTarget.id}
              emptyHint="Chưa có bình luận trong campaign này. Hãy là người đầu tiên."
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
