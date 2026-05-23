"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Send,
  ShoppingBag,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: "", label: "Tổng quan", Icon: LayoutDashboard },
  { slug: "products", label: "Sản phẩm", Icon: Package },
  { slug: "kols", label: "KOL", Icon: Users },
  { slug: "sent", label: "Gửi đơn", Icon: Send },
  { slug: "orders", label: "Đơn về", Icon: ShoppingBag },
  { slug: "videos", label: "Video", Icon: Video },
];

export function CampaignTabs({ campaignId }: { campaignId: string }) {
  const pathname = usePathname();
  const base = `/campaigns/${campaignId}`;

  return (
    <div className="flex gap-0.5 -mb-px overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug
          ? pathname === href || pathname.startsWith(href + "/")
          : pathname === base;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] border-b-2 -mb-px whitespace-nowrap cursor-pointer transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-sm",
              active
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
