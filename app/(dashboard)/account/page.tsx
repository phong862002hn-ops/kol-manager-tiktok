import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground">Tài khoản của tôi</h1>
      <p className="text-muted-foreground mt-1 text-sm">Đổi mật khẩu, xem thông tin tài khoản.</p>

      <div className="mt-6 bg-card border border-border rounded-lg p-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tên</span>
          <span className="font-medium">{session.user.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{session.user.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Role</span>
          <span className="font-medium">
            {session.user.role === "MANAGER" ? "Quản lý" : "Nhân viên"}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Đổi mật khẩu</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
