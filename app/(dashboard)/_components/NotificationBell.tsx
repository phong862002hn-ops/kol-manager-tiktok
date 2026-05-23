"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type Resp = { items: Notification[]; unreadCount: number };

const TYPE_ICONS: Record<string, string> = {
  COMMENT_NEW: "💬",
  CAST_PENDING: "⏳",
  CAST_APPROVED: "✅",
  CAST_REJECTED: "❌",
  SENT_ORDER_STATUS: "📦",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, mutate } = useSWR<Resp>("/api/notifications", fetcher, {
    refreshInterval: 30_000, // poll mỗi 30s
    revalidateOnFocus: true,
  });

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    mutate();
  }

  async function handleClick(n: Notification) {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
      mutate();
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-gray-100 transition"
            aria-label="Thông báo"
          >
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-sm">Thông báo</div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs text-blue-600 hover:text-blue-700 h-auto py-1"
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Chưa có thông báo nào.
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 flex gap-3 ${
                  !n.isRead ? "bg-blue-50/40" : ""
                }`}
              >
                <span className="text-xl shrink-0">
                  {TYPE_ICONS[n.type] ?? "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                    {n.title}
                  </div>
                  {n.body && (
                    <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                      {n.body}
                    </div>
                  )}
                  <div className="text-[11px] text-gray-400 mt-1">
                    {formatDateTime(n.createdAt)}
                  </div>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
