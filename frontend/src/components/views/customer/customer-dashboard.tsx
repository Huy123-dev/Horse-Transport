"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, LayoutDashboard, Heart, Receipt } from "lucide-react";
import { formatDate, requestCode, transportRequestStatusLabel } from "@/lib/constants";
import { StatusPieChart } from "@/components/app/charts";

interface CustomerRequest {
  requestId: string;
  status: string;
  origin?: { name: string };
  destination?: { name: string };
  scheduledDepartureDate: string;
}

interface CustomerHorse {
  horseId: string;
}

interface CustomerInvoice {
  invoiceId: string;
}

export function CustomerDashboard() {
  const { navigate } = useAppStore();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [horseCount, setHorseCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [requestData, horseData, invoiceData] = await Promise.all([
        apiGet<CustomerRequest[]>("/transport-requests/my"),
        apiGet<CustomerHorse[]>("/horses/my-horses"),
        apiGet<CustomerInvoice[]>("/my/invoices"),
      ]);
      setRequests(requestData);
      setHorseCount(horseData.length);
      setInvoiceCount(invoiceData.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải bảng điều khiển.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void loadDashboard()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển Khách hàng"
        description="Theo dõi hồ sơ ngựa, yêu cầu vận chuyển và hóa đơn của bạn"
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Button onClick={() => navigate("request-create")} className="gap-2 btn-press">
            <FileText className="h-4 w-4" /> Tạo yêu cầu
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Hồ sơ ngựa" value={horseCount} icon={<Heart className="h-6 w-6" />} tone="info" />
        <StatCard label="Yêu cầu vận chuyển" value={requests.length} icon={<FileText className="h-6 w-6" />} tone="warning" />
        <StatCard label="Hóa đơn" value={invoiceCount} icon={<Receipt className="h-6 w-6" />} tone="success" />
      </div>

      {horseCount === 0 && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">Bắt đầu bằng hồ sơ ngựa đầu tiên</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tạo hồ sơ để chọn ngựa khi lập yêu cầu vận chuyển.</p>
            </div>
            <Button variant="outline" onClick={() => navigate("horses")}>Thêm hồ sơ ngựa</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Tình trạng yêu cầu</CardTitle></CardHeader>
        <CardContent>
          <StatusPieChart
            data={Object.entries(requests.reduce<Record<string, number>>((counts, request) => {
              const label = transportRequestStatusLabel(request.status);
              counts[label] = (counts[label] ?? 0) + 1;
              return counts;
            }, {})).map(([name, value]) => ({ name, value }))}
          />
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-base">Yêu cầu vận chuyển gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Chưa có yêu cầu vận chuyển"
              description="Tạo yêu cầu đầu tiên để bắt đầu theo dõi hành trình."
            />
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 5).map((request) => (
                <button
                  key={request.requestId}
                  onClick={() => navigate("request-detail", { id: request.requestId })}
                  className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      Yêu cầu {requestCode(request.requestId)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.origin?.name || "—"} → {request.destination?.name || "—"}
                      {" · "}
                      {formatDate(request.scheduledDepartureDate)}
                    </p>
                  </div>
                  <StatusBadge status={transportRequestStatusLabel(request.status)} />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
