"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PRESETS: { label: string; days: number }[] = [
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(d: number) {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function push(nextFrom: string, nextTo: string) {
    const sp = new URLSearchParams(params.toString());
    if (nextFrom) sp.set("from", nextFrom);
    else sp.delete("from");
    if (nextTo) sp.set("to", nextTo);
    else sp.delete("to");
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function applyPreset(days: number) {
    push(daysAgoISO(days), todayISO());
  }

  function clear() {
    push("", "");
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <Label htmlFor="from" className="text-xs text-muted-foreground whitespace-nowrap">
          Từ
        </Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => push(e.target.value, to)}
          onClick={(e) => {
            const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
            el.showPicker?.();
          }}
          className="h-8 w-[140px] cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-1">
        <Label htmlFor="to" className="text-xs text-muted-foreground whitespace-nowrap">
          đến
        </Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => push(from, e.target.value)}
          onClick={(e) => {
            const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
            el.showPicker?.();
          }}
          className="h-8 w-[140px] cursor-pointer"
        />
      </div>
      {PRESETS.map((p) => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          onClick={() => applyPreset(p.days)}
          className="h-8 text-xs"
        >
          {p.label}
        </Button>
      ))}
      {(from || to) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="h-8 text-xs text-muted-foreground"
        >
          Xóa
        </Button>
      )}
    </div>
  );
}
