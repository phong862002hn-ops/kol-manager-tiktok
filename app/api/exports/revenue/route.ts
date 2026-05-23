import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { isCancelledOrder } from "@/lib/constants";

export const runtime = "nodejs";

function parseDateParam(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));
    const toEnd = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;

    const orders = await prisma.tiktokOrder.findMany({
      where: {
        import: { deletedAt: null },
        ...(from || toEnd
          ? {
              createdTime: {
                ...(from ? { gte: from } : {}),
                ...(toEnd ? { lte: toEnd } : {}),
              },
            }
          : {}),
      },
      select: {
        creatorUsername: true,
        orderStatus: true,
        commissionBase: true,
        commissionPayment: true,
        actualCommission: true,
      },
    });

    const map = new Map<
      string,
      { orders: number; revenue: number; commission: number; actualCommission: number }
    >();
    for (const o of orders) {
      if (isCancelledOrder(o.orderStatus)) continue;
      const u = o.creatorUsername.toLowerCase();
      let v = map.get(u);
      if (!v) {
        v = { orders: 0, revenue: 0, commission: 0, actualCommission: 0 };
        map.set(u, v);
      }
      v.orders += 1;
      // Doanh thu = Cơ sở hoa hồng (không gồm ship/thuế khách trả)
      v.revenue += o.commissionBase ?? 0;
      v.commission += o.commissionPayment ?? 0;
      v.actualCommission += o.actualCommission ?? 0;
    }

    const rows = Array.from(map.entries())
      .map(([username, v]) => ({
        Username: username,
        "Số đơn": v.orders,
        "Doanh thu (VND)": v.revenue,
        "HH ước tính (VND)": v.commission,
        "HH thực tế (VND)": v.actualCommission,
        "Tỷ lệ HH (%)":
          v.revenue > 0 ? Number(((v.commission / v.revenue) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b["Doanh thu (VND)"] - a["Doanh thu (VND)"]);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Doanh thu KOL");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const range = from || to ? `_${from?.toISOString().slice(0, 10) ?? ""}_${to?.toISOString().slice(0, 10) ?? ""}` : "";
    const filename = `revenue_kol${range}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
