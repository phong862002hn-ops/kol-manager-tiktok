"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KolTagPicker } from "@/components/shared/KolTagPicker";
import { KolCommentThread } from "@/components/shared/KolCommentThread";
import { formatNumber, formatVnd } from "@/lib/format";

type Tag = { id: string; name: string; color: string };
type Row = {
  username: string;
  instances: { campaignId: string; campaignName: string; campaignKolId: string }[];
  tags: Tag[];
  commentCount: number;
  orders: number;
  revenue: number;
  commission: number;
};

export function KolsListClient({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [openComment, setOpenComment] = useState<Row | null>(null);

  const filtered = query.trim()
    ? rows.filter((r) =>
        r.username.toLowerCase().includes(query.trim().toLowerCase())
      )
    : rows;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Danh sách KOL</h1>
      <p className="text-gray-500 mt-1 text-sm">
        {rows.length} KOL · Click 💬 để xem/viết bình luận
      </p>

      <div className="mt-4 mb-3">
        <Input
          placeholder="Tìm KOL theo username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          {query ? `Không tìm thấy "${query}"` : "Chưa có KOL nào."}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium min-w-[250px]">Tags</th>
                <th className="px-4 py-3 font-medium">Chiến dịch</th>
                <th className="px-4 py-3 font-medium text-right">Đơn</th>
                <th className="px-4 py-3 font-medium text-right">Doanh thu</th>
                <th className="px-4 py-3 font-medium text-right">Hoa hồng</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((k) => (
                <tr key={k.username} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">@{k.username}</td>
                  <td className="px-4 py-3">
                    <KolTagPicker
                      username={k.username}
                      initialTags={k.tags}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {k.instances.length === 1 ? (
                      <Link
                        href={`/campaigns/${k.instances[0].campaignId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {k.instances[0].campaignName}
                      </Link>
                    ) : (
                      <div className="space-y-0.5">
                        {k.instances.slice(0, 2).map((inst) => (
                          <Link
                            key={inst.campaignKolId}
                            href={`/campaigns/${inst.campaignId}`}
                            className="block text-blue-600 hover:underline"
                          >
                            {inst.campaignName}
                          </Link>
                        ))}
                        {k.instances.length > 2 && (
                          <span className="text-gray-400">
                            +{k.instances.length - 2} khác
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatNumber(k.orders)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatVnd(k.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatVnd(k.commission)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenComment(k)}
                      className={k.commentCount > 0 ? "text-blue-600" : ""}
                    >
                      💬
                      {k.commentCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold">
                          {k.commentCount}
                        </span>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!openComment} onOpenChange={(o) => !o && setOpenComment(null)}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Bình luận về @{openComment?.username}
              <div className="text-xs font-normal text-gray-500 mt-1">
                Thread chung cross-campaign · Tất cả nhân sự thấy
              </div>
            </DialogTitle>
          </DialogHeader>
          {openComment && (
            <KolCommentThread
              kolUsername={openComment.username}
              emptyHint="Chưa có ai bình luận về KOL này."
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
