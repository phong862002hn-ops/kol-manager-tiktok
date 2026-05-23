"use client";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import { formatNumber, formatVnd } from "@/lib/format";

const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function tickShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function CountPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <EmptyChart />;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={75}
            label={(p: { percent?: number }) =>
              p.percent != null ? `${(p.percent * 100).toFixed(0)}%` : ""
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CurrencyPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <EmptyChart />;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={75}
            label={(p: { percent?: number }) =>
              p.percent != null ? `${(p.percent * 100).toFixed(0)}%` : ""
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => formatVnd(Number(v))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GmvBarChart({ data }: { data: { name: string; gmv: number }[] }) {
  if (data.length === 0 || data.every((d) => d.gmv === 0)) {
    return <EmptyChart />;
  }
  const top = data.slice(0, 8);
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={tickShort} />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            tick={{ fontSize: 11, fill: "#374151" }}
          />
          <Tooltip
            formatter={(v) => formatVnd(Number(v))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="gmv" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TimeLineChart({
  data,
  color = "#2563eb",
}: {
  data: { date: string; count: number }[];
  color?: string;
}) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <EmptyChart />;
  }
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 12, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            interval={2}
          />
          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
          <Tooltip
            formatter={(v) => formatNumber(Number(v))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6 }}
          >
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: 10, fill: "#6b7280" }}
              formatter={(v: unknown) => (Number(v) > 0 ? String(v) : "")}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-gray-400">
      📊 Chưa có dữ liệu thống kê
    </div>
  );
}
