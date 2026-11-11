"use client";

import { Search } from "lucide-react";

export function GlobalSearch() {
  return (
    <div className="relative hidden md:block">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          disabled
          aria-label="Tìm kiếm"
          title="Tìm kiếm toàn hệ thống hiện chưa khả dụng"
          placeholder="Tìm kiếm"
          className="h-9 w-72 cursor-not-allowed rounded-lg border border-border bg-muted/40 pl-9 pr-8 text-sm placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
