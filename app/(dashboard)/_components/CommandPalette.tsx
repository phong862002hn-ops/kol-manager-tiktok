"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";

type SearchResp = {
  campaigns: { id: string; name: string; status: string }[];
  kols: { id: string; username: string; campaignId: string; campaignName: string }[];
};

const STATIC_ROUTES = [
  { label: "Tổng quan", href: "/" },
  { label: "Chiến dịch", href: "/campaigns" },
  { label: "Danh sách KOL", href: "/kols" },
  { label: "Doanh thu KOL", href: "/revenue" },
  { label: "Import File Excel", href: "/imports" },
  { label: "Duyệt chi phí cast", href: "/approvals" },
  { label: "Quản lý nhân sự", href: "/users" },
];

type Item = {
  key: string;
  label: string;
  subLabel?: string;
  href: string;
  group: "Trang" | "Chiến dịch" | "KOL";
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // Cmd/Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setQ("");
      setActiveIdx(0);
    }
  }, [open]);

  const { data } = useSWR<SearchResp>(
    open && q.trim().length > 0 ? `/api/search?q=${encodeURIComponent(q.trim())}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const items = useMemo<Item[]>(() => {
    const qLower = q.trim().toLowerCase();
    const staticItems: Item[] = STATIC_ROUTES.filter(
      (r) => qLower === "" || r.label.toLowerCase().includes(qLower)
    ).map((r) => ({ key: `static:${r.href}`, label: r.label, href: r.href, group: "Trang" as const }));

    if (!data || qLower.length === 0) return staticItems;

    const campaignItems: Item[] = data.campaigns.map((c) => ({
      key: `c:${c.id}`,
      label: c.name,
      href: `/campaigns/${c.id}`,
      group: "Chiến dịch",
    }));
    const kolItems: Item[] = data.kols.map((k) => ({
      key: `k:${k.id}`,
      label: `@${k.username}`,
      subLabel: k.campaignName,
      href: `/campaigns/${k.campaignId}/kols`,
      group: "KOL",
    }));

    return [...staticItems, ...campaignItems, ...kolItems];
  }, [q, data]);

  useEffect(() => {
    setActiveIdx(0);
  }, [items.length]);

  function go(item: Item) {
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIdx];
      if (item) go(item);
    }
  }

  // Group items by group name preserving order
  const grouped: { group: string; items: Item[]; startIdx: number }[] = [];
  {
    let idx = 0;
    let cur: { group: string; items: Item[]; startIdx: number } | null = null;
    for (const it of items) {
      if (!cur || cur.group !== it.group) {
        cur = { group: it.group, items: [], startIdx: idx };
        grouped.push(cur);
      }
      cur.items.push(it);
      idx += 1;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="p-3 border-b">
          <Input
            placeholder="Tìm chiến dịch, KOL, trang... (Esc để đóng)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            className="border-0 focus-visible:ring-0 focus-visible:border-0 shadow-none text-base"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {q ? "Không tìm thấy" : "Gõ để bắt đầu tìm kiếm"}
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.group} className="py-2">
                <div className="px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {g.group}
                </div>
                {g.items.map((it, i) => {
                  const globalIdx = g.startIdx + i;
                  const active = globalIdx === activeIdx;
                  return (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => go(it)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between text-sm ${
                        active ? "bg-primary-soft text-primary" : "hover:bg-muted/60"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{it.label}</div>
                        {it.subLabel && (
                          <div className="text-xs text-muted-foreground">{it.subLabel}</div>
                        )}
                      </div>
                      {active && <span className="text-xs text-muted-foreground/70">↵</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="px-3 py-2 border-t bg-muted/50 text-[11px] text-muted-foreground flex justify-between">
          <span>↑↓ chuyển — ↵ chọn</span>
          <span>⌘K mở/đóng</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
