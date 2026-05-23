import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "./_components/CommandPalette";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const pendingCount =
    session.user.role === "MANAGER"
      ? await prisma.castCost.count({ where: { status: "PENDING" } })
      : 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        pendingApprovals={pendingCount}
        userRole={session.user.role}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <CommandPalette />
    </div>
  );
}
