"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Bell,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  type LucideIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

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

const TYPE_ICONS: Record<string, { Icon: LucideIcon; tone: string }> = {
  COMMENT_NEW: { Icon: MessageSquare, tone: "text-primary" },
  CAST_PENDING: { Icon: Clock, tone: "text-warning" },
  CAST_APPROVED: { Icon: CheckCircle2, tone: "text-success" },
  CAST_REJECTED: { Icon: XCircle, tone: "text-destructive" },
  SENT_ORDER_STATUS: { Icon: Package, tone: "text-muted-foreground" },
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, mutate } = useSWR<Resp>("/api/notifications", fetcher, {
    refreshInterval: 30_000,
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
            className="relative inline-flex items-center justify-center w-[26px] h-[26px] rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Thông báo"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold tabular-nums border-[1.5px] border-background">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">Thông báo</div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs text-primary hover:text-primary h-auto py-1 cursor-pointer"
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </div>
          ) : (
            items.map((n) => {
              const meta = TYPE_ICONS[n.type] ?? {
                Icon: Bell,
                tone: "text-muted-foreground",
              };
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/60 flex gap-3 cursor-pointer transition-colors",
                    !n.isRead && "bg-primary-soft/50"
                  )}
                >
                  <meta.Icon
                    className={cn("h-4 w-4 shrink-0 mt-0.5", meta.tone)}
                    strokeWidth={1.75}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground line-clamp-2">
                      {n.title}
                    </div>
                    {n.body && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground/80 mt-1 tabular-nums">
                      {formatDateTime(n.createdAt)}
                    </div>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
