"use client";

import { useAppStore } from "@/store/app-store";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ViewRouter } from "@/components/views/view-router";
import { PageTransition } from "./motion";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { CommandPalette } from "./command-palette";
import { Breadcrumbs } from "./breadcrumbs";
import { HelpModal } from "./help-modal";

export function AppShell() {
  const { sidebarOpen } = useAppStore();
  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — hidden on mobile, toggleable */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <AppSidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => useAppStore.getState().setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Breadcrumbs />
            <div className="mt-3">
              <PageTransition>
                <ViewRouter />
              </PageTransition>
            </div>
          </div>
        </main>
        <footer className="border-t border-border bg-card/50 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
          <p>EQUIDELI — Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới</p>
        </footer>
      </div>
      <CommandPalette />
      <HelpModal />
    </div>
  );
}
