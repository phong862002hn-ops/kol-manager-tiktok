"use client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatNumber, formatVnd } from "@/lib/format";

type Row = {
  username: string;
  orders: number;
  revenue: number;
  commission: number;
  actualCommission: number;
  commissionRate: number;
};

type SortKey =
  | "orders"
  | "revenue"
  | "commission"
  | "actualCommission"
  | "commissionRate"
  | "username";
type SortOrder = "desc" | "asc";

const COLS: { key: SortKey; label: string; align: "left" | "right"; tip?: string }[] = [
  { key: "username", label: "KOL", align: "left" },
  { key: "orders", label: "Đơn", align: "right" },
  {
    key: "revenue",
    label: "Doanh thu",
    align: "right",
    tip: "Cơ sở HH = giá thanh toán thực tế (không gồm ship/thuế)",
  },
  { key: "commission", label: "HH ước tính", align: "right" },
  {
    key: "actualCommission",
    label: "HH thực tế",
    align: "right",
    tip: "HH sau quyết toán",
  },
  { key: "commissionRate", label: "Tỷ lệ HH", align: "right" },
];

const PAGE_SIZE = 50;

export function RevenueTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const res = q
      ? rows.filter((r) => r.username.toLowerCase().includes(q))
      : [...rows];
    res.sort((a, b) => {
      const dir = sortOrder === "desc" ? -1 : 1;
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb) * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
    return res;
  }, [rows, query, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortOrder(key === "username" ? "asc" : "desc");
    }
    setPage(1);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Input
          placeholder="Tìm KOL theo username..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="max-w-xs h-9"
        />
        <div className="text-sm text-muted-foreground">
          {query ? (
            <>
              {filtered.length} / {rows.length} KOL
            </>
          ) : (
            <>{rows.length} KOL</>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium w-12">#</th>
              {COLS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-medium ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                    title={col.tip}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${
                        active ? "text-foreground font-semibold" : ""
                      }`}
                    >
                      {col.label}
                      {col.tip && <span className="text-muted-foreground/70">ⓘ</span>}
                      <span
                        className={`text-[10px] ${active ? "opacity-100" : "opacity-30"}`}
                      >
                        {active ? (sortOrder === "desc" ? "▼" : "▲") : "⇅"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  {query ? `Không tìm thấy KOL khớp "${query}"` : "Chưa có dữ liệu"}
                </td>
              </tr>
            ) : (
              pageRows.map((k, i) => {
                const globalIdx = (currentPage - 1) * PAGE_SIZE + i + 1;
                return (
                  <tr key={k.username} className="hover:bg-muted/60">
                    <td className="px-4 py-3 text-muted-foreground">{globalIdx}</td>
                    <td className="px-4 py-3 font-medium">@{k.username}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(k.orders)}</td>
                    <td className="px-4 py-3 text-right">{formatVnd(k.revenue)}</td>
                    <td className="px-4 py-3 text-right">{formatVnd(k.commission)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {k.actualCommission > 0 ? formatVnd(k.actualCommission) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {k.commissionRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="text-muted-foreground">
            Trang {currentPage} / {totalPages} · hiển thị {pageRows.length} / {filtered.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(1)}
            >
              ⇤ Đầu
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              ← Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Sau →
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              Cuối ⇥
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
