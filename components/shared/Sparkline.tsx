"use client";
import { useId } from "react";

export function Sparkline({
  data,
  color = "hsl(var(--primary))",
  height = 80,
  showAxis = true,
  axisLabels,
}: {
  data: number[];
  color?: string;
  height?: number;
  showAxis?: boolean;
  axisLabels?: [string, string, string];
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs text-muted-foreground"
      >
        Chưa có dữ liệu
      </div>
    );
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? 100 / (data.length - 1) : 0;
  const points = data
    .map((v, i) => `${i * step},${100 - ((v - min) / range) * 90 - 5}`)
    .join(" ");
  const area = `0,100 ${points} 100,100`;
  const labels = axisLabels ?? ["", "", ""];
  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block w-full h-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#spark-${id})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showAxis && axisLabels && (
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-muted-foreground tabular-nums">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
          <span>{labels[2]}</span>
        </div>
      )}
    </div>
  );
}
