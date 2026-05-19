"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DailySalesPoint = {
  day: string;
  sales: number;
  grossCents: number;
  netCents: number;
};

export type TopProduct = {
  productId: string;
  productName: string;
  salesCount: number;
  grossCents: number;
  netCents: number;
};

export type SubscriptionMix = {
  tier: string;
  count: number;
};

const TIER_COLORS: Record<string, string> = {
  free: "#6b7280",
  supporter: "#f97316",
  vip: "#facc15",
};

const TIER_LABELS: Record<string, string> = {
  free: "Ücretsiz",
  supporter: "Destekçi",
  vip: "VIP",
};

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatShortDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  } catch {
    return iso.slice(5);
  }
}

const TOOLTIP_STYLE = {
  background: "#0a0a0a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.75rem",
  fontSize: "0.75rem",
} as const;

function ChartWrapper({ children, height = 240 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function DailyRevenueChart({ data }: { data: DailySalesPoint[] }) {
  return (
    <ChartWrapper>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="day"
          tickFormatter={formatShortDay}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value) => `$${(Number(value) / 100).toFixed(0)}`}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: "#fff", fontWeight: 600 }}
          formatter={(value, key) => {
            const num = Number(value);
            const k = String(key);
            return k === "sales"
              ? [num, "Satış"]
              : [formatUsd(num), k === "grossCents" ? "Brüt" : "Net"];
          }}
          labelFormatter={(label) => formatShortDay(String(label))}
        />
        <Line type="monotone" dataKey="grossCents" stroke="#f97316" strokeWidth={2} dot={false} name="Brüt" />
        <Line type="monotone" dataKey="netCents" stroke="#facc15" strokeWidth={2} dot={false} name="Net" />
      </LineChart>
    </ChartWrapper>
  );
}

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  return (
    <ChartWrapper height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          type="number"
          tickFormatter={(value) => `$${(Number(value) / 100).toFixed(0)}`}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey="productName"
          type="category"
          stroke="rgba(255,255,255,0.6)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [formatUsd(Number(value)), "Brüt"]}
        />
        <Bar dataKey="grossCents" fill="#f97316" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ChartWrapper>
  );
}

export function SubscriptionMixChart({ data }: { data: SubscriptionMix[] }) {
  return (
    <ChartWrapper height={200}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? "#6b7280"} stroke="rgba(255,255,255,0.05)" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => [Number(value), TIER_LABELS[String(name)] ?? String(name)]}
        />
      </PieChart>
    </ChartWrapper>
  );
}

export { TIER_COLORS, TIER_LABELS };
