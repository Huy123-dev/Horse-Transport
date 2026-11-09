"use client";

/**
 * ============================================================================
 * EQUIDELI — BIỂU NGỮ CẢNH BÁO TÀI KHOẢN KHÁCH HÀNG BỊ HẠN CHẾ (RESTRICTED BANNER)
 * ============================================================================
 * Component này được đặt trên đầu Bảng điều khiển Khách hàng (`CustomerDashboard`).
 * Khi người dùng có vai trò `CUSTOMER` đăng nhập, component gọi API
 * `GET /blacklist/my-status` để kiểm tra xem tài khoản có đang nằm trong
 * danh sách hạn chế (`restricted = true`) hay không.
 *
 * Nếu tài khoản đang bị hạn chế:
 * - Hiển thị hộp cảnh báo màu đỏ san hô (`--danger-*`) nêu rõ lý do hạn chế
 *   và số tiền công nợ còn tồn đọng (nếu có).
 * - Cung cấp nút điều hướng nhanh tới màn hình `account-restricted` để khách hàng
 *   tải lên chứng từ thanh toán ngoại tuyến hoặc gửi đơn kiến nghị mở khóa.
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { apiGet } from "@/lib/api-client";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Ánh xạ mã lý do hạn chế từ Backend sang nhãn tiếng Việt dễ hiểu */
const REASON_LABELS: Record<string, string> = {
  UNPAID_INVOICE: "Chưa thanh toán hóa đơn",
  OUTSTANDING_DEBT: "Còn công nợ vận chuyển",
  SERVICE_VIOLATION: "Vi phạm điều kiện dịch vụ",
  INACCURATE_INFO: "Cung cấp thông tin không chính xác",
  TRANSPORT_VIOLATION: "Vi phạm quy định vận chuyển",
  IMPACT_OPERATION: "Có hành vi gây ảnh hưởng dịch vụ",
  OTHER: "Lý do khác",
};

interface CustomerStatusData {
  restricted: boolean;
  currentBlacklist?: {
    blacklistId: string;
    reason: string;
    amountDue?: number | null;
    restrictedAt: string;
  } | null;
}

export function CustomerRestrictedBanner() {
  const { user, navigate } = useAppStore();
  const [status, setStatus] = useState<CustomerStatusData | null>(null);

  useEffect(() => {
    if (user?.roleId !== "CUSTOMER") return;
    let active = true;

    apiGet<CustomerStatusData>("/blacklist/my-status")
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        // Không làm gián đoạn trang chính nếu API kiểm tra trạng thái gặp lỗi mạng tạm thời
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Nếu khách hàng hoạt động bình thường (không bị hạn chế), ẩn hoàn toàn Banner này
  if (!status?.restricted || !status.currentBlacklist) return null;

  const current = status.currentBlacklist;
  const reasonLabel = REASON_LABELS[current.reason] || current.reason;

  return (
    <div className="mb-5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-xs shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--danger)]/20 p-2 text-[var(--danger-fg)] border border-[var(--danger-border)] shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-[var(--danger-fg)] text-sm flex items-center gap-1.5">
              Tài khoản đang bị hạn chế
              {current.amountDue && (
                <span className="text-[var(--text-primary)] text-xs font-normal">
                  — Còn công nợ: <strong className="text-[var(--danger-fg)]">${current.amountDue}</strong>
                </span>
              )}
            </p>
            <p className="text-[var(--text-secondary)] mt-0.5">
              Lý do: <span className="text-[var(--text-primary)] font-medium">{reasonLabel}</span>.
              Bạn không thể tạo yêu cầu vận chuyển mới cho đến khi được Quản lý Logistics mở khóa.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => navigate("account-restricted")}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold h-8 text-xs shrink-0 gap-1.5 self-end sm:self-auto"
        >
          Giải quyết & Gửi kiến nghị
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
