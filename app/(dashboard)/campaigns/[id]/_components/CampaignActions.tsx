"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CampaignFormDialog } from "../../_components/CampaignFormDialog";
import { toast } from "sonner";
import { useState } from "react";

type CampaignInput = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number;
  targetKoc: number;
  targetVideos: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
};

export function CampaignActions({ campaign }: { campaign: CampaignInput }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Xóa chiến dịch "${campaign.name}"? Tất cả KOL, sản phẩm, đơn gửi sẽ bị xóa.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Xóa thất bại");
      return;
    }
    toast.success("Đã xóa chiến dịch");
    router.push("/campaigns");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <CampaignFormDialog
        campaign={campaign}
        trigger={<Button variant="outline">Sửa</Button>}
      />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline">⋯</Button>} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              window.open(`/api/exports/campaign/${campaign.id}`, "_blank");
            }}
          >
            Export Excel báo cáo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive focus:text-destructive"
          >
            Xóa chiến dịch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
