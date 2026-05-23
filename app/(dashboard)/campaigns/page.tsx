import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from "@/lib/constants";
import { formatDate, formatVnd, formatNumber } from "@/lib/format";
import { CampaignFormDialog } from "./_components/CampaignFormDialog";

export const dynamic = "force-dynamic";

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
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Chiến dịch</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {campaigns.length} chiến dịch
          </p>
        </div>
        <CampaignFormDialog
          trigger={<Button>+ Tạo chiến dịch</Button>}
        />
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          Chưa có chiến dịch nào. Bấm &quot;+ Tạo chiến dịch&quot; để bắt đầu.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium text-right">Budget</th>
                <th className="px-4 py-3 font-medium text-right">KOL</th>
                <th className="px-4 py-3 font-medium">Người tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {c.name}
                    </Link>
                    {c.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={CAMPAIGN_STATUS_LABELS[c.status]}
                      colorClass={CAMPAIGN_STATUS_COLORS[c.status]}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.startDate && c.endDate
                      ? `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`
                      : c.startDate
                      ? `Từ ${formatDate(c.startDate)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatVnd(c.budget)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatNumber(c._count.kols)}
                    {c.targetKoc > 0 && (
                      <span className="text-gray-400">/{c.targetKoc}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.createdBy.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
