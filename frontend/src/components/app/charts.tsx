"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

const CHART_COLORS = [
  "#7B4935", "#B8895B", "#47744F", "#B77722", "#A53D35",
  "#D4AB82", "#5C4A3A", "#8C5A14",
];

export function StatusPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Không có dữ liệu</div>;
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
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFEFC",
            border: "1px solid #E7D7C3",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyVolumeChart({ data }: { data: { month: string; requests: number; revenue: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Không có dữ liệu</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7B4935" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#7B4935" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7D7C3" vertical={false} />
        <XAxis dataKey="month" stroke="#76685E" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#76685E" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFEFC",
            border: "1px solid #E7D7C3",
            borderRadius: "8px",
            fontSize: "13px",
          }}
          cursor={{ fill: "#E7D7C3", fillOpacity: 0.3 }}
        />
        <Bar dataKey="requests" name="Số đơn" fill="url(#colorRequests)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueAreaChart({ data }: { data: { month: string; revenue: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Không có dữ liệu</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#47744F" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#47744F" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7D7C3" vertical={false} />
        <XAxis dataKey="month" stroke="#76685E" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#76685E" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFEFC",
            border: "1px solid #E7D7C3",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        />
        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#47744F" strokeWidth={2} fill="url(#colorRevenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TripVolumeChart({ data }: { data: { month: string; trips: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Không có dữ liệu</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B8895B" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#B8895B" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7D7C3" vertical={false} />
        <XAxis dataKey="month" stroke="#76685E" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#76685E" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFEFC",
            border: "1px solid #E7D7C3",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        />
        <Area type="monotone" dataKey="trips" name="Số chuyến" stroke="#B8895B" strokeWidth={2} fill="url(#colorTrips)" />
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
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu chi tiêu</div>;
  }
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="space-y-2.5">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-medium">{item.name}</span>
            <span className="font-semibold text-foreground">{item.amount.toLocaleString("vi-VN")}đ</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--copper)]"
              style={{ width: `${(item.amount / max) * 100}%`, animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
