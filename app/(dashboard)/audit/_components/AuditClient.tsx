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
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  RESTORE: "bg-yellow-100 text-yellow-700",
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
        <h1 className="text-2xl font-semibold text-gray-900">Lịch sử hoạt động</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {total} hoạt động được ghi · Click 1 dòng để xem chi tiết
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <Label className="text-xs text-gray-500">Loại</Label>
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
          <Label className="text-xs text-gray-500">Hành động</Label>
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
          <Label className="text-xs text-gray-500">Người làm</Label>
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3 font-medium">Thời gian</th>
              <th className="px-4 py-3 font-medium">Người</th>
              <th className="px-4 py-3 font-medium">Hành động</th>
              <th className="px-4 py-3 font-medium">Đối tượng</th>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Chưa có hoạt động nào khớp filter.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setDetail(l)}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {formatDateTime(l.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{l.userName}</div>
                    <div className="text-xs text-gray-500">{l.userEmail}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      label={ACTION_LABELS[l.action] ?? l.action}
                      colorClass={ACTION_COLORS[l.action]}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {ENTITY_LABELS[l.entity] ?? l.entity}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{l.entityName ?? "—"}</td>
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
          <div className="text-gray-500">
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
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Dialog
      open={!!log}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setShowRaw(false);
        }
      }}
    >
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

            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
              >
                {showRaw ? "Ẩn dữ liệu kỹ thuật" : "Xem dữ liệu kỹ thuật (JSON)"}
              </button>
              {showRaw && (
                <div className="mt-3 space-y-3">
                  <Kv label="Entity ID" value={<code className="text-xs">{log.entityId}</code>} />
                  {log.beforeJson != null && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Trước khi đổi
                      </div>
                      <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs overflow-x-auto max-h-72">
                        {JSON.stringify(log.beforeJson, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.afterJson != null && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Sau khi đổi
                      </div>
                      <pre className="bg-green-50 border border-green-200 rounded p-3 text-xs overflow-x-auto max-h-72">
                        {JSON.stringify(log.afterJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
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
        <div className="text-sm text-gray-500 italic">
          Không có trường nào thay đổi đáng kể.
        </div>
      );
    }
    return (
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Đã đổi {diff.length} thông tin
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-1/4">Thông tin</th>
                <th className="px-3 py-2 text-left font-medium">Trước</th>
                <th className="px-3 py-2 text-left font-medium">Sau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {diff.map((d) => (
                <tr key={d.field}>
                  <td className="px-3 py-2 text-gray-700 font-medium align-top">
                    {d.label}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs">
                      {d.before}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-block px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs">
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
        <div className="text-sm text-gray-500 italic">Không có thông tin chi tiết.</div>
      );
    }
    return (
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Thông tin khi tạo
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {fields.map((f) => (
                <tr key={f.field}>
                  <td className="px-3 py-2 text-gray-500 w-1/3 align-top">{f.label}</td>
                  <td className="px-3 py-2 text-gray-900 align-top">{f.value}</td>
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
        <div className="text-sm text-gray-500 italic">
          Đã xoá. Không có dữ liệu chi tiết.
        </div>
      );
    }
    return (
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Thông tin trước khi xoá
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {fields.map((f) => (
                <tr key={f.field}>
                  <td className="px-3 py-2 text-gray-500 w-1/3 align-top">{f.label}</td>
                  <td className="px-3 py-2 text-gray-900 align-top">{f.value}</td>
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
      <div className="text-sm text-gray-700">
        Đã khôi phục đối tượng đã xoá trước đó.
      </div>
    );
  }

  return null;
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-900">{value}</div>
    </div>
  );
}
