"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  budget: number;
  targetKoc: number;
  targetVideos: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
};

function toDateInput(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function CampaignFormDialog({
  trigger,
  campaign,
}: {
  trigger: React.ReactNode;
  campaign?: Campaign;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(campaign?.name ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [startDate, setStartDate] = useState(toDateInput(campaign?.startDate ?? null));
  const [endDate, setEndDate] = useState(toDateInput(campaign?.endDate ?? null));
  const [budget, setBudget] = useState(String(campaign?.budget ?? 0));
  const [targetKoc, setTargetKoc] = useState(String(campaign?.targetKoc ?? 0));
  const [targetVideos, setTargetVideos] = useState(String(campaign?.targetVideos ?? 0));
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED" | "COMPLETED">(
    campaign?.status ?? "ACTIVE"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name,
      description: description || null,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: parseInt(budget) || 0,
      targetKoc: parseInt(targetKoc) || 0,
      targetVideos: parseInt(targetVideos) || 0,
      status,
    };
    const url = campaign ? `/api/campaigns/${campaign.id}` : "/api/campaigns";
    const method = campaign ? "PATCH" : "POST";
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
    toast.success(campaign ? "Đã cập nhật" : "Đã tạo chiến dịch");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {campaign ? "Sửa chiến dịch" : "Tạo chiến dịch mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên chiến dịch *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Ngày bắt đầu</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => {
                  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                  el.showPicker?.();
                }}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Ngày kết thúc</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onClick={(e) => {
                  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                  el.showPicker?.();
                }}
                className="cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (VND)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetKoc">Target KOL</Label>
              <Input
                id="targetKoc"
                type="number"
                min="0"
                value={targetKoc}
                onChange={(e) => setTargetKoc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetVideos">Target Video</Label>
              <Input
                id="targetVideos"
                type="number"
                min="0"
                value={targetVideos}
                onChange={(e) => setTargetVideos(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as typeof status)}>
              <SelectTrigger className="w-full">
                <SelectLabelText value={status} labels={CAMPAIGN_STATUS_LABELS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Đang chạy</SelectItem>
                <SelectItem value="PAUSED">Tạm dừng</SelectItem>
                <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : campaign ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
