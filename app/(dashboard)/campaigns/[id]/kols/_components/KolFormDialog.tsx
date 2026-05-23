"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { normalizeUsername } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectLabelText } from "@/components/shared/SelectLabel";
import { KOL_STATUS_LABELS, KOL_STATUS_ORDER, COST_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export type KolRow = {
  id: string;
  username: string;
  tag: string | null;
  status: string;
  zalo: string | null;
  email: string | null;
  facebook: string | null;
  ig: string | null;
  note: string | null;
  staffId?: string | null;
  castType?: string | null;
  castProposed?: number;
};

type UserOption = { id: string; name: string };

export function KolFormDialog({
  campaignId,
  kol,
  trigger,
}: {
  campaignId: string;
  kol?: KolRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState(kol?.username ?? "");
  const [tag, setTag] = useState(kol?.tag ?? "");
  const [status, setStatus] = useState(kol?.status ?? "NEW_CONTACT");
  const [zalo, setZalo] = useState(kol?.zalo ?? "");
  const [email, setEmail] = useState(kol?.email ?? "");
  const [facebook, setFacebook] = useState(kol?.facebook ?? "");
  const [ig, setIg] = useState(kol?.ig ?? "");
  const [note, setNote] = useState(kol?.note ?? "");
  const [staffId, setStaffId] = useState<string>(kol?.staffId ?? "");
  const [castAmount, setCastAmount] = useState(String(kol?.castProposed ?? ""));
  const [castType, setCastType] = useState<string>(kol?.castType ?? "PER_VIDEO");
  const [followerCount, setFollowerCount] = useState("");
  const [malePercent, setMalePercent] = useState("");

  const { data: users } = useSWR<UserOption[]>(open ? "/api/users" : null, fetcher);
  const { data: tags } = useSWR<{ id: string; name: string; color: string }[]>(
    open ? "/api/tags" : null,
    fetcher
  );

  // Khi mở dialog (edit hoặc gõ xong username) — load profile hiện có để pre-fill
  const profileUsername = (kol?.username || username).trim();
  const { data: profile } = useSWR<{
    followerCount: number | null;
    malePercent: number | null;
  }>(
    open && profileUsername
      ? `/api/kol-profiles/${encodeURIComponent(normalizeUsername(profileUsername))}`
      : null,
    fetcher
  );
  useEffect(() => {
    if (profile) {
      setFollowerCount(profile.followerCount != null ? String(profile.followerCount) : "");
      setMalePercent(profile.malePercent != null ? String(profile.malePercent) : "");
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const isEdit = !!kol;
    const url = isEdit ? `/api/kols/${kol.id}` : `/api/campaigns/${campaignId}/kols`;
    const method = isEdit ? "PATCH" : "POST";
    const payload: Record<string, unknown> = {
      username,
      tag: tag || null,
      status,
      zalo: zalo || null,
      email: email || null,
      facebook: facebook || null,
      ig: ig || null,
      note: note || null,
      staffId: staffId || null,
    };
    if (!isEdit && castAmount && parseInt(castAmount) > 0) {
      payload.castAmount = parseInt(castAmount);
      payload.castType = castType;
    }
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setLoading(false);
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Có lỗi xảy ra");
      return;
    }

    // Upsert KolProfile (cross-campaign): chỉ gửi nếu user có nhập 1 trong 2 trường
    const hasFollower = followerCount.trim() !== "";
    const hasMale = malePercent.trim() !== "";
    if (hasFollower || hasMale) {
      const profilePayload: Record<string, unknown> = {};
      if (hasFollower) {
        profilePayload.followerCount = parseInt(followerCount) || 0;
      }
      if (hasMale) {
        const mp = parseFloat(malePercent);
        profilePayload.malePercent = Math.min(100, Math.max(0, isNaN(mp) ? 0 : mp));
      }
      await fetch(
        `/api/kol-profiles/${encodeURIComponent(normalizeUsername(username))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        }
      );
    }

    setLoading(false);
    toast.success(isEdit ? "Đã cập nhật" : "Đã thêm KOL");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kol ? `Sửa KOL @${kol.username}` : "Thêm KOL"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="username">Username TikTok *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="không có @"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select value={tag || "__none"} onValueChange={(v) => setTag(v === "__none" ? "" : v ?? "")}>
                <SelectTrigger className="w-full">
                  <span data-slot="select-value" className="flex flex-1 text-left">
                    {tag ? (
                      tags?.find((t) => t.name === tag) ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tags.find((t) => t.name === tag)!.color }}
                        >
                          {tag}
                        </span>
                      ) : (
                        <span className="text-foreground">{tag}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground/70">— Không tag —</span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Không tag —</SelectItem>
                  {tags?.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                  {/* Giá trị legacy nếu không khớp tag nào */}
                  {tag && !tags?.find((t) => t.name === tag) && (
                    <SelectItem value={tag}>{tag} (cũ)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {(!tags || tags.length === 0) && (
                <p className="text-[11px] text-muted-foreground">
                  Chưa có tag nào.{" "}
                  <a href="/tags" className="text-primary hover:underline">
                    Quản lý tag →
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectLabelText value={status} labels={KOL_STATUS_LABELS} />
                </SelectTrigger>
                <SelectContent>
                  {KOL_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {KOL_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nhân sự phụ trách</Label>
              <Select value={staffId} onValueChange={(v) => setStaffId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <span data-slot="select-value" className="flex flex-1 text-left">
                    {users?.find((u) => u.id === staffId)?.name ?? (
                      <span className="text-muted-foreground/70">— Chưa gán —</span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium text-foreground mb-3">Liên hệ</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="zalo">Zalo</Label>
                <Input id="zalo" value={zalo} onChange={(e) => setZalo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ig">Instagram</Label>
                <Input id="ig" value={ig} onChange={(e) => setIg(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium text-foreground mb-3">
              Profile TikTok (cross-campaign)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="followerCount">Số follower</Label>
                <Input
                  id="followerCount"
                  type="number"
                  min="0"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value)}
                  placeholder="VD: 25000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="malePercent">% follower nam (0-100)</Label>
                <Input
                  id="malePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={malePercent}
                  onChange={(e) => setMalePercent(e.target.value)}
                  placeholder="VD: 35"
                />
                {malePercent !== "" && !isNaN(parseFloat(malePercent)) && (
                  <p className="text-[11px] text-muted-foreground">
                    Nữ ≈ {(100 - parseFloat(malePercent)).toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Dùng chung cho mọi campaign KOL này tham gia. Bỏ trống nếu chưa biết.
            </p>
          </div>

          {!kol && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium text-foreground mb-3">
                Đề xuất chi phí cast (tùy chọn)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="castAmount">Số tiền (VND)</Label>
                  <Input
                    id="castAmount"
                    type="number"
                    min="0"
                    value={castAmount}
                    onChange={(e) => setCastAmount(e.target.value)}
                    placeholder="0 = không có cast"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loại</Label>
                  <Select value={castType} onValueChange={(v) => v && setCastType(v)}>
                    <SelectTrigger className="w-full">
                      <SelectLabelText value={castType} labels={COST_TYPE_LABELS} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_VIDEO">Mỗi video</SelectItem>
                      <SelectItem value="LUMP_SUM">Cả campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sẽ tạo đề xuất chờ Manager duyệt.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : kol ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
