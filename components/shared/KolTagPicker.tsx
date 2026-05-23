"use client";
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

type Tag = { id: string; name: string; color: string };

export function KolTagPicker({
  username,
  initialTags,
  onChange,
}: {
  username: string;
  initialTags: Tag[];
  onChange?: (tags: Tag[]) => void;
}) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [open, setOpen] = useState(false);
  const { data: allTags } = useSWR<Tag[]>(open ? "/api/tags" : null, fetcher);

  const tagIds = new Set(tags.map((t) => t.id));

  async function toggle(tag: Tag) {
    const has = tagIds.has(tag.id);
    if (has) {
      const res = await fetch(
        `/api/kol-tags?username=${encodeURIComponent(username)}&tagId=${tag.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Gỡ tag thất bại");
        return;
      }
      const next = tags.filter((t) => t.id !== tag.id);
      setTags(next);
      onChange?.(next);
    } else {
      const res = await fetch("/api/kol-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, tagId: tag.id }),
      });
      if (!res.ok) {
        toast.error("Gắn tag thất bại");
        return;
      }
      const next = [...tags, tag];
      setTags(next);
      onChange?.(next);
    }
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
          style={{ backgroundColor: t.color }}
        >
          {t.name}
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="text-[11px] text-primary hover:text-primary border border-dashed border-blue-300 rounded-full px-2 py-0.5 hover:bg-primary-soft"
            >
              + Tag
            </button>
          }
        />
        <PopoverContent className="w-64 p-0">
          <div className="p-2 max-h-64 overflow-y-auto">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider px-2 py-1">
              Chọn tag
            </div>
            {!allTags ? (
              <div className="text-xs text-muted-foreground/70 text-center py-4">
                Đang tải...
              </div>
            ) : allTags.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                Chưa có tag nào.
                <br />
                <a href="/tags" className="text-primary hover:underline">
                  Tạo tag mới →
                </a>
              </div>
            ) : (
              <div className="space-y-0.5">
                {allTags.map((t) => {
                  const active = tagIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-2 ${
                        active ? "bg-primary-soft" : ""
                      }`}
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="flex-1">{t.name}</span>
                      {active && <span className="text-primary text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t px-2 py-2">
            <a
              href="/tags"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              ⚙ Quản lý tag
            </a>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
