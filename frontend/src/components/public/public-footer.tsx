"use client";

/**
 * ============================================================================
 * EQUIDELI — CHÂN TRANG CÔNG KHAI (PUBLIC FOOTER)
 * ============================================================================
 * Hiển thị ở cuối các trang giới thiệu công khai (Landing Page, Dịch vụ, Quy trình).
 * Cung cấp liên kết điều hướng nhanh, thông tin liên hệ và ghi chú pháp lý.
 * ============================================================================
 */

import { useAppStore } from "@/store/app-store";
import { Mail, Phone, MapPin } from "lucide-react";

export function PublicFooter() {
  const { navigatePublic, setIntendedDestination } = useAppStore();

  /**
   * Khi khách truy cập chưa đăng nhập nhấn "Đăng nhập / Tạo yêu cầu",
   * lưu lại đích đến mong muốn ("request-create") để sau khi đăng nhập thành công
   * hệ thống tự động chuyển thẳng tới màn hình tạo yêu cầu vận chuyển.
   */
  const handleCreateRequest = () => {
    setIntendedDestination("request-create");
    navigatePublic("login");
  };

  return (
    <footer className="border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Cột 1: Nhận diện thương hiệu */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <img src="/equideli-logo.png" alt="EQUIDELI" className="h-10 w-10 rounded-lg object-cover ring-1 ring-sidebar-primary/30" />
              <div>
                <p className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">EQUIDELI</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Vận chuyển ngựa đua cao cấp</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
              Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới — an toàn, đúng kế hoạch.
            </p>
          </div>

          {/* Cột 2: Liên kết điều hướng công khai */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Điều hướng</p>
            <div className="space-y-2">
              <button onClick={() => navigatePublic("home")} className="block text-sm text-[var(--text-secondary)] hover:text-sidebar-primary">Trang chủ</button>
              <button onClick={() => navigatePublic("services")} className="block text-sm text-[var(--text-secondary)] hover:text-sidebar-primary">Dịch vụ vận chuyển</button>
              <button onClick={() => navigatePublic("process")} className="block text-sm text-[var(--text-secondary)] hover:text-sidebar-primary">Quy trình vận chuyển</button>
              <button onClick={() => navigatePublic("specialist-info")} className="block text-sm text-[var(--text-secondary)] hover:text-sidebar-primary">Chuyên viên Thủ tục & Kiểm dịch</button>
              <button onClick={() => navigatePublic("coordinator-info")} className="block text-sm text-[var(--text-secondary)] hover:text-sidebar-primary">Điều phối Đội xe & Lộ trình</button>
              <button onClick={() => navigatePublic("driver-info")} className="block text-sm text-[var(--text-secondary)] hover:text-sidebar-primary">Tài xế / Nhân viên đi kèm</button>
              <button onClick={handleCreateRequest} className="block text-sm text-[var(--text-secondary)] hover:text-sidebar-primary">Đăng nhập / Tạo yêu cầu</button>
            </div>
          </div>

          {/* Cột 3: Thông tin liên hệ */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Liên hệ</p>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> contact@equideli.com</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +84 28 000 0000</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Củ Chi, TP. Hồ Chí Minh</p>
            </div>
          </div>

          {/* Cột 4: Lưu ý quy chuẩn thú y & kiểm dịch quốc tế */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Lưu ý</p>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              EQUIDELI — Nền tảng quản lý và vận chuyển ngựa đua chuyên nghiệp. Các quy định thú y, kiểm dịch,
              nhập xuất khẩu được tuân thủ nghiêm ngặt theo quy định quốc tế.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-sidebar-border pt-6 text-center text-xs text-[var(--text-muted)]">
          <p>EQUIDELI © 2026 · Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới</p>
        </div>
      </div>
    </footer>
  );
}
