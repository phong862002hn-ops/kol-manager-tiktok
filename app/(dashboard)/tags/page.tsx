import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TagsClient } from "./_components/TagsClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "MANAGER") redirect("/");

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { kols: true } } },
  });

  return (
    <TagsClient
      tags={tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        kolCount: t._count.kols,
      }))}
    />
  );
}
