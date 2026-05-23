import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().int().nonnegative().default(0),
  targetKoc: z.number().int().nonnegative().default(0),
  targetVideos: z.number().int().nonnegative().default(0),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).default("ACTIVE"),
});

export async function GET() {
  try {
    await requireSession();
    const campaigns = await prisma.campaign.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { kols: true, products: true } },
        createdBy: { select: { name: true } },
      },
    });
    return NextResponse.json(campaigns);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = createSchema.parse(body);
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        budget: data.budget,
        targetKoc: data.targetKoc,
        targetVideos: data.targetVideos,
        status: data.status,
        createdById: session.user.id,
      },
    });
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "CREATE",
      entity: "Campaign",
      entityId: campaign.id,
      entityName: campaign.name,
      after: campaign,
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
