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
          <h1 className="text-2xl font-semibold text-gray-900">Quản lý nhân sự</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {users.filter((u) => u.active).length} đang hoạt động · {users.filter((u) => !u.active).length} đã vô hiệu hóa
          </p>
        </div>
        <UserFormDialog trigger={<Button>+ Thêm nhân sự</Button>} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Ngày tạo</th>
              <th className="px-4 py-3 font-medium text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const isMe = u.id === currentUserId;
              return (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 ${!u.active ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.name}
                    {isMe && (
                      <span className="ml-2 text-xs text-blue-600">(bạn)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={u.role === "MANAGER" ? "Quản lý" : "Nhân viên"}
                      colorClass={
                        u.role === "MANAGER"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <StatusBadge label="Hoạt động" colorClass="bg-green-100 text-green-700" />
                    ) : (
                      <StatusBadge label="Vô hiệu hóa" colorClass="bg-red-100 text-red-700" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
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
                        <Button variant="ghost" size="sm" className="text-blue-600">
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
                      className={u.active ? "text-red-600 hover:text-red-700" : "text-green-600"}
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
