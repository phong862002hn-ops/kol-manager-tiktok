"use client";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { computeDiff, listFields } from "./auditFormat";

type Log = {
  id: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  entityName: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Tạo",
  UPDATE: "Sửa",
  DELETE: "Xóa",
  RESTORE: "Khôi phục",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-success-soft text-success",
  UPDATE: "bg-primary-soft text-primary",
  DELETE: "bg-destructive-soft text-destructive",
  RESTORE: "bg-warning-soft text-warning",
};

const ENTITY_LABELS: Record<string, string> = {
  Campaign: "Chiến dịch",
  CampaignKol: "KOL",
  Product: "Sản phẩm",
  SentOrder: "Đơn gửi",
  ExcelImport: "Import Excel",
  User: "Nhân sự",
  CastCost: "Chi phí cast",
  VideoLink: "Video link",
};

export function AuditClient({
  logs,
  users,
  total,
  page,
  pageSize,
  filterEntity,
  filterAction,
  filterUserId,
}: {
  logs: Log[];
  users: { id: string; name: string; email: string }[];
  total: number;
  page: number;
  pageSize: number;
  filterEntity: string;
  filterAction: string;
  filterUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [detail, setDetail] = useState<Log | null>(null);

  function push(updates: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Lịch sử hoạt động</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {total} hoạt động được ghi · Click 1 dòng để xem chi tiết
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <Label className="text-xs text-muted-foreground">Loại</Label>
          <Select
            value={filterEntity || "__all"}
            onValueChange={(v) => push({ entity: v === "__all" ? "" : v ?? "" })}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <span data-slot="select-value" className="flex flex-1 text-left">
                {filterEntity ? ENTITY_LABELS[filterEntity] ?? filterEntity : "Tất cả"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tất cả</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Hành động</Label>
          <Select
            value={filterAction || "__all"}
            onValueChange={(v) => push({ action: v === "__all" ? "" : v ?? "" })}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <span data-slot="select-value" className="flex flex-1 text-left">
                {filterAction ? ACTION_LABELS[filterAction] ?? filterAction : "Tất cả"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tất cả</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Người làm</Label>
          <Select
            value={filterUserId || "__all"}
            onValueChange={(v) => push({ userId: v === "__all" ? "" : v ?? "" })}
          >
            <SelectTrigger className="h-9 w-[200px]">
              <span data-slot="select-value" className="flex flex-1 text-left line-clamp-1">
                {filterUserId
                  ? users.find((u) => u.id === filterUserId)?.name ?? "—"
                  : "Tất cả"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tất cả</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bảng */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Thời gian</th>
              <th className="px-4 py-3 font-medium">Người</th>
              <th className="px-4 py-3 font-medium">Hành động</th>
              <th className="px-4 py-3 font-medium">Đối tượng</th>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Chưa có hoạt động nào khớp filter.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-muted/60 cursor-pointer"
                  onClick={() => setDetail(l)}
                >
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDateTime(l.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-foreground">{l.userName}</div>
                    <div className="text-xs text-muted-foreground">{l.userEmail}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      label={ACTION_LABELS[l.action] ?? l.action}
                      colorClass={ACTION_COLORS[l.action]}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {ENTITY_LABELS[l.entity] ?? l.entity}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{l.entityName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm">
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Trang {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => push({ page: String(page - 1) })}
            >
              ← Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => push({ page: String(page + 1) })}
            >
              Sau →
            </Button>
          </div>
        </div>
      )}

      <DetailDialog log={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function DetailDialog({
  log,
  onClose,
}: {
  log: Log | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {log &&
              `${ACTION_LABELS[log.action]} ${ENTITY_LABELS[log.entity]} — ${
                log.entityName ?? log.entityId
              }`}
          </DialogTitle>
        </DialogHeader>
        {log && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <Kv label="Thời gian" value={formatDateTime(log.createdAt)} />
              <Kv label="Người làm" value={`${log.userName} (${log.userEmail})`} />
              <Kv label="Loại" value={ENTITY_LABELS[log.entity] ?? log.entity} />
              <Kv label="Hành động" value={ACTION_LABELS[log.action] ?? log.action} />
            </div>
            <FriendlyDiff log={log} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FriendlyDiff({ log }: { log: Log }) {
  // UPDATE — diff giữa before và after
  if (log.action === "UPDATE") {
    const diff = computeDiff(log.beforeJson, log.afterJson);
    if (diff.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">
          Không có trường nào thay đổi đáng kể.
        </div>
      );
    }
    return (
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Đã đổi {diff.length} thông tin
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-1/4">Thông tin</th>
                <th className="px-3 py-2 text-left font-medium">Trước</th>
                <th className="px-3 py-2 text-left font-medium">Sau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {diff.map((d) => (
                <tr key={d.field}>
                  <td className="px-3 py-2 text-foreground font-medium align-top">
                    {d.label}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-block px-2 py-0.5 rounded bg-destructive-soft text-destructive text-xs">
                      {d.before}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-block px-2 py-0.5 rounded bg-success-soft text-success text-xs">
                      {d.after}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // CREATE — danh sách field đã tạo
  if (log.action === "CREATE") {
    const fields = listFields(log.afterJson);
    if (fields.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">Không có thông tin chi tiết.</div>
      );
    }
    return (
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Thông tin khi tạo
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {fields.map((f) => (
                <tr key={f.field}>
                  <td className="px-3 py-2 text-muted-foreground w-1/3 align-top">{f.label}</td>
                  <td className="px-3 py-2 text-foreground align-top">{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // DELETE — hiện snapshot trước xoá
  if (log.action === "DELETE") {
    const fields = listFields(log.beforeJson);
    if (fields.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">
          Đã xoá. Không có dữ liệu chi tiết.
        </div>
      );
    }
    return (
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Thông tin trước khi xoá
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {fields.map((f) => (
                <tr key={f.field}>
                  <td className="px-3 py-2 text-muted-foreground w-1/3 align-top">{f.label}</td>
                  <td className="px-3 py-2 text-foreground align-top">{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // RESTORE
  if (log.action === "RESTORE") {
    return (
      <div className="text-sm text-foreground">
        Đã khôi phục đối tượng đã xoá trước đó.
      </div>
    );
  }

  return null;
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
