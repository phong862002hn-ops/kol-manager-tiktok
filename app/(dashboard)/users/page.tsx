import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./_components/UsersClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "MANAGER") redirect("/");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <UsersClient
      currentUserId={session.user.id}
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
