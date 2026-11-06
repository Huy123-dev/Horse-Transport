"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

// Thoroughbred Racing Chart Palette (Dark Mode Only)
const CHART_COLORS = [
  "#7B4935", // 1. Chestnut
  "#B8895B", // 2. Palomino / Copper
  "#47744F", // 3. Racing Green
  "#D4AB82", // 4. Champagne
  "#A53D35", // 5. Chestnut Red
  "#99918A", // 6. Gray Coat
  "#5C4A3A", // 7. Dark Umber
  "#F0C477", // 8. Warning Gold
];

const DARK_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#2B201A",
  border: "1px solid #5A4238",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#FFF8EE",
  boxShadow: "0 8px 24px -4px rgba(21, 14, 11, 0.75)",
};

export function StatusPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-[var(--text-secondary)]">Không có dữ liệu</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={85}
          innerRadius={45}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#2B201A" strokeWidth={1} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={DARK_TOOLTIP_STYLE}
          itemStyle={{ color: "#E6D8C8" }}
          labelStyle={{ color: "#FFF8EE", fontWeight: "600" }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px", color: "#C9B8A8" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyVolumeChart({ data }: { data: { month: string; requests: number; revenue: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-[var(--text-secondary)]">Không có dữ liệu</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8895B" stopOpacity={0.95} />
            <stop offset="95%" stopColor="#713F2C" stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#382A23" vertical={false} />
        <XAxis dataKey="month" stroke="#C9B8A8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#C9B8A8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={DARK_TOOLTIP_STYLE}
          itemStyle={{ color: "#E6D8C8" }}
          labelStyle={{ color: "#FFF8EE", fontWeight: "600" }}
          cursor={{ fill: "#382A23", fillOpacity: 0.4 }}
        />
        <Bar dataKey="requests" name="Số đơn" fill="url(#colorRequests)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueAreaChart({ data }: { data: { month: string; revenue: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-[var(--text-secondary)]">Không có dữ liệu</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#47744F" stopOpacity={0.75} />
            <stop offset="95%" stopColor="#47744F" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#382A23" vertical={false} />
        <XAxis dataKey="month" stroke="#C9B8A8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#C9B8A8" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={DARK_TOOLTIP_STYLE}
          itemStyle={{ color: "#E6D8C8" }}
          labelStyle={{ color: "#FFF8EE", fontWeight: "600" }}
        />
        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#9CC49B" strokeWidth={2} fill="url(#colorRevenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TripVolumeChart({ data }: { data: { month: string; trips: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-[var(--text-secondary)]">Không có dữ liệu</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8895B" stopOpacity={0.7} />
            <stop offset="95%" stopColor="#B8895B" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#382A23" vertical={false} />
        <XAxis dataKey="month" stroke="#C9B8A8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#C9B8A8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={DARK_TOOLTIP_STYLE}
          itemStyle={{ color: "#E6D8C8" }}
          labelStyle={{ color: "#FFF8EE", fontWeight: "600" }}
        />
        <Area type="monotone" dataKey="trips" name="Số chuyến" stroke="#D4AB82" strokeWidth={2} fill="url(#colorTrips)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex h-[260px] items-center justify-center">
      <div className="skeleton-shimmer h-full w-full rounded-lg" />
    </div>
  );
}

export function SpendingBreakdownChart({ data }: { data: { name: string; amount: number; status?: string }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-[var(--text-secondary)]">Chưa có dữ liệu chi tiêu</div>;
  }
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="space-y-2.5">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-medium text-[var(--text-body)]">{item.name}</span>
            <span className="font-semibold text-[var(--text-primary)]">{item.amount.toLocaleString("vi-VN")}đ</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--copper-light)]"
              style={{ width: `${(item.amount / max) * 100}%`, animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
