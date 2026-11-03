"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard, Search, Plus, Navigation, Sun, X } from "lucide-react";

type ShortcutItem = { keys: string[]; description: string; icon: any };

const SHORTCUTS: { group: string; items: ShortcutItem[] }[] = [
  {
    group: "Tìm kiếm & Lệnh",
    items: [
      { keys: ["Ctrl", "K"], description: "Mở bảng lệnh (tìm kiếm + điều hướng + thao tác)", icon: Search },
      { keys: ["Esc"], description: "Đóng bảng lệnh / dropdown", icon: X },
      { keys: ["?"], description: "Mở hướng dẫn phím tắt (cửa sổ này)", icon: Keyboard },
    ],
  },
  {
    group: "Điều hướng nhanh",
    items: [
      { keys: ["G", "D"], description: "Về trang Tổng quan", icon: Navigation },
      { keys: ["G", "R"], description: "Đi đến Yêu cầu vận chuyển", icon: Navigation },
      { keys: ["G", "H"], description: "Đi đến Hồ sơ ngựa", icon: Navigation },
      { keys: ["G", "I"], description: "Đi đến Hóa đơn & Thanh toán", icon: Navigation },
      { keys: ["G", "N"], description: "Đi đến Thông báo", icon: Navigation },
      { keys: ["G", "T"], description: "Đi đến Chuyến vận chuyển", icon: Navigation },
    ],
  },
  {
    group: "Thao tác",
    items: [
      { keys: ["N"], description: "Tạo yêu cầu vận chuyển mới (chỉ Khách hàng)", icon: Plus },
      { keys: ["Ctrl", "K"], description: "Đổi giao diện sáng/tối (qua bảng lệnh)", icon: Sun },
    ],
  },
];

export function HelpModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">Phím tắt EQUIDELI</DialogTitle>
            <DialogDescription className="text-xs">Sử dụng phím tắt để thao tác nhanh hơn</DialogDescription>
          </div>
        </div>

        <div className="mt-4 space-y-5">
          {SHORTCUTS.map((section) => (
            <div key={section.group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.group}</p>
              <div className="space-y-2">
                {section.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, j) => (
                          <span key={j} className="flex items-center gap-1">
                            {j > 0 && <span className="text-xs text-muted-foreground">+</span>}
                            <kbd className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs font-semibold shadow-sm">{k}</kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Nhấn <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">Esc</kbd> hoặc <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">?</kbd> để đóng
        </p>
      </DialogContent>
    </Dialog>
  );
}
