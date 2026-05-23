import { prisma } from "@/lib/prisma";
import { getStatsByUsername } from "@/lib/stats";
import { KolListClient } from "./_components/KolListClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const kols = await prisma.campaignKol.findMany({
    where: { campaignId: params.id, deletedAt: null },
    include: {
      castCost: true,
      staff: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const stats = await getStatsByUsername(kols.map((k) => k.username));

  // Comment count per campaignKol (per-campaign thread)
  const commentGroups = await prisma.kolComment.groupBy({
    by: ["campaignKolId"],
    where: {
      campaignKolId: { in: kols.map((k) => k.id) },
      deletedAt: null,
    },
    _count: { _all: true },
  });
  const commentCountMap = new Map<string, number>();
  for (const g of commentGroups) {
    if (g.campaignKolId) commentCountMap.set(g.campaignKolId, g._count._all);
  }

  const rows = kols.map((k) => {
    const s = stats.get(k.username.toLowerCase());
    const castApproved =
      k.castCost?.status === "APPROVED" ? k.castCost.amount : 0;
    return {
      id: k.id,
      username: k.username,
      tag: k.tag,
      status: k.status,
      zalo: k.zalo,
      email: k.email,
      facebook: k.facebook,
      ig: k.ig,
      note: k.note,
      staffId: k.staffId,
      staffName: k.staff?.name ?? null,
      commentCount: commentCountMap.get(k.id) ?? 0,
      orders: s?.validOrders ?? 0,
      revenue: s?.revenue ?? 0,
      commission: s?.commission ?? 0,
      castApproved,
      castId: k.castCost?.id ?? null,
      castStatus: k.castCost?.status ?? null,
      castProposed: k.castCost?.amount ?? 0,
      castType: k.castCost?.costType ?? null,
      castPaid: k.castCost?.paidAmount ?? 0,
      castNote: k.castCost?.note ?? null,
      castRejectReason: k.castCost?.rejectReason ?? null,
      profit: (s?.revenue ?? 0) - (s?.commission ?? 0) - castApproved,
    };
  });

  return <KolListClient campaignId={params.id} rows={rows} />;
}
