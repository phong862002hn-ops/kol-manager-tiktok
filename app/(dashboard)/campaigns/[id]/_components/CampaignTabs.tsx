"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "", label: "📊 Tổng quan" },
  { slug: "products", label: "📦 Sản phẩm" },
  { slug: "kols", label: "👥 KOL" },
  { slug: "sent", label: "📤 Gửi đơn" },
  { slug: "orders", label: "📥 Đơn về" },
  { slug: "videos", label: "🎬 Video" },
];

export function CampaignTabs({ campaignId }: { campaignId: string }) {
  const pathname = usePathname();
  const base = `/campaigns/${campaignId}`;

  return (
    <div className="flex gap-1 mt-5 -mb-px overflow-x-auto">
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
              "px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition-colors",
              active
                ? "border-blue-600 text-blue-700 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
