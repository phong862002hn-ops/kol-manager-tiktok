import { prisma } from "@/lib/prisma";
import { isCancelledOrder } from "@/lib/constants";
import { normalizeUsername } from "@/lib/normalize";

export type KolStats = {
  totalOrders: number;
  validOrders: number;
  revenue: number; // = Σ commissionBase (Cơ sở hoa hồng = giá thanh toán thực tế, không gồm ship/thuế)
  commission: number; // = Σ commissionPayment (HH ước tính)
  actualCommission: number; // = Σ actualCommission (HH thực tế sau quyết toán)
};

export type CampaignKpi = {
  kolCount: number;
  bookedCount: number;
  targetKoc: number;
  totalOrders: number;
  validOrders: number;
  videoCount: number;
  revenue: number;
  commission: number;
  actualCommission: number;
  approvedCastCost: number;
  profit: number;
  pipeline: Record<string, number>;
};

// Lấy stats per KOL từ TiktokOrder, group theo username (lowercase)
export async function getStatsByUsername(usernames: string[]): Promise<Map<string, KolStats>> {
  if (usernames.length === 0) return new Map();
  // [SILENT-BUG FIX Slice 2] Normalize INPUT trước khi query.
  // CampaignKol.username cũ có thể là "@Linh" raw, TiktokOrder.creatorUsername mới đã là "linh".
  // Không normalize input → query miss → doanh thu KOL hiển thị 0 dù có đơn thật.
  const normalized = usernames.map(normalizeUsername).filter(Boolean);
  if (normalized.length === 0) return new Map();
  const orders = await prisma.tiktokOrder.findMany({
    where: {
      creatorUsername: { in: normalized, mode: "insensitive" },
      import: { deletedAt: null },
    },
    select: {
      creatorUsername: true,
      orderStatus: true,
      commissionBase: true,
      commissionPayment: true,
      actualCommission: true,
    },
  });
  const map = new Map<string, KolStats>();
  for (const u of usernames) {
    map.set(normalizeUsername(u), {
      totalOrders: 0,
      validOrders: 0,
      revenue: 0,
      commission: 0,
      actualCommission: 0,
    });
  }
  for (const o of orders) {
    const u = normalizeUsername(o.creatorUsername);
    const s = map.get(u);
    if (!s) continue;
    s.totalOrders += 1;
    if (!isCancelledOrder(o.orderStatus)) {
      s.validOrders += 1;
      s.revenue += o.commissionBase ?? 0;
      s.commission += o.commissionPayment ?? 0;
      s.actualCommission += o.actualCommission ?? 0;
    }
  }
  return map;
}

// Tổng hợp KPI cho 1 campaign
export async function getCampaignKpi(campaignId: string): Promise<CampaignKpi> {
  const [campaign, kols] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { targetKoc: true } }),
    prisma.campaignKol.findMany({
      where: { campaignId, deletedAt: null },
      include: { castCost: true },
    }),
  ]);

  const usernames = kols.map((k) => k.username);
  const statsMap = await getStatsByUsername(usernames);

  // Đếm video unique từ contentId (loại hủy)
  // [SILENT-BUG FIX Slice 2] Normalize input — cùng lý do với getStatsByUsername.
  const normalizedUsernames = usernames.map(normalizeUsername).filter(Boolean);
  const videoRows = normalizedUsernames.length === 0 ? [] : await prisma.tiktokOrder.findMany({
    where: {
      creatorUsername: { in: normalizedUsernames, mode: "insensitive" },
      contentId: { not: null },
      import: { deletedAt: null },
    },
    select: { contentId: true, orderStatus: true },
  });
  const videoSet = new Set<string>();
  for (const v of videoRows) {
    if (v.contentId && !isCancelledOrder(v.orderStatus)) videoSet.add(v.contentId);
  }

  const pipeline: Record<string, number> = {
    PAUSED: 0,
    NEW_CONTACT: 0,
    CONTACTING: 0,
    NEGOTIATING: 0,
    BOOKED: 0,
  };

  let totalOrders = 0;
  let validOrders = 0;
  let revenue = 0;
  let commission = 0;
  let actualCommission = 0;
  let approvedCastCost = 0;
  let bookedCount = 0;

  for (const k of kols) {
    pipeline[k.status] = (pipeline[k.status] ?? 0) + 1;
    if (k.status === "BOOKED") bookedCount += 1;
    const s = statsMap.get(normalizeUsername(k.username));
    if (s) {
      totalOrders += s.totalOrders;
      validOrders += s.validOrders;
      revenue += s.revenue;
      commission += s.commission;
      actualCommission += s.actualCommission;
    }
    if (k.castCost?.status === "APPROVED") {
      approvedCastCost += k.castCost.amount;
    }
  }

  return {
    kolCount: kols.length,
    bookedCount,
    targetKoc: campaign?.targetKoc ?? 0,
    totalOrders,
    validOrders,
    videoCount: videoSet.size,
    revenue,
    commission,
    actualCommission,
    approvedCastCost,
    profit: revenue - commission - approvedCastCost,
    pipeline,
  };
}
