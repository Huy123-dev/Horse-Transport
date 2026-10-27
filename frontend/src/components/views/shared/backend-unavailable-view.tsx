"use client";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { AlertTriangle } from "lucide-react";

export function BackendUnavailableView({ title }: {
  title: string;
  endpoint: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} icon={<AlertTriangle className="h-5 w-5" />} />
      <EmptyState
        illustration="no-data"
        title="Chức năng hiện chưa khả dụng"
        description="Tính năng này chưa sẵn sàng cho tài khoản của bạn. Vui lòng liên hệ bộ phận vận hành nếu cần trợ giúp."
      />
    </div>
  );
}
