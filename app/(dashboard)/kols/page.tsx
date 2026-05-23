import { prisma } from "@/lib/prisma";
import { getStatsByUsername } from "@/lib/stats";
import { KolsListClient } from "./_components/KolsListClient";

export const dynamic = "force-dynamic";

export default async function KolsPage() {
  const kols = await prisma.campaignKol.findMany({
    where: { deletedAt: null, campaign: { deletedAt: null } },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Group theo username (cross-campaign) — 1 KOL có thể ở nhiều campaign
  type GroupedKol = {
    username: string;
    instances: { campaignId: string; campaignName: string; campaignKolId: string }[];
  };
  const grouped = new Map<string, GroupedKol>();
  for (const k of kols) {
    const u = k.username.toLowerCase();
    if (!grouped.has(u)) {
      grouped.set(u, { username: k.username, instances: [] });
    }
    grouped.get(u)!.instances.push({
      campaignId: k.campaign.id,
      campaignName: k.campaign.name,
      campaignKolId: k.id,
    });
  }

  const usernames = Array.from(grouped.keys());
  const [stats, tagLinks, commentGroups] = await Promise.all([
    getStatsByUsername(usernames),
    prisma.kolTag.findMany({
      where: { username: { in: usernames } },
      include: { tag: true },
    }),
    prisma.kolComment.groupBy({
      by: ["kolUsername"],
      where: { kolUsername: { in: usernames }, deletedAt: null },
      _count: { _all: true },
    }),
  ]);
  const commentCountMap = new Map<string, number>();
  for (const g of commentGroups) {
    if (g.kolUsername) commentCountMap.set(g.kolUsername, g._count._all);
  }

  // Group tags theo username
  const tagsByUser = new Map<string, { id: string; name: string; color: string }[]>();
  for (const link of tagLinks) {
    if (!tagsByUser.has(link.username)) tagsByUser.set(link.username, []);
    tagsByUser.get(link.username)!.push(link.tag);
  }

  const rows = Array.from(grouped.values())
    .map((g) => {
      const s = stats.get(g.username.toLowerCase());
      return {
        username: g.username,
        instances: g.instances,
        tags: tagsByUser.get(g.username.toLowerCase()) ?? [],
        commentCount: commentCountMap.get(g.username.toLowerCase()) ?? 0,
        orders: s?.validOrders ?? 0,
        revenue: s?.revenue ?? 0,
        commission: s?.commission ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return <KolsListClient rows={rows} />;
}
