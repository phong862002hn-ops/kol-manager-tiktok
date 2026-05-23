import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";

const schema = z.object({
  contentId: z.string().min(1),
  url: z.string().url(),
  note: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const data = schema.parse(await req.json());
    const link = await prisma.videoLink.upsert({
      where: { contentId: data.contentId },
      update: { url: data.url, note: data.note ?? null },
      create: {
        contentId: data.contentId,
        url: data.url,
        note: data.note ?? null,
        addedBy: session.user.name ?? session.user.email ?? "Unknown",
      },
    });
    return NextResponse.json(link);
  } catch (err) {
    return handleApiError(err);
  }
}
