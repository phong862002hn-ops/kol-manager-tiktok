"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: "STAFF" | "MANAGER";
  };
};

type Props = {
  submissionId: string;
  /** Cho phép gửi comment mới. False khi xem version cũ. */
  canPost: boolean;
};

export function CommentThread({ submissionId, canPost }: Props) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/submissions/${submissionId}/comments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  async function handlePost() {
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    const res = await fetch(`/api/submissions/${submissionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setPosting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Gửi comment thất bại");
      return;
    }
    const created: Comment = await res.json();
    setComments((prev) => [...(prev ?? []), created]);
    setBody("");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {comments === null ? (
          <div className="text-xs text-muted-foreground">Đang tải...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-muted-foreground">Chưa có bình luận.</div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{c.author.name}</span>
                <span className="text-[10px] uppercase tracking-wider">
                  {c.author.role === "MANAGER" ? "Quản lý" : "Nhân viên"}
                </span>
                <span>·</span>
                <span>{formatDateTime(c.createdAt)}</span>
              </div>
              <div className="whitespace-pre-wrap text-foreground">{c.body}</div>
            </div>
          ))
        )}
      </div>

      {canPost ? (
        <div className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bình luận..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            disabled={posting}
          />
          <Button onClick={handlePost} disabled={posting || !body.trim()}>
            Gửi
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Không thể bình luận trên version cũ.
        </p>
      )}
    </div>
  );
}
