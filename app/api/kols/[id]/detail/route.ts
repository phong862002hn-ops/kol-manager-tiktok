import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { isCancelledOrder } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const kol = await prisma.campaignKol.findUnique({
      where: { id: ctx.params.id },
      include: {
        campaign: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true, email: true } },
        castCost: {
          include: {
            proposedBy: { select: { name: true } },
            approvedBy: { select: { name: true } },
          },
        },
      },
    });
    if (!kol) return apiError("Không tìm thấy", 404);

    const profile = await prisma.kolProfile.findUnique({
      where: { username: kol.username.toLowerCase() },
    });

    const orders = await prisma.tiktokOrder.findMany({
      where: {
        creatorUsername: { equals: kol.username, mode: "insensitive" },
        import: { deletedAt: null },
      },
      orderBy: { createdTime: "desc" },
      select: {
        id: true,
        orderId: true,
        productName: true,
        contentType: true,
        contentId: true,
        paymentAmount: true, // hiển thị từng đơn: tổng khách trả
        commissionBase: true, // doanh thu KOL
        commissionPayment: true,
        actualCommission: true,
        orderStatus: true,
        createdTime: true,
      },
    });

    let revenue = 0;
    let commission = 0;
    let actualCommission = 0;
    let validOrders = 0;
    const videoSet = new Set<string>();
    const videoMap = new Map<
      string,
      { contentId: string; orders: number; gmv: number; commission: number }
    >();
    for (const o of orders) {
      const cancelled = isCancelledOrder(o.orderStatus);
      if (!cancelled) {
        validOrders += 1;
        revenue += o.commissionBase ?? 0;
        commission += o.commissionPayment ?? 0;
        actualCommission += o.actualCommission ?? 0;
        if (o.contentId) videoSet.add(o.contentId);
      }
      if (o.contentId) {
        let v = videoMap.get(o.contentId);
        if (!v) {
          v = { contentId: o.contentId, orders: 0, gmv: 0, commission: 0 };
          videoMap.set(o.contentId, v);
        }
        if (!cancelled) {
          v.orders += 1;
          v.gmv += o.commissionBase ?? 0;
          v.commission += o.commissionPayment ?? 0;
        }
      }
    }

    const videoLinks = await prisma.videoLink.findMany({
      where: { contentId: { in: Array.from(videoSet) } },
    });
    const linkMap = new Map(videoLinks.map((v) => [v.contentId, v]));

    const videos = Array.from(videoMap.values())
      .map((v) => ({
        ...v,
        url: linkMap.get(v.contentId)?.url ?? null,
      }))
      .sort((a, b) => b.gmv - a.gmv);

    const castApproved = kol.castCost?.status === "APPROVED" ? kol.castCost.amount : 0;

    return NextResponse.json({
      id: kol.id,
      username: kol.username,
      tag: kol.tag,
      status: kol.status,
      zalo: kol.zalo,
      email: kol.email,
      facebook: kol.facebook,
      ig: kol.ig,
      note: kol.note,
      createdAt: kol.createdAt.toISOString(),
      campaign: kol.campaign,
      staff: kol.staff,
      profile: profile
        ? {
            followerCount: profile.followerCount,
            malePercent: profile.malePercent,
            note: profile.note,
            updatedAt: profile.updatedAt.toISOString(),
            updatedBy: profile.updatedBy,
          }
        : null,
      cast: kol.castCost
        ? {
            id: kol.castCost.id,
            amount: kol.castCost.amount,
            costType: kol.castCost.costType,
            status: kol.castCost.status,
            paidAmount: kol.castCost.paidAmount,
            note: kol.castCost.note,
            proposedBy: kol.castCost.proposedBy.name,
            proposedAt: kol.castCost.proposedAt.toISOString(),
            approvedBy: kol.castCost.approvedBy?.name ?? null,
            approvedAt: kol.castCost.approvedAt?.toISOString() ?? null,
            rejectReason: kol.castCost.rejectReason,
          }
        : null,
      stats: {
        totalOrders: orders.length,
        validOrders,
        revenue,
        commission,
        actualCommission,
        castApproved,
        profit: revenue - commission - castApproved,
        videoCount: videoSet.size,
      },
      videos: videos.slice(0, 20),
      recentOrders: orders.slice(0, 30).map((o) => ({
        ...o,
        createdTime: o.createdTime?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
