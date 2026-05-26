"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  campaignKolId: string;
  kolUsername: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const driveUrlRe = /drive\.google\.com|docs\.google\.com/;

export function VideoDemoSubmitDialog({
  campaignKolId,
  kolUsername,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [driveUrl, setDriveUrl] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setDriveUrl("");
    setSaving(false);
  }

  async function handleSubmit() {
    if (!driveUrl) return;
    if (!driveUrlRe.test(driveUrl)) {
      toast.error("Phải là link Google Drive (drive.google.com hoặc docs.google.com)");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/campaign-kols/${campaignKolId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveUrl }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Submit thất bại");
      return;
    }
    toast.success(`Đã gửi demo của @${kolUsername} chờ duyệt`);
    reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit demo cho @{kolUsername}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="driveUrl">Link Google Drive</Label>
          <Input
            id="driveUrl"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Link phải thuộc drive.google.com hoặc docs.google.com.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !driveUrl}>
            {saving ? "Đang gửi..." : "Gửi duyệt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
