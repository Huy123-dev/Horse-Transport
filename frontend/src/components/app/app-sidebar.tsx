"use client";

import { useAppStore, type ViewKey } from "@/store/app-store";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Heart, FileText, ClipboardCheck, ShieldCheck,
  Route, Truck, Users, Bell, Flag, ClipboardList, PackageCheck,
  ScrollText, CheckCircle2, Receipt, Stethoscope, DollarSign, Scale, MessageSquare, type LucideIcon,
} from "lucide-react";

type NavItem = { key: ViewKey; label: string; icon: LucideIcon };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  CUSTOMER: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "horses", label: "Hồ sơ ngựa", icon: Heart },
    { key: "requests", label: "Yêu cầu vận chuyển", icon: FileText },
    { key: "recovery-dashboard", label: "Theo dõi hồi phục", icon: Stethoscope },
    { key: "invoices", label: "Hóa đơn & Thanh toán", icon: Receipt },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  TRANSPORT_SPECIALIST: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "plans", label: "Kế hoạch & điểm dừng", icon: Route },
    { key: "inspections", label: "Hồ sơ thẩm định", icon: ClipboardCheck },
    { key: "compliance", label: "Kiểm dịch & Thông quan", icon: ShieldCheck },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  LOGISTICS_MANAGER: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "approvals", label: "Phê duyệt đơn hàng", icon: ScrollText },
    { key: "trips", label: "Chuyến vận chuyển", icon: Truck },
    { key: "invoices", label: "Hóa đơn & Thanh toán", icon: Receipt },
    { key: "claims-management", label: "Khiếu nại & Bồi thường", icon: Scale },
    { key: "feedback-management", label: "Đánh giá dịch vụ", icon: MessageSquare },
    { key: "staff", label: "Quản lý nhân sự", icon: Users },
    { key: "pricing", label: "Bảng giá dịch vụ", icon: DollarSign },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  FLEET_COORDINATOR: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "plans", label: "Lập kế hoạch lộ trình", icon: Route },
    { key: "trips", label: "Chuyến đang vận hành", icon: Truck },
    { key: "fleet", label: "Đội xe & Phương tiện", icon: PackageCheck },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  DRIVER_ESCORT: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "trips", label: "Chuyến được giao", icon: Truck },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  DRIVER: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "trips", label: "Chuyến được giao", icon: Truck },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  ESCORT: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "trips", label: "Chuyến được giao", icon: Truck },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
};

export function AppSidebar() {
  const { user, view, navigate } = useAppStore();
  if (!user) return null;

  let items = NAV_BY_ROLE[user.roleId] || [];
  let roleTitle = ROLE_LABELS[user.roleId] || user.roleId;

  if (user.roleId === "DRIVER_ESCORT" || user.roleId === "DRIVER" || user.roleId === "ESCORT") {
    if (user.staffType === "DRIVER" || user.roleId === "DRIVER") {
      roleTitle = "Tài xế (Hiện trường)";
      items = [
        { key: "dashboard", label: "Tổng quan tài xế", icon: LayoutDashboard },
        { key: "trips", label: "Chuyến được giao", icon: Truck },
        { key: "notifications", label: "Thông báo", icon: Bell },
      ];
    } else if (user.staffType === "ESCORT" || user.roleId === "ESCORT") {
      roleTitle = "Nhân viên đi kèm (Hiện trường)";
      items = [
        { key: "dashboard", label: "Tổng quan chăm sóc", icon: LayoutDashboard },
        { key: "trips", label: "Chuyến tham gia", icon: Truck },
        { key: "notifications", label: "Thông báo", icon: Bell },
      ];
    } else {
      roleTitle = "Nhân viên hiện trường (Chưa phân loại)";
    }
  }

  return (
    <aside className="leather-texture flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <img src="/equideli-logo.png" alt="EQUIDELI" className="h-10 w-10 rounded-lg object-cover ring-1 ring-sidebar-primary/30" />
        <div>
          <p className="text-base font-extrabold tracking-tight leading-none">EQUIDELI</p>
          <p className="text-[11px] text-sidebar-foreground/60 leading-tight mt-0.5">Vận chuyển ngựa đua</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4">
        <div className="rounded-lg bg-sidebar-accent px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Vai trò</p>
          <p className="text-sm font-semibold text-sidebar-accent-foreground">{roleTitle}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-equideli px-3 py-4">
        {items.map((item) => {
          const active = view === item.key || (view.includes(item.key) && item.key !== "dashboard");
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-sidebar-foreground/40 leading-relaxed">
          EQUIDELI © 2026<br />Hệ thống quản lý vận chuyển<br />ngựa đua xuyên biên giới
        </p>
      </div>
    </aside>
  );
}
