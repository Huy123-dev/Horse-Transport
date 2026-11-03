"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, LayoutDashboard, Heart, FileText, Receipt, Bell, Truck, Users, Route, ShieldCheck, ClipboardCheck, Stethoscope, PackageCheck, Plus, Sun, CornerDownLeft, type LucideIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ROLE_LABELS } from "@/lib/constants";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  group: string;
  action: () => void;
  keywords?: string;
};

export function CommandPalette() {
  const { user, navigate } = useAppStore();
  const { toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, []);


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleOpenChange, open]);


  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, [open]);

  const commands: CommandItem[] = [];


  const navItems: { view: ViewKey; label: string; icon: LucideIcon }[] = [
    { view: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { view: "horses", label: "Hồ sơ ngựa", icon: Heart },
    { view: "requests", label: "Yêu cầu vận chuyển", icon: FileText },
    { view: "invoices", label: "Hóa đơn & Thanh toán", icon: Receipt },
    { view: "notifications", label: "Thông báo", icon: Bell },
    { view: "trips", label: "Chuyến vận chuyển", icon: Truck },
  ];

  const roleNav: Record<string, { view: ViewKey; label: string; icon: LucideIcon }[]> = {
    CUSTOMER: [...navItems, { view: "recovery-dashboard", label: "Theo dõi hồi phục", icon: Stethoscope }],
    TRANSPORT_SPECIALIST: [{ view: "dashboard", label: "Tổng quan", icon: LayoutDashboard }, { view: "plans", label: "Kế hoạch & điểm dừng", icon: Route }, { view: "inspections", label: "Hồ sơ thẩm định", icon: ClipboardCheck }, { view: "compliance", label: "Kiểm dịch & Thông quan", icon: ShieldCheck }, { view: "notifications", label: "Thông báo", icon: Bell }],
    LOGISTICS_MANAGER: [{ view: "dashboard", label: "Tổng quan", icon: LayoutDashboard }, { view: "approvals", label: "Phê duyệt đơn hàng", icon: FileText }, { view: "trips", label: "Chuyến vận chuyển", icon: Truck }, { view: "invoices", label: "Hóa đơn & Thanh toán", icon: Receipt }, { view: "staff", label: "Quản lý nhân sự", icon: Users }, { view: "notifications", label: "Thông báo", icon: Bell }],
    FLEET_COORDINATOR: [{ view: "dashboard", label: "Tổng quan", icon: LayoutDashboard }, { view: "plans", label: "Lập kế hoạch lộ trình", icon: Route }, { view: "trips", label: "Chuyến đang vận hành", icon: Truck }, { view: "fleet", label: "Đội xe & Phương tiện", icon: PackageCheck }, { view: "notifications", label: "Thông báo", icon: Bell }],
    DRIVER: [{ view: "dashboard", label: "Tổng quan", icon: LayoutDashboard }, { view: "trips", label: "Chuyến được giao", icon: Truck }, { view: "notifications", label: "Thông báo", icon: Bell }],
    ESCORT: [{ view: "dashboard", label: "Tổng quan", icon: LayoutDashboard }, { view: "trips", label: "Chuyến được giao", icon: Truck }, { view: "notifications", label: "Thông báo", icon: Bell }],
    DRIVER_ESCORT: [{ view: "dashboard", label: "Tổng quan", icon: LayoutDashboard }, { view: "trips", label: "Chuyến được giao", icon: Truck }, { view: "notifications", label: "Thông báo", icon: Bell }],
  };

  const myNav = roleNav[user?.roleId || ""] || navItems;
  myNav.forEach((item) => {
    commands.push({
      id: `nav-${item.view}`,
      label: item.label,
      description: "Đi đến trang",
      icon: item.icon,
      group: "Điều hướng",
      action: () => { navigate(item.view); handleOpenChange(false); },
      keywords: item.view,
    });
  });


  if (user?.roleId === "CUSTOMER") {
    commands.push({
      id: "action-create-request",
      label: "Tạo yêu cầu vận chuyển mới",
      description: "Tạo đơn vận chuyển ngựa đua",
      icon: Plus,
      group: "Thao tác",
      action: () => { navigate("request-create"); handleOpenChange(false); },
    });
  }
  commands.push({
    id: "action-toggle-theme",
    label: "Đổi giao diện sáng/tối",
    description: "Chuyển đổi giữa light mode và dark mode",
    icon: Sun,
    group: "Thao tác",
    action: () => { toggleTheme(); handleOpenChange(false); },
    keywords: "dark light theme theme",
  });

  const filteredCommands = query.trim().length < 2
    ? commands
    : commands.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()) || c.keywords?.toLowerCase().includes(query.trim().toLowerCase()));

  const allItems = filteredCommands;
  const lastIndex = Math.max(allItems.length - 1, 0);
  const activeIndex = Math.min(selectedIndex, lastIndex);


  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, lastIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = allItems[activeIndex];
      if (item) item.action();
    }
  }, [activeIndex, allItems, lastIndex]);


  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);


  const grouped: Record<string, CommandItem[]> = {};
  allItems.forEach((item) => {
    (grouped[item.group] = grouped[item.group] || []).push(item);
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0" onKeyDown={handleKeyDown}>
        <DialogTitle className="sr-only">Bảng lệnh EQUIDELI</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:block">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto scrollbar-equideli">
          {query.trim().length >= 2 && (
            <p role="status" className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              Tìm kiếm hiện hỗ trợ các lệnh và trang trong ứng dụng.
            </p>
          )}
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Search className="h-8 w-8 opacity-40" />
              <p className="text-sm">{query.trim().length < 2 ? "Gõ để lọc lệnh hoặc trang" : "Không tìm thấy lệnh hoặc trang"}</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-2">
                  <div className="px-4 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                  </div>
                  {items.map((item) => {
                    const idx = allItems.indexOf(item);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        data-idx={idx}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === activeIndex ? "bg-primary/10" : "hover:bg-muted/50"}`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${idx === activeIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.label}</p>
                          {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
                        </div>
                        {idx === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="rounded border bg-card px-1 font-mono">↑↓</kbd> điều hướng</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-card px-1 font-mono">↵</kbd> chọn</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-card px-1 font-mono">ESC</kbd> đóng</span>
          </div>
          <span>EQUIDELI · {ROLE_LABELS[user?.roleId || ""]}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
