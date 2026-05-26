import { Badge } from "@/components/ui/badge";

export type VideoDemoStatus =
  | "NOT_SUBMITTED"
  | "DEMO_PENDING"
  | "APPROVED"
  | "NEEDS_REVISION"
  | "PUBLISHED";

const META: Record<VideoDemoStatus, { label: string; cls: string }> = {
  NOT_SUBMITTED: {
    label: "Chưa có demo",
    cls: "bg-muted text-muted-foreground border-transparent",
  },
  DEMO_PENDING: {
    label: "Chờ duyệt",
    cls: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-900/40 dark:text-amber-300",
  },
  APPROVED: {
    label: "Đã duyệt",
    cls: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  NEEDS_REVISION: {
    label: "Cần sửa",
    cls: "bg-rose-100 text-rose-800 border-transparent dark:bg-rose-900/40 dark:text-rose-300",
  },
  PUBLISHED: {
    label: "Đã đăng",
    cls: "bg-sky-100 text-sky-800 border-transparent dark:bg-sky-900/40 dark:text-sky-300",
  },
};

export function VideoStatusBadge({ status }: { status: VideoDemoStatus }) {
  const m = META[status];
  return (
    <Badge variant="outline" className={m.cls}>
      {m.label}
    </Badge>
  );
}
