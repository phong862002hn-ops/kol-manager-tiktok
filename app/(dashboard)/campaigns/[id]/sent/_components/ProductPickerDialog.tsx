"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ProductOpt = {
  id: string;
  tiktokId: string;
  name: string;
  sku: string | null;
};

export function ProductPickerDialog({
  products,
  excludeIds,
  onAdd,
  trigger,
}: {
  products: ProductOpt[];
  excludeIds: string[];
  onAdd: (items: ProductOpt[]) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => !excludeSet.has(p.tiktokId))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.tiktokId.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
        );
      });
  }, [products, excludeSet, query]);

  function toggle(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  }

  function toggleAll() {
    if (filtered.every((p) => selected.has(p.tiktokId))) {
      // bỏ chọn tất cả trong filtered
      const s = new Set(selected);
      for (const p of filtered) s.delete(p.tiktokId);
      setSelected(s);
    } else {
      const s = new Set(selected);
      for (const p of filtered) s.add(p.tiktokId);
      setSelected(s);
    }
  }

  function handleAdd() {
    const items = products.filter((p) => selected.has(p.tiktokId));
    onAdd(items);
    reset();
    setOpen(false);
  }

  function reset() {
    setSelected(new Set());
    setQuery("");
  }

  const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.tiktokId));
  const someChecked = filtered.some((p) => selected.has(p.tiktokId));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Chọn sản phẩm</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Tìm theo tên, ID TikTok hoặc SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px]">
          {products.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Chưa có sản phẩm nào trong campaign. Vào tab &quot;Sản phẩm&quot; để thêm trước.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {query
                ? `Không tìm thấy sản phẩm khớp với "${query}"`
                : "Tất cả sản phẩm đã được chọn rồi."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked && !allChecked;
                      }}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Tên</th>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">ID TikTok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/60 cursor-pointer"
                    onClick={() => toggle(p.tiktokId)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.tiktokId)}
                        onChange={() => toggle(p.tiktokId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.sku ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {p.tiktokId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="flex-row items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Đã chọn <span className="font-medium text-foreground">{selected.size}</span> sản phẩm
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAdd} disabled={selected.size === 0}>
              Thêm {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
