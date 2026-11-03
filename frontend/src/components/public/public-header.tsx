"use client";

import { useAppStore } from "@/store/app-store";
import { Flag, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const { publicView, navigatePublic, setIntendedDestination } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleCreateRequest = () => {
    setIntendedDestination("request-create");
    navigatePublic("login");
  };

  const navItems = [
    { key: "home" as const, label: "Trang chủ" },
    { key: "services" as const, label: "Dịch vụ vận chuyển" },
    { key: "process" as const, label: "Quy trình vận chuyển" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button onClick={() => navigatePublic("home")} className="flex items-center gap-3">
          <img src="/equideli-logo.png" alt="EQUIDELI" className="h-10 w-10 rounded-lg object-cover ring-1 ring-primary/20" />
          <div>
            <p className="text-base font-extrabold tracking-tight text-foreground">EQUIDELI</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Vận chuyển ngựa đua</p>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigatePublic(item.key)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                publicView === item.key
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* CTA button + mobile toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateRequest}
            className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:block"
          >
            Tạo yêu cầu
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-border bg-card px-4 py-3 md:hidden">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { navigatePublic(item.key); setMobileOpen(false); }}
              className={cn(
                "block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                publicView === item.key
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted"
              )}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => { handleCreateRequest(); setMobileOpen(false); }}
            className="mt-2 block w-full rounded-lg bg-primary px-3 py-2.5 text-left text-sm font-semibold text-primary-foreground"
          >
            Tạo yêu cầu vận chuyển
          </button>
        </nav>
      )}
    </header>
  );
}
