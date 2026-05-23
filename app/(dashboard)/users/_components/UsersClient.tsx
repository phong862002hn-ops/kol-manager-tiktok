"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserFormDialog, type UserRow } from "./UserFormDialog";
import { PasswordResetDialog } from "./PasswordResetDialog";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export function UsersClient({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: UserRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function handleToggleActive(u: UserRow) {
    if (u.id === currentUserId) {
      toast.error("Không thể vô hiệu hóa chính bạn");
      return;
    }
    const next = !u.active;
    if (!confirm(next ? `Kích hoạt lại ${u.name}?` : `Vô hiệu hóa ${u.name}? Sẽ không login được.`))
      return;
    setBusy(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Thất bại");
      return;
    }
    toast.success(next ? "Đã kích hoạt" : "Đã vô hiệu hóa");
    router.refresh();
  }

  async function handleToggleRole(u: UserRow) {
    if (u.id === currentUserId) {
      toast.error("Không thể đổi role chính bạn");
      return;
    }
    const next = u.role === "MANAGER" ? "STAFF" : "MANAGER";
    if (!confirm(`Đổi role @${u.email} sang ${next === "MANAGER" ? "Quản lý" : "Nhân viên"}?`))
      return;
    setBusy(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Thất bại");
      return;
    }
    toast.success("Đã đổi role");
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Quản lý nhân sự</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {users.filter((u) => u.active).length} đang hoạt động · {users.filter((u) => !u.active).length} đã vô hiệu hóa
          </p>
        </div>
        <UserFormDialog trigger={<Button>+ Thêm nhân sự</Button>} />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Ngày tạo</th>
              <th className="px-4 py-3 font-medium text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const isMe = u.id === currentUserId;
              return (
                <tr
                  key={u.id}
                  className={`hover:bg-muted/60 ${!u.active ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {u.name}
                    {isMe && (
                      <span className="ml-2 text-xs text-primary">(bạn)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={u.role === "MANAGER" ? "Quản lý" : "Nhân viên"}
                      colorClass={
                        u.role === "MANAGER"
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-foreground"
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <StatusBadge label="Hoạt động" colorClass="bg-success-soft text-success" />
                    ) : (
                      <StatusBadge label="Vô hiệu hóa" colorClass="bg-destructive-soft text-destructive" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <UserFormDialog
                      user={u}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Sửa
                        </Button>
                      }
                    />
                    <PasswordResetDialog
                      user={u}
                      trigger={
                        <Button variant="ghost" size="sm" className="text-primary">
                          Reset MK
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRole(u)}
                      disabled={busy === u.id || isMe}
                    >
                      Đổi role
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(u)}
                      disabled={busy === u.id || isMe}
                      className={u.active ? "text-destructive hover:text-destructive" : "text-success"}
                    >
                      {u.active ? "Tắt" : "Bật"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
