"use client";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

type Props =
  | { campaignKolId: string; kolUsername?: undefined; emptyHint?: string }
  | { campaignKolId?: undefined; kolUsername: string; emptyHint?: string };

export function KolCommentThread(props: Props) {
  const qs = props.campaignKolId
    ? `?campaignKolId=${props.campaignKolId}`
    : `?kolUsername=${encodeURIComponent(props.kolUsername!)}`;

  const { data: comments, isLoading, mutate } = useSWR<Comment[]>(
    `/api/comments${qs}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: text.trim(),
        ...(props.campaignKolId
          ? { campaignKolId: props.campaignKolId }
          : { kolUsername: props.kolUsername }),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.error ?? "Gửi thất bại");
      return;
    }
    setText("");
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá comment này?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Xoá thất bại");
      return;
    }
    mutate();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết bình luận về KOL này..."
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <Button type="submit" disabled={submitting || !text.trim()}>
          {submitting ? "..." : "Gửi"}
        </Button>
      </form>
      <div className="text-[11px] text-gray-400">
        ⌘+Enter để gửi nhanh
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-xs text-gray-400 text-center py-4">Đang tải...</div>
        ) : !comments || comments.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">
            {props.emptyHint ?? "Chưa có bình luận. Hãy là người đầu tiên."}
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="border border-gray-200 rounded-md p-3 bg-gray-50/50"
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="text-sm font-medium text-gray-900">
                  {c.user.name}
                </div>
                <div className="text-[11px] text-gray-500">
                  {formatDateTime(c.createdAt)}
                </div>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {c.content}
              </div>
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-[10px] text-red-600 hover:underline"
                >
                  Xoá
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
