"use client";

import { useAppStore } from "@/store/app-store";
import { ArrowLeft } from "lucide-react";

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  const { navigatePublic } = useAppStore();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-sidebar">
      {/* Background horse image — fixed, covers full viewport */}
      <div className="fixed inset-0 z-0">
        <img
          src="/equideli-login-bg.png"
          alt="Ngựa đua trong khoang vận chuyển chuyên nghiệp"
          className="h-full w-full object-cover object-center sm:object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar/90 via-sidebar/60 to-sidebar/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar/50 via-transparent to-sidebar/30" />
      </div>

      {/* Auth card — centered, page scrolls naturally if content is tall */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="rounded-2xl border border-primary/20 bg-card/95 shadow-2xl backdrop-blur-md">
          <div className="p-8">
            {/* Logo */}
            <div className="mb-6 flex flex-col items-center gap-3">
              <img src="/equideli-logo.png" alt="EQUIDELI" className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/20" />
              <div className="text-center">
                <p className="text-xl font-extrabold tracking-tight text-foreground">EQUIDELI</p>
                <p className="text-xs text-muted-foreground">Vận chuyển ngựa đua xuyên biên giới</p>
              </div>
            </div>

            {/* Title */}
            {title && (
              <div className="mb-6 text-center">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            )}

            {/* Content */}
            {children}

            {/* Back to home */}
            <div className="mt-6 text-center">
              <button
                onClick={() => navigatePublic("home")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-3 w-3" /> Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
