"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatVnd, formatNumber } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#94a3b8", // last = "Khác" gray
];

type OtherRow = {
  username: string;
  orders: number;
  revenue: number;
  commission: number;
};

export function DistributionChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mb-4">{subtitle}</div>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(props: { percent?: number }) =>
                props.percent != null ? `${(props.percent * 100).toFixed(0)}%` : ""
              }
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatNumber(Number(v))}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CurrencyDistributionChart({
  title,
  subtitle,
  data,
  othersDetail,
}: {
  title: string;
  subtitle?: string;
  data: { name: string; value: number }[];
  othersDetail?: OtherRow[];
}) {
  const [othersOpen, setOthersOpen] = useState(false);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const hasOthers = othersDetail && othersDetail.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mb-4">{subtitle}</div>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(props: { percent?: number }) =>
                props.percent != null ? `${(props.percent * 100).toFixed(0)}%` : ""
              }
              labelLine={false}
              onClick={(slice: { name?: string }) => {
                if (hasOthers && slice.name?.startsWith("Khác")) {
                  setOthersOpen(true);
                }
              }}
              cursor={hasOthers ? "pointer" : undefined}
            >
              {data.map((d, i) => {
                const isOther = d.name.startsWith("Khác");
                return (
                  <Cell
                    key={i}
                    fill={isOther ? "#94a3b8" : COLORS[i % (COLORS.length - 1)]}
                  />
                );
              })}
            </Pie>
            <Tooltip
              formatter={(v) => formatVnd(Number(v))}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {hasOthers && (
        <button
          type="button"
          onClick={() => setOthersOpen(true)}
          className="mt-2 text-xs text-primary hover:underline w-full text-center"
        >
          Click vào lát &quot;Khác&quot; hoặc bấm đây để xem chi tiết {othersDetail.length} KOL còn lại →
        </button>
      )}

      {hasOthers && (
        <Dialog open={othersOpen} onOpenChange={setOthersOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Chi tiết &quot;Khác&quot; — {othersDetail.length} KOL còn lại
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b sticky top-0">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 w-10">#</th>
                    <th className="px-3 py-2 font-medium">KOL</th>
                    <th className="px-3 py-2 font-medium text-right">Đơn</th>
                    <th className="px-3 py-2 font-medium text-right">Doanh thu</th>
                    <th className="px-3 py-2 font-medium text-right">Hoa hồng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {othersDetail.map((r, i) => (
                    <tr key={r.username} className="hover:bg-muted/60">
                      <td className="px-3 py-2 text-muted-foreground">{i + 11}</td>
                      <td className="px-3 py-2 font-medium">@{r.username}</td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(r.orders)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatVnd(r.revenue)}</td>
                      <td className="px-3 py-2 text-right">{formatVnd(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
