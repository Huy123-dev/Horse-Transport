"use client";

import { useAppStore } from "@/store/app-store";
import { Flag, Mail, Phone, MapPin } from "lucide-react";

export function PublicFooter() {
  const { navigatePublic, setIntendedDestination } = useAppStore();

  const handleCreateRequest = () => {
    setIntendedDestination("request-create");
    navigatePublic("login");
  };

  return (
    <footer className="border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <img src="/equideli-logo.png" alt="EQUIDELI" className="h-10 w-10 rounded-lg object-cover ring-1 ring-sidebar-primary/30" />
              <div>
                <p className="text-base font-extrabold tracking-tight">EQUIDELI</p>
                <p className="text-[11px] text-sidebar-foreground/60">Equine Elite Delivery</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-sidebar-foreground/60">
              Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới — an toàn, đúng kế hoạch.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Điều hướng</p>
            <div className="space-y-2">
              <button onClick={() => navigatePublic("home")} className="block text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">Trang chủ</button>
              <button onClick={() => navigatePublic("services")} className="block text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">Dịch vụ vận chuyển</button>
              <button onClick={() => navigatePublic("process")} className="block text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">Quy trình vận chuyển</button>
              <button onClick={() => navigatePublic("specialist-info")} className="block text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">Chuyên viên Thủ tục & Kiểm dịch</button>
              <button onClick={() => navigatePublic("coordinator-info")} className="block text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">Điều phối Đội xe & Lộ trình</button>
              <button onClick={() => navigatePublic("driver-info")} className="block text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">Tài xế / Nhân viên đi kèm</button>
              <button onClick={handleCreateRequest} className="block text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">Đăng nhập / Tạo yêu cầu</button>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Liên hệ</p>
            <div className="space-y-2 text-sm text-sidebar-foreground/70">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> contact@equideli.com</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +84 28 000 0000</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Củ Chi, TP. Hồ Chí Minh</p>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Lưu ý</p>
            <p className="text-xs leading-relaxed text-sidebar-foreground/50">
              EQUIDELI — Nền tảng quản lý và vận chuyển ngựa đua chuyên nghiệp. Các quy định thú y, kiểm dịch,
              nhập xuất khẩu được tuân thủ nghiêm ngặt theo quy định quốc tế.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-sidebar-border pt-6 text-center text-xs text-sidebar-foreground/40">
          <p>EQUIDELI © 2026 · Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới</p>
        </div>
      </div>
    </footer>
  );
}
