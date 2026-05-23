"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatVnd } from "@/lib/format";

type Row = { username: string; revenue: number; commission: number };

function tickShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function RevenueChart({ data }: { data: Row[] }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-sm font-semibold text-foreground mb-1">
        Top {data.length} KOL theo doanh thu
      </div>
      <div className="text-xs text-muted-foreground mb-4">
        So sánh doanh thu vs hoa hồng
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 60, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="username"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={70}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={tickShort}
            />
            <Tooltip
              formatter={(v) => formatVnd(Number(v))}
              labelFormatter={(label) => `@${label}`}
              contentStyle={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name="Doanh thu" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="commission" name="Hoa hồng" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
