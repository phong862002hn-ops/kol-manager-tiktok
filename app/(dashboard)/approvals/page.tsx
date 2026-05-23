import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalsClient } from "./_components/ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "MANAGER") redirect("/");

  const all = await prisma.castCost.findMany({
    include: {
      campaignKol: {
        include: { campaign: { select: { id: true, name: true } } },
      },
      proposedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
    orderBy: { proposedAt: "desc" },
  });

  const pending = all.filter((c) => c.status === "PENDING");
  const history = all.filter((c) => c.status !== "PENDING");

  return (
    <ApprovalsClient
      pending={pending.map((c) => ({
        id: c.id,
        kolId: c.campaignKolId,
        amount: c.amount,
        costType: c.costType,
        note: c.note,
        proposedAt: c.proposedAt.toISOString(),
        proposedBy: c.proposedBy.name,
        kolUsername: c.campaignKol.username,
        campaignId: c.campaignKol.campaign.id,
        campaignName: c.campaignKol.campaign.name,
      }))}
      history={history.map((c) => ({
        id: c.id,
        kolId: c.campaignKolId,
        amount: c.amount,
        costType: c.costType,
        status: c.status,
        rejectReason: c.rejectReason,
        proposedAt: c.proposedAt.toISOString(),
        approvedAt: c.approvedAt?.toISOString() ?? null,
        proposedBy: c.proposedBy.name,
        approvedBy: c.approvedBy?.name ?? null,
        kolUsername: c.campaignKol.username,
        campaignId: c.campaignKol.campaign.id,
        campaignName: c.campaignKol.campaign.name,
      }))}
    />
  );
}
