"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  TrendingUp,
  Upload,
  CheckCircle2,
  Video,
  UserCog,
  Tag,
  History,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import { NotificationBell } from "@/app/(dashboard)/_components/NotificationBell";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  managerOnly?: boolean;
  badgeKey?: "pendingApprovals" | "pendingVideos";
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "KOL / KOC",
    items: [
      { href: "/", label: "Tổng quan", Icon: LayoutDashboard },
      { href: "/campaigns", label: "Chiến dịch", Icon: Megaphone },
      { href: "/kols", label: "Danh sách KOL", Icon: Users },
    ],
  },
  {
    title: "Phân tích",
    items: [
      { href: "/revenue", label: "Doanh thu KOL", Icon: TrendingUp },
      { href: "/imports", label: "Import Excel", Icon: Upload },
    ],
  },
  {
    title: "Quản trị",
    items: [
      {
        href: "/approvals",
        label: "Duyệt chi phí cast",
        Icon: CheckCircle2,
        managerOnly: true,
        badgeKey: "pendingApprovals",
      },
      {
        href: "/videos-pending",
        label: "Video cần duyệt",
        Icon: Video,
        managerOnly: true,
        badgeKey: "pendingVideos",
      },
      { href: "/users", label: "Nhân sự", Icon: UserCog, managerOnly: true },
      { href: "/tags", label: "Tag", Icon: Tag, managerOnly: true },
      { href: "/audit", label: "Lịch sử", Icon: History, managerOnly: true },
    ],
  },
];

export function Sidebar({
  pendingApprovals = 0,
  pendingVideos = 0,
  userRole,
  userName,
  userEmail,
}: {
  pendingApprovals?: number;
  pendingVideos?: number;
  userRole: "STAFF" | "MANAGER";
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const role = userRole;
  const badges: Record<string, number> = { pendingApprovals, pendingVideos };

  return (
    <aside className="w-60 shrink-0 bg-background border-r border-border flex flex-col h-screen sticky top-0 text-[13px]">
      {/* Brand */}
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[26px] h-[26px] rounded-md bg-primary text-primary-foreground grid place-items-center text-[12px] font-bold tracking-tight">
            K
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold tracking-tight text-foreground truncate">
              KOL Manager
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">
              Shop · Internal
            </div>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (it) => !it.managerOnly || role === "MANAGER"
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-3.5">
              <div className="px-2.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {section.title}
              </div>
              <ul className="space-y-0.5">
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
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          active
                            ? "bg-primary-soft text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge > 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10.5px] font-semibold font-mono tabular-nums",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted-foreground/20 text-foreground"
                            )}
                          >
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

      {/* User card */}
      <div className="border-t border-border px-3 py-2.5">
        <Link
          href="/account"
          className="flex items-center gap-2.5 rounded-md p-1 -m-1 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar name={userName || "User"} size={28} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground truncate">
              {userName}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {role === "MANAGER" ? "Quản lý" : "Nhân viên"} · {userEmail}
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md text-[12px] font-medium text-muted-foreground border border-border bg-background hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
