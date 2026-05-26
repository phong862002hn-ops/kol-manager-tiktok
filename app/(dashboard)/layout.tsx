import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "./_components/CommandPalette";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [pendingCount, pendingVideosCount] =
    session.user.role === "MANAGER"
      ? await Promise.all([
          prisma.castCost.count({ where: { status: "PENDING" } }),
          prisma.video.count({ where: { demoStatus: "DEMO_PENDING" } }),
        ])
      : [0, 0];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        pendingApprovals={pendingCount}
        pendingVideos={pendingVideosCount}
        userRole={session.user.role}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <TopBar />
        {children}
      </main>
      <CommandPalette />
    </div>
  );
}
