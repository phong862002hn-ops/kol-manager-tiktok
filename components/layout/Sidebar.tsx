"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/app/(dashboard)/_components/NotificationBell";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  managerOnly?: boolean;
  badgeKey?: "pendingApprovals";
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "KOL/KOC",
    items: [
      { href: "/", label: "Tổng quan", icon: "📊" },
      { href: "/campaigns", label: "Chiến dịch", icon: "📋" },
      { href: "/kols", label: "Danh sách KOL", icon: "👥" },
    ],
  },
  {
    title: "Phân tích",
    items: [
      { href: "/revenue", label: "Doanh thu KOL", icon: "💰" },
      { href: "/imports", label: "Import File Excel", icon: "📤" },
    ],
  },
  {
    title: "Quản trị",
    items: [
      { href: "/approvals", label: "Duyệt chi phí cast", icon: "⏳", managerOnly: true, badgeKey: "pendingApprovals" },
      { href: "/users", label: "Quản lý nhân sự", icon: "👤", managerOnly: true },
      { href: "/tags", label: "Quản lý tag", icon: "🏷️", managerOnly: true },
      { href: "/audit", label: "Lịch sử hoạt động", icon: "📜", managerOnly: true },
    ],
  },
];

export function Sidebar({
  pendingApprovals = 0,
  userRole,
  userName,
  userEmail,
}: {
  pendingApprovals?: number;
  userRole: "STAFF" | "MANAGER";
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const role = userRole;
  const badges: Record<string, number> = { pendingApprovals };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">KOL Manager</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              TikTok Shop Internal · <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">⌘K</kbd>
            </p>
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (it) => !it.managerOnly || role === "MANAGER"
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-6">
              <div className="px-6 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </div>
              <ul className="space-y-0.5 px-3">
                {visibleItems.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          active
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {badge > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <Link
          href="/account"
          className="block hover:bg-gray-50 -m-1 p-1 rounded transition"
        >
          <div className="text-sm">
            <div className="font-medium text-gray-900 truncate">{userName}</div>
            <div className="text-xs text-gray-500 truncate">{userEmail}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <span>{role === "MANAGER" ? "Quản lý" : "Nhân viên"}</span>
              <span className="text-blue-600 text-[10px]">· Đổi mật khẩu →</span>
            </div>
          </div>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
