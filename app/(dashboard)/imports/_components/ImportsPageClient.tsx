"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";

type ImportRow = {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  rowCount: number;
};

export function ImportsPageClient({ imports }: { imports: ImportRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter((f) => f.name.match(/\.(xlsx|xls|csv)$/i));
    const invalid = Array.from(files).length - valid.length;
    if (invalid > 0) {
      toast.error(`${invalid} file không phải .xlsx/.xls/.csv — bỏ qua`);
    }
    if (valid.length === 0) return;

    setUploading(true);
    let totalRows = 0;
    let failed = 0;
    for (const file of valid) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/imports", { method: "POST", body: fd });
      if (!res.ok) {
        failed += 1;
        continue;
      }
      const data = await res.json();
      totalRows += data.rowCount ?? 0;
    }
    setUploading(false);
    if (failed > 0) {
      toast.error(`${failed}/${valid.length} file thất bại`);
    }
    if (totalRows > 0) {
      toast.success(
        `Đã import ${formatNumber(totalRows)} dòng từ ${valid.length - failed} file`
      );
    }
    router.refresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDelete(row: ImportRow) {
    if (!confirm(`Xóa file "${row.fileName}" và ${row.rowCount} dòng?`)) return;
    const res = await fetch(`/api/imports/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Xóa thất bại");
      return;
    }
    toast.success("Đã xóa");
    router.refresh();
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Import File Excel</h1>
      <p className="text-gray-500 mt-1 text-sm">
        Upload file <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">creator_order_all_*.xlsx</code> từ TikTok Shop Center
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
        className={`mt-6 border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
        }`}
      >
        <div className="text-4xl mb-2">📤</div>
        <p className="text-gray-700">
          Kéo file (nhiều file cũng được) vào đây hoặc{" "}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-blue-600 hover:underline font-medium"
            disabled={uploading}
          >
            chọn file
          </button>
        </p>
        <p className="text-xs text-gray-500 mt-1">.xlsx, .xls, .csv — hỗ trợ multi-file</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          }}
        />
        {uploading && (
          <p className="text-sm text-blue-600 mt-3">Đang xử lý...</p>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mt-10 mb-3">
        Lịch sử import ({imports.length})
      </h2>
      {imports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          Chưa có file nào.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium text-right">Số dòng</th>
                <th className="px-4 py-3 font-medium">Người upload</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {imports.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {i.fileName}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatNumber(i.rowCount)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{i.uploadedBy}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDateTime(i.uploadedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(i)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
