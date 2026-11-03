"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, ChevronRight, ShieldCheck, Clock } from "lucide-react";
import { formatDate, requestCode, transportRequestStatusLabel } from "@/lib/constants";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransportRequest {
  requestId: string;
  customerName: string;
  origin: { name: string };
  destination: { name: string };
  scheduledDepartureDate: string | null;
  status: string;
}

export function ApprovalList() {
  const { navigate, user } = useAppStore();
  const isSpecialist = user?.roleId === "TRANSPORT_SPECIALIST";
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>(isSpecialist ? "pending_specialist" : "pending_manager");

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

  const isPendingManager = (status: string) => {
    const s = status.trim().toLowerCase();
    return s === "dang tham dinh" || s === "pending";
  };

  const isPendingSpecialist = (status: string) => {
    const s = status.trim().toLowerCase();
    return s === "cho chuyen vien kiem tra" || s === "manager approved" || s === "manager_approved";
  };

  const filtered = requests.filter((request) => {
    if (activeTab === "pending_manager") return isPendingManager(request.status);
    if (activeTab === "pending_specialist") return isPendingSpecialist(request.status);
    return true;
  });

  const countManager = requests.filter((r) => isPendingManager(r.status)).length;
  const countSpecialist = requests.filter((r) => isPendingSpecialist(r.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSpecialist ? "Thẩm định yêu cầu vận chuyển" : "Phê duyệt yêu cầu vận chuyển"}
        description="Quy trình phê duyệt 2 cấp: Logistics Manager chốt báo giá (Cấp 1) → Transport Specialist kiểm tra hồ sơ & pháp lý (Cấp 2)."
        icon={<ClipboardCheck className="h-5 w-5" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="pending_manager" className="gap-2">
            <Clock className="h-4 w-4" />
            <span>Quản lý cấp 1 ({countManager})</span>
          </TabsTrigger>
          <TabsTrigger value="pending_specialist" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Chuyên viên cấp 2 ({countSpecialist})</span>
          </TabsTrigger>
          <TabsTrigger value="all">Tất cả ({requests.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="Không có yêu cầu trong danh mục này"
          description={activeTab === "pending_specialist" ? "Hiện không có đơn nào đang chờ Chuyên viên thẩm định cấp 2." : "Hiện không có đơn nào đang chờ Quản lý thẩm định cấp 1."}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => (
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
                      <span>Khách hàng: {request.customerName}</span>
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
