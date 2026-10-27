"use client";

import { useAppStore, type ViewKey } from "@/store/app-store";
import { ChevronRight, Home } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { motion } from "framer-motion";

const VIEW_LABELS: Record<string, string> = {
  dashboard: "Tổng quan",
  horses: "Hồ sơ ngựa",
  "horse-detail": "Chi tiết ngựa",
  requests: "Yêu cầu vận chuyển",
  "request-create": "Tạo yêu cầu",
  "request-detail": "Chi tiết đơn",
  inspections: "Hồ sơ thẩm định",
  "inspection-detail": "Thẩm định đơn",
  approvals: "Phê duyệt đơn hàng",
  "approval-detail": "Phê duyệt",
  plans: "Lập kế hoạch lộ trình",
  "plan-create": "Tạo kế hoạch",
  "plan-detail": "Chi tiết kế hoạch",
  trips: "Chuyến vận chuyển",
  "trip-detail": "Chi tiết chuyến",
  staff: "Quản lý nhân sự",
  fleet: "Đội xe & Phương tiện",
  notifications: "Thông báo",
  compliance: "Kiểm dịch & Thông quan",
  invoices: "Hóa đơn & Thanh toán",
  "invoice-detail": "Chi tiết hóa đơn",
  "recovery-dashboard": "Theo dõi hồi phục",
};

const VIEW_PARENTS: Record<string, string> = {
  "horse-detail": "horses",
  "request-create": "requests",
  "request-detail": "requests",
  "inspection-detail": "inspections",
  "approval-detail": "approvals",
  "plan-create": "plans",
  "plan-detail": "plans",
  "trip-detail": "trips",
  "invoice-detail": "invoices",
};

export function Breadcrumbs() {
  const { user, view, navigate } = useAppStore();
  if (!user) return null;


  const crumbs: { view: ViewKey; label: string }[] = [];
  const rootLabel = ROLE_LABELS[user.roleId] || "Trang chủ";


  const parent = VIEW_PARENTS[view];
  if (parent) {
    crumbs.push({ view: "dashboard" as ViewKey, label: rootLabel });
    crumbs.push({ view: parent as ViewKey, label: VIEW_LABELS[parent] || parent });
    crumbs.push({ view, label: VIEW_LABELS[view] || view });
  } else if (view !== "dashboard") {
    crumbs.push({ view: "dashboard" as ViewKey, label: rootLabel });
    crumbs.push({ view, label: VIEW_LABELS[view] || view });
  } else {

    crumbs.push({ view: "dashboard" as ViewKey, label: rootLabel });
  }

  return (
    <motion.nav
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-1 text-xs text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <Home className="h-3.5 w-3.5" />
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        const isActive = crumb.view === view;
        return (
          <span key={idx} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            {isLast ? (
              <span className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => navigate(crumb.view)}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </motion.nav>
  );
}
