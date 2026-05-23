"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KolTagPicker } from "@/components/shared/KolTagPicker";
import { KolCommentThread } from "@/components/shared/KolCommentThread";
import { Avatar } from "@/components/shared/Avatar";
import { formatNumber, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tag = { id: string; name: string; color: string };
type Row = {
  username: string;
  instances: { campaignId: string; campaignName: string; campaignKolId: string }[];
  tags: Tag[];
  commentCount: number;
  orders: number;
  revenue: number;
  commission: number;
};

export function KolsListClient({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [openComment, setOpenComment] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.username.toLowerCase().includes(q));
  }, [query, rows]);

  return (
    <div>
      {/* Filter bar */}
      <div className="border-b border-border bg-background sticky top-[57px] z-10">
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-muted/50 focus-within:bg-muted focus-within:border-ring transition-colors min-w-[260px] cursor-text">
            <Search
              className="h-3.5 w-3.5 text-muted-foreground"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên hoặc @username…"
              className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatNumber(filtered.length)} KOL
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            {query ? `Không tìm thấy "${query}"` : "Chưa có KOL nào."}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-[13px] min-w-[880px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
                  <th className="px-4 py-2.5 font-medium">KOL</th>
                  <th className="px-4 py-2.5 font-medium min-w-[220px]">Nhóm</th>
                  <th className="px-4 py-2.5 font-medium">Chiến dịch</th>
                  <th className="px-4 py-2.5 font-medium text-right">Đơn</th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    Doanh thu
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    Hoa hồng
                  </th>
                  <th className="px-4 py-2.5 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => (
                  <tr
                    key={k.username}
                    className="border-b border-border last:border-b-0 hover:bg-muted/60 transition-colors duration-150"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={k.username} size={28} />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            @{k.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <KolTagPicker
                        username={k.username}
                        initialTags={k.tags}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {k.instances.length === 1 ? (
                        <Link
                          href={`/campaigns/${k.instances[0].campaignId}`}
                          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          {k.instances[0].campaignName}
                        </Link>
                      ) : (
                        <div className="space-y-0.5">
                          {k.instances.slice(0, 2).map((inst) => (
                            <Link
                              key={inst.campaignKolId}
                              href={`/campaigns/${inst.campaignId}`}
                              className="block text-primary hover:underline"
                            >
                              {inst.campaignName}
                            </Link>
                          ))}
                          {k.instances.length > 2 && (
                            <span className="text-muted-foreground">
                              +{k.instances.length - 2} khác
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatNumber(k.orders)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {formatVnd(k.revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatVnd(k.commission)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenComment(k)}
                        className={cn(
                          "cursor-pointer",
                          k.commentCount > 0 && "text-primary"
                        )}
                        aria-label={`Bình luận về @${k.username}`}
                      >
                        <MessageSquare
                          className="h-3.5 w-3.5"
                          strokeWidth={1.75}
                        />
                        {k.commentCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums">
                            {k.commentCount}
                          </span>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!openComment} onOpenChange={(o) => !o && setOpenComment(null)}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Bình luận về @{openComment?.username}
              <div className="text-xs font-normal text-muted-foreground mt-1">
                Thread chung cross-campaign · Tất cả nhân sự thấy
              </div>
            </DialogTitle>
          </DialogHeader>
          {openComment && (
            <KolCommentThread
              kolUsername={openComment.username}
              emptyHint="Chưa có ai bình luận về KOL này."
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
