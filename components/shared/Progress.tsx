import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  color = "hsl(var(--primary))",
  height = "h-1",
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={cn(
        "w-full rounded-full bg-muted overflow-hidden",
        height,
        className
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
