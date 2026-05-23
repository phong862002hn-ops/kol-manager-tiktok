import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    await requireSession();
    const imports = await prisma.excelImport.findMany({
      where: { deletedAt: null },
      orderBy: { uploadedAt: "desc" },
      take: 100,
    });
    return NextResponse.json(imports);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return apiError("Thiếu file");
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parseExcelBuffer(buf);
    if (rows.length === 0) {
      return apiError("File không có dữ liệu hợp lệ");
    }

    const imp = await prisma.excelImport.create({
      data: {
        fileName: file.name,
        uploadedBy: session.user.name ?? session.user.email ?? "Unknown",
        uploaderId: session.user.id,
        rowCount: rows.length,
      },
    });

    // Insert by chunks of 500
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      await prisma.tiktokOrder.createMany({
        data: chunk.map((r) => ({
          importId: imp.id,
          orderId: r.orderId,
          productId: r.productId,
          productName: r.productName,
          sku: r.sku,
          skuId: r.skuId,
          merchantSku: r.merchantSku,
          price: r.price,
          paymentAmount: r.paymentAmount,
          quantity: r.quantity,
          paymentMethod: r.paymentMethod,
          orderStatus: r.orderStatus,
          creatorUsername: r.creatorUsername,
          contentType: r.contentType,
          contentId: r.contentId,
          commissionRate: r.commissionRate,
          commissionBase: r.commissionBase,
          commissionPayment: r.commissionPayment,
          actualCommission: r.actualCommission,
          createdTime: r.createdTime,
          paidTime: r.paidTime,
          shippedTime: r.shippedTime,
          completedTime: r.completedTime,
          rawData: r.rawData as Prisma.InputJsonValue,
        })),
      });
    }

    const uniqueCreators = new Set(rows.map((r) => r.creatorUsername)).size;
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "CREATE",
      entity: "ExcelImport",
      entityId: imp.id,
      entityName: `${imp.fileName} (${imp.rowCount} dòng)`,
      after: { fileName: imp.fileName, rowCount: imp.rowCount, uniqueCreators },
    });
    return NextResponse.json({
      id: imp.id,
      fileName: imp.fileName,
      rowCount: imp.rowCount,
      uniqueCreators,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
