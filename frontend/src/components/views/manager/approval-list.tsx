"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { formatDate, requestCode, transportRequestStatusLabel } from "@/lib/constants";

interface TransportRequest {
  requestId: string;
  customerName: string;
  origin: { name: string };
  destination: { name: string };
  scheduledDepartureDate: string | null;
  status: string;
}

export function ApprovalList() {
  const { navigate } = useAppStore();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRequests(await apiGet<TransportRequest[]>("/transport-requests"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  const pending = requests.filter((request) => {
    const status = request.status.trim().toLowerCase();
    return status === "dang tham dinh" || status === "pending";
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu chờ phê duyệt"
        description="Danh sách lấy trực tiếp từ API transport requests; mở từng yêu cầu để phê duyệt hoặc từ chối."
        icon={<ClipboardCheck className="h-5 w-5" />}
      />
      {pending.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Không có yêu cầu chờ phê duyệt" />
      ) : (
        <div className="space-y-3">
          {pending.map((request) => (
            <button
              key={request.requestId}
              onClick={() => navigate("approval-detail", { id: request.requestId })}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
            >
              <Card className="w-full border-0 shadow-none">
                <CardContent className="flex items-center gap-4 p-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">Yêu cầu {requestCode(request.requestId)}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{request.customerName}</span>
                      <span>{request.origin?.name || "Chưa xác định"} → {request.destination?.name || "Chưa xác định"}</span>
                      <span>Khởi hành: {formatDate(request.scheduledDepartureDate)}</span>
                    </div>
                  </div>
                  <StatusBadge status={transportRequestStatusLabel(request.status)} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
