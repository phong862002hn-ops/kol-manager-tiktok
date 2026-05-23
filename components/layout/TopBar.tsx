"use client";
import { usePathname } from "next/navigation";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type RouteMeta = {
  title: string;
  subtitle?: string;
  crumbs?: string[];
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "Tổng quan",
    subtitle: "Dữ liệu cross-campaign toàn shop",
    crumbs: ["KOL / KOC", "Tổng quan"],
  },
  "/campaigns": {
    title: "Chiến dịch",
    crumbs: ["KOL / KOC", "Chiến dịch"],
  },
  "/kols": {
    title: "Danh sách KOL",
    crumbs: ["KOL / KOC", "Danh sách KOL"],
  },
  "/revenue": {
    title: "Doanh thu KOL",
    crumbs: ["Phân tích", "Doanh thu KOL"],
  },
  "/imports": {
    title: "Import Excel",
    crumbs: ["Phân tích", "Import Excel"],
  },
  "/approvals": {
    title: "Duyệt chi phí cast",
    crumbs: ["Quản trị", "Duyệt chi phí cast"],
  },
  "/users": {
    title: "Nhân sự",
    crumbs: ["Quản trị", "Nhân sự"],
  },
  "/tags": {
    title: "Tag",
    crumbs: ["Quản trị", "Tag"],
  },
  "/audit": {
    title: "Lịch sử",
    crumbs: ["Quản trị", "Lịch sử"],
  },
  "/account": {
    title: "Tài khoản",
    crumbs: ["Tài khoản"],
  },
};

function deriveMeta(pathname: string): RouteMeta {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  // Campaign detail: /campaigns/[id], /campaigns/[id]/kols, ...
  if (pathname.startsWith("/campaigns/")) {
    const rest = pathname.slice("/campaigns/".length).split("/");
    const subPage = rest[1];
    const subMap: Record<string, string> = {
      kols: "KOL",
      products: "Sản phẩm",
      sent: "Gửi đơn",
      orders: "Đơn về",
      videos: "Video",
    };
    const tail = subPage ? subMap[subPage] ?? subPage : "Tổng quan";
    return {
      title: tail,
      crumbs: ["KOL / KOC", "Chiến dịch", tail],
    };
  }
  // Fallback: derive from last segment
  const seg = pathname.split("/").filter(Boolean).pop() ?? "";
  return { title: seg.charAt(0).toUpperCase() + seg.slice(1) || "—" };
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" strokeWidth={1.75} />
      </button>
    );
  }
  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {isDark ? (
        <Sun className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.75} />
      )}
    </button>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const meta = deriveMeta(pathname);
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {meta.crumbs && meta.crumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="text-[11.5px] text-muted-foreground mb-1 flex items-center gap-1"
            >
              {meta.crumbs.map((c, i) => (
                <span key={`${c}-${i}`} className="flex items-center gap-1">
                  <span
                    className={
                      i === meta.crumbs!.length - 1
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {c}
                  </span>
                  {i < meta.crumbs!.length - 1 && (
                    <ChevronRight
                      className="h-3 w-3 opacity-50"
                      strokeWidth={1.75}
                    />
                  )}
                </span>
              ))}
            </nav>
          )}
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="text-[19px] font-semibold tracking-tight text-foreground truncate">
              {meta.title}
            </h1>
            {meta.subtitle && (
              <span className="text-[13px] text-muted-foreground truncate">
                · {meta.subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
