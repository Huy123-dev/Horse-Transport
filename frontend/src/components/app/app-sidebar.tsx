"use client";

/**
 * ============================================================================
 * EQUIDELI — THANH ĐIỀU HƯỚNG BÊN TRÁI (APP SIDEBAR)
 * ============================================================================
 * File này chịu trách nhiệm hiển thị menu điều hướng phù hợp với từng vai trò
 * (Role-Based Navigation) trong 6 nhóm người dùng của hệ thống EQUIDELI:
 * 1. CUSTOMER (Khách hàng / Chủ ngựa)
 * 2. LOGISTICS_MANAGER (Quản lý Logistics)
 * 3. TRANSPORT_SPECIALIST (Chuyên viên Thẩm định & Kiểm dịch)
 * 4. FLEET_COORDINATOR (Điều phối Đội xe & Lộ trình)
 * 5. DRIVER (Tài xế vận chuyển chuyên dụng)
 * 6. ESCORT (Nhân viên chăm sóc & hộ tống ngựa)
 * ============================================================================
 */

import { useAppStore, type ViewKey } from "@/store/app-store";
import { getRoleConfig } from "@/components/app/role-badge";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Heart, FileText, ShieldAlert,
  Route, Truck, Users, Bell, ClipboardList, PackageCheck,
  ScrollText, Receipt, Stethoscope, DollarSign, Scale, MessageSquare, type LucideIcon,
} from "lucide-react";

/** Cấu trúc một mục điều hướng trên Sidebar */
type NavItem = { key: ViewKey; label: string; icon: LucideIcon };

/**
 * Danh sách các màn hình chức năng được phân quyền theo từng Role.
 * Mỗi Role chỉ nhìn thấy các chức năng thuộc phạm vi trách nhiệm của mình.
 */
const NAV_BY_ROLE: Record<string, NavItem[]> = {
  // 1. Khách hàng: Quản lý hồ sơ ngựa, gửi yêu cầu vận chuyển, theo dõi hồi phục và xem hóa đơn
  CUSTOMER: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "horses", label: "Hồ sơ ngựa", icon: Heart },
    { key: "requests", label: "Yêu cầu vận chuyển", icon: FileText },
    { key: "recovery-dashboard", label: "Theo dõi hồi phục", icon: Stethoscope },
    { key: "invoices", label: "Hóa đơn & Thanh toán", icon: Receipt },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  // 2. Chuyên viên vận tải: Thẩm định yêu cầu cấp 2 và lập kế hoạch điểm dừng
  TRANSPORT_SPECIALIST: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "approvals", label: "Thẩm định yêu cầu", icon: ScrollText },
    { key: "plans", label: "Kế hoạch & điểm dừng", icon: Route },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  // 3. Quản lý Logistics: Phê duyệt đơn hàng cấp 1, giám sát toàn bộ chuyến đi, hóa đơn, nhân sự, danh sách hạn chế và nhật ký kiểm toán
  LOGISTICS_MANAGER: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "approvals", label: "Phê duyệt đơn hàng", icon: ScrollText },
    { key: "trips", label: "Chuyến vận chuyển", icon: Truck },
    { key: "invoices", label: "Hóa đơn & Thanh toán", icon: Receipt },
    { key: "claims-management", label: "Khiếu nại & Bồi thường", icon: Scale },
    { key: "feedback-management", label: "Đánh giá dịch vụ", icon: MessageSquare },
    { key: "staff", label: "Quản lý nhân sự", icon: Users },
    { key: "blacklist", label: "Danh sách hạn chế", icon: ShieldAlert },
    { key: "pricing", label: "Bảng giá dịch vụ", icon: DollarSign },
    { key: "audit-logs", label: "Nhật ký kiểm toán", icon: ClipboardList },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  // 4. Điều phối đội xe: Lập lộ trình vận chuyển, phân công xe/nhân sự và quản lý phương tiện
  FLEET_COORDINATOR: [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "plans", label: "Lập kế hoạch lộ trình", icon: Route },
    { key: "trips", label: "Chuyến đang vận hành", icon: Truck },
    { key: "fleet", label: "Đội xe & Phương tiện", icon: PackageCheck },
    { key: "notifications", label: "Thông báo", icon: Bell },
  ],
  // 5 & 6. Nhân sự hiện trường (Tài xế và Nhân viên hộ tống/chăm sóc ngựa)
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

  // Lấy danh sách menu mặc định theo roleId của người dùng đang đăng nhập
  let items = NAV_BY_ROLE[user.roleId] || [];

  // Phân biệt chi tiết nhãn hiển thị giữa Tài xế (DRIVER) và Nhân viên hộ tống (ESCORT)
  // vì trong cơ sở dữ liệu cả hai có thể dùng chung roleId = "DRIVER_ESCORT" và phân nhánh qua trường staffType
  const isFieldStaff =
    user.roleId === "DRIVER_ESCORT" ||
    user.roleId === "DRIVER" ||
    user.roleId === "ESCORT";

  if (isFieldStaff) {
    if (user.staffType === "DRIVER" || user.roleId === "DRIVER") {
      items = [
        { key: "dashboard", label: "Tổng quan tài xế", icon: LayoutDashboard },
        { key: "trips", label: "Chuyến được giao", icon: Truck },
        { key: "notifications", label: "Thông báo", icon: Bell },
      ];
    } else if (user.staffType === "ESCORT" || user.roleId === "ESCORT") {
      items = [
        { key: "dashboard", label: "Tổng quan chăm sóc", icon: LayoutDashboard },
        { key: "trips", label: "Chuyến tham gia", icon: Truck },
        { key: "notifications", label: "Thông báo", icon: Bell },
      ];
    }
  }

  // Lấy thông tin cấu hình màu sắc & biểu tượng nhận diện riêng cho từng Role
  const roleConfig = getRoleConfig(user.roleId, user.staffType);
  const RoleIcon = roleConfig.icon;

  return (
    <aside className="leather-texture flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Khu vực Logo & Thương hiệu EQUIDELI */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <img src="/equideli-logo.png" alt="EQUIDELI" className="h-10 w-10 rounded-lg object-cover ring-1 ring-sidebar-primary/30" />
        <div>
          <p className="text-base font-extrabold tracking-tight leading-none text-[var(--text-primary)]">EQUIDELI</p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-tight mt-0.5">Vận chuyển ngựa đua</p>
        </div>
      </div>

      {/* Thẻ hiển thị chức vụ hiện tại của người dùng trong Sidebar */}
      <div className="px-4 pt-4">
        <div
          className="rounded-lg px-3 py-2 border transition-all"
          style={{
            backgroundColor: roleConfig.color + "18",
            borderColor: roleConfig.color + "55",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Chức vụ hiện tại</p>
            <RoleIcon className="h-3.5 w-3.5 shrink-0" style={{ color: roleConfig.color }} />
          </div>
          <p className="text-sm font-bold tracking-tight mt-1 truncate" style={{ color: roleConfig.color }}>
            {roleConfig.label}
          </p>
        </div>
      </div>

      {/* Danh sách các mục điều hướng theo Role */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-equideli px-3 py-4">
        {items.map((item) => {
          // Đánh dấu mục menu đang mở (bao gồm cả khi đang ở trang chi tiết con, ví dụ "invoice-detail" thuộc "invoices")
          const active = view === item.key || (view.includes(item.key) && item.key !== "dashboard");
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-sidebar-accent hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Chân trang Sidebar */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          EQUIDELI © 2026<br />Hệ thống quản lý vận chuyển<br />ngựa đua xuyên biên giới
        </p>
      </div>
    </aside>
  );
}
