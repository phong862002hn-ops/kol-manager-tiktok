type Row = { name: string; value: number; label?: string };

export function HorizontalBarChart({
  data,
  color = "hsl(var(--primary))",
  nameWidth = 120,
  valueWidth = 70,
}: {
  data: Row[];
  color?: string;
  nameWidth?: number;
  valueWidth?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        Chưa có dữ liệu
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div
          key={`${d.name}-${i}`}
          className="flex items-center gap-2.5 text-[12.5px]"
        >
          <div
            className="truncate text-foreground"
            style={{ width: nameWidth }}
            title={d.name}
          >
            {d.name}
          </div>
          <div className="flex-1 h-[18px] rounded-[3px] bg-muted relative overflow-hidden">
            <div
              className="absolute inset-0 rounded-[3px] transition-[width] duration-500"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: color,
              }}
            />
          </div>
          <div
            className="text-right text-muted-foreground tabular-nums text-xs"
            style={{ width: valueWidth }}
          >
            {d.label ?? d.value}
          </div>
        </div>
      ))}
    </div>
  );
}
