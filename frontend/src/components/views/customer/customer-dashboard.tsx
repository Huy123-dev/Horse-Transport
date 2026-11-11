"use client";

/**
 * ============================================================================
 * EQUIDELI — BẢNG ĐIỀU KHIỂN KHÁCH HÀNG (CUSTOMER DASHBOARD)
 * ============================================================================
 * Màn hình trang chủ dành cho Khách hàng (`CUSTOMER`) sau khi đăng nhập.
 *
 * Cơ chế hoạt động:
 * 1. Sử dụng `Promise.allSettled` để tải song song 3 nguồn dữ liệu độc lập:
 *    - `/transport-requests/my`: Danh sách yêu cầu vận chuyển của khách hàng
 *    - `/horses/my-horses`: Danh sách hồ sơ ngựa thuộc sở hữu của khách hàng
 *    - `/my/invoices`: Danh sách hóa đơn của khách hàng
 *    (Việc dùng `Promise.allSettled` đảm bảo nếu 1 API phụ gặp lỗi, các phần còn lại
 *    của bảng điều khiển vẫn hiển thị bình thường).
 * 2. Kiểm tra trạng thái hạn chế tài khoản (`/blacklist/my-status`):
 *    Nếu tài khoản đang bị hạn chế (`isRestricted = true`), ẩn nút "Tạo yêu cầu"
 *    và hiển thị biểu ngữ cảnh báo `CustomerRestrictedBanner`.
 * 3. Hiển thị 3 thẻ `StatCard` (Hồ sơ ngựa, Yêu cầu vận chuyển, Hóa đơn), biểu đồ
 *    tỷ lệ trạng thái đơn hàng `StatusPieChart` và 5 yêu cầu gần đây nhất.
 * ============================================================================
 */

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
import { CustomerRestrictedBanner } from "@/components/views/customer/customer-restricted-banner";

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
  const [isRestricted, setIsRestricted] = useState(false);

  /** Tải toàn bộ số liệu tổng quan của Khách hàng */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reqResult, horseResult, invResult] = await Promise.allSettled([
        apiGet<CustomerRequest[]>("/transport-requests/my"),
        apiGet<CustomerHorse[]>("/horses/my-horses"),
        apiGet<CustomerInvoice[]>("/my/invoices"),
      ]);

      // Chỉ báo lỗi toàn trang nếu cả 3 API đều thất bại
      if (
        reqResult.status === "rejected" &&
        horseResult.status === "rejected" &&
        invResult.status === "rejected"
      ) {
        const firstErr = reqResult.reason;
        throw firstErr instanceof Error ? firstErr : new Error("Không thể tải bảng điều khiển.");
      }

      if (reqResult.status === "fulfilled") {
        setRequests(reqResult.value ?? []);
      }

      if (horseResult.status === "fulfilled") {
        setHorseCount(horseResult.value?.length ?? 0);
      }

      if (invResult.status === "fulfilled") {
        setInvoiceCount(invResult.value?.length ?? 0);
      }

      // Kiểm tra xem tài khoản khách hàng có đang bị hạn chế tạo đơn mới hay không
      try {
        const bl = await apiGet<{ restricted: boolean }>("/blacklist/my-status");
        setIsRestricted(bl.restricted);
      } catch {
        // Không chặn giao diện nếu không kiểm tra được trạng thái hạn chế
      }
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
          !isRestricted ? (
            <Button onClick={() => navigate("request-create")} className="gap-2 btn-press">
              <FileText className="h-4 w-4" /> Tạo yêu cầu
            </Button>
          ) : null
        }
      />

      {/* Biểu ngữ cảnh báo nếu tài khoản khách hàng đang bị hạn chế */}
      <CustomerRestrictedBanner />

      {/* 3 Thẻ chỉ số thống kê (StatCard) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Hồ sơ ngựa" value={horseCount} icon={<Heart className="h-6 w-6" />} tone="info" />
        <StatCard label="Yêu cầu vận chuyển" value={requests.length} icon={<FileText className="h-6 w-6" />} tone="warning" />
        <StatCard label="Hóa đơn" value={invoiceCount} icon={<Receipt className="h-6 w-6" />} tone="success" />
      </div>

      {/* Gợi ý khởi tạo hồ sơ ngựa đầu tiên cho khách hàng mới */}
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

      {/* Biểu đồ tròn phân bố tình trạng các yêu cầu vận chuyển */}
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

      {/* Danh sách 5 yêu cầu vận chuyển gần đây nhất */}
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
