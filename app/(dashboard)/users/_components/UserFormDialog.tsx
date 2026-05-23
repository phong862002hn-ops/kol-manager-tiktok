"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectLabelText } from "@/components/shared/SelectLabel";
import { toast } from "sonner";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  STAFF: "Nhân viên",
  MANAGER: "Quản lý",
};

export function UserFormDialog({
  user,
  trigger,
}: {
  user?: UserRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "STAFF");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const isEdit = !!user;
    const url = isEdit ? `/api/users/${user.id}` : "/api/users";
    const method = isEdit ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { name, email, role };
    if (!isEdit) payload.password = password;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Có lỗi xảy ra");
      return;
    }
    if (isEdit) {
      toast.success("Đã cập nhật");
    } else {
      toast.success(`Đã tạo. Mật khẩu tạm: ${password} (đưa cho nhân sự, họ vào đổi sau)`);
    }
    setOpen(false);
    setPassword("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? `Sửa @${user.email}` : "Thêm nhân sự"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@shop.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger className="w-full">
                <SelectLabelText value={role} labels={ROLE_LABELS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Nhân viên (tạo campaign, đề xuất cast)</SelectItem>
                <SelectItem value="MANAGER">Quản lý (toàn quyền + duyệt cast)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu tạm *</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Nhập mật khẩu tạm cho nhân sự"
              />
              <p className="text-xs text-gray-500">
                Đưa mật khẩu này cho nhân sự, họ vào app rồi đổi sau (góc trên phải sidebar).
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : user ? "Cập nhật" : "Tạo nhân sự"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
