import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  deltaDir,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaDir?: "up" | "down";
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground p-4 transition-shadow duration-200 hover:shadow-md",
        className
      )}
    >
      <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              deltaDir === "up"
                ? "text-success"
                : deltaDir === "down"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {deltaDir === "up" ? (
              <ArrowUp className="h-3 w-3" />
            ) : deltaDir === "down" ? (
              <ArrowDown className="h-3 w-3" />
            ) : null}
            {delta}
          </span>
        )}
      </div>
      {sub && (
        <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}
