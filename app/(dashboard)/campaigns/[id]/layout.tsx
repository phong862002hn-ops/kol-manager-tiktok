import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { CampaignTabs } from "./_components/CampaignTabs";
import { CampaignActions } from "./_components/CampaignActions";

export const dynamic = "force-dynamic";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      _count: { select: { kols: true, products: true, sentOrders: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!campaign) notFound();

  return (
    <div>
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 pt-6">
          <Link
            href="/campaigns"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ← Chiến dịch
          </Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {campaign.name}
                </h1>
                <StatusBadge
                  label={CAMPAIGN_STATUS_LABELS[campaign.status]}
                  colorClass={CAMPAIGN_STATUS_COLORS[campaign.status]}
                />
              </div>
              <div className="flex gap-4 mt-1 text-sm text-gray-500">
                {campaign.startDate && campaign.endDate && (
                  <span>
                    {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                  </span>
                )}
                <span>Tạo bởi {campaign.createdBy.name}</span>
              </div>
            </div>
            <CampaignActions
              campaign={{
                id: campaign.id,
                name: campaign.name,
                description: campaign.description,
                startDate: campaign.startDate?.toISOString() ?? null,
                endDate: campaign.endDate?.toISOString() ?? null,
                budget: campaign.budget,
                targetKoc: campaign.targetKoc,
                targetVideos: campaign.targetVideos,
                status: campaign.status,
              }}
            />
          </div>
          <CampaignTabs campaignId={campaign.id} />
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
