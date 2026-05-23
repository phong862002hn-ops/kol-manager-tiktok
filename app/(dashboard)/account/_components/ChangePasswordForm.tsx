"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("Mật khẩu mới nhập 2 lần không khớp");
      return;
    }
    if (next.length < 6) {
      toast.error("Mật khẩu mới tối thiểu 6 ký tự");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setLoading(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Đổi mật khẩu thất bại");
      return;
    }
    toast.success("Đã đổi mật khẩu");
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="current">Mật khẩu hiện tại *</Label>
        <Input
          id="current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">Mật khẩu mới *</Label>
        <Input
          id="next"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <p className="text-xs text-gray-500">Tối thiểu 6 ký tự.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Nhập lại mật khẩu mới *</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={loading || !current || !next}>
        {loading ? "Đang đổi..." : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
