import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SemanticBadge } from "@/components/shared/SemanticBadge";
import { Progress } from "@/components/shared/Progress";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatVnd, formatNumber } from "@/lib/format";
import { CampaignFormDialog } from "./_components/CampaignFormDialog";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "secondary",
};

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { kols: true, products: true } },
      createdBy: { select: { name: true } },
    },
  });

  return (
    <div>
      {/* Filter bar */}
      <div className="border-b border-border bg-background sticky top-[57px] z-10">
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground tabular-nums">
            {campaigns.length} chiến dịch
          </div>
          <div className="ml-auto">
            <CampaignFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Tạo chiến dịch
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {campaigns.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Chưa có chiến dịch nào. Bấm &quot;Tạo chiến dịch&quot; để bắt đầu.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-[13px] min-w-[880px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
                  <th className="px-4 py-2.5 font-medium">Chiến dịch</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 font-medium">Thời gian</th>
                  <th className="px-4 py-2.5 font-medium text-right">Budget</th>
                  <th className="px-4 py-2.5 font-medium min-w-[160px]">
                    KOC progress
                  </th>
                  <th className="px-4 py-2.5 font-medium">Người tạo</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const variant =
                    STATUS_VARIANT[c.status] ?? "secondary";
                  const kolCount = c._count.kols;
                  const target = c.targetKoc;
                  const pct =
                    target > 0
                      ? Math.round((kolCount / target) * 100)
                      : 0;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/60 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          <div className="font-medium text-foreground">
                            {c.name}
                          </div>
                          {c.description && (
                            <div className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-1">
                              {c.description}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <SemanticBadge variant={variant} dot={variant !== "secondary"}>
                          {CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}
                        </SemanticBadge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                        {c.startDate && c.endDate
                          ? `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`
                          : c.startDate
                          ? `Từ ${formatDate(c.startDate)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatVnd(c.budget)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-between text-[11.5px] mb-1">
                          <span className="tabular-nums text-foreground font-medium">
                            {formatNumber(kolCount)}
                            {target > 0 && (
                              <span className="text-muted-foreground font-normal">
                                /{formatNumber(target)}
                              </span>
                            )}
                          </span>
                          {target > 0 && (
                            <span className="tabular-nums text-muted-foreground">
                              {pct}%
                            </span>
                          )}
                        </div>
                        <Progress
                          value={kolCount}
                          max={target > 0 ? target : Math.max(kolCount, 1)}
                          color={
                            c.status === "COMPLETED"
                              ? "hsl(var(--muted-foreground))"
                              : "hsl(var(--primary))"
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.createdBy.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
