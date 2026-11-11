"use client";

/**
 * ============================================================================
 * EQUIDELI — DANH SÁCH HÓA ĐƠN & QUẢN LÝ THANH TOÁN (INVOICE LIST)
 * ============================================================================
 * Màn hình này dùng chung cho 2 vai trò:
 * - LOGISTICS_MANAGER: Xem toàn bộ hóa đơn, lọc theo trạng thái, phát hành hóa đơn
 *   tự động / thủ công, xuất PDF chuẩn A4 và xuất báo cáo CSV.
 * - CUSTOMER: Xem danh sách hóa đơn của các đơn vận chuyển thuộc về mình,
 *   kiểm tra hạn thanh toán, số tiền còn phải trả và tải hóa đơn PDF chuẩn A4.
 *
 * Nguyên tắc nghiệp vụ quan trọng:
 * - EQUIDELI chỉ quản lý hóa đơn và ghi nhận trạng thái thanh toán ngoại tuyến
 *   (chuyển khoản ngân hàng, tiền mặt, bảo lãnh). Hệ thống KHÔNG tích hợp cổng
 *   thanh toán trực tuyến.
 * - 4 nhãn trạng thái chuẩn tiếng Việt:
 *   + "Chưa thanh toán" (UNPAID)
 *   + "Thanh toán một phần" (PARTIALLY_PAID)
 *   + "Đã thanh toán" (PAID)
 *   + "Quá hạn thanh toán" (OVERDUE)
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Receipt,
  Search,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Loader2,
  Download,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  FileDown,
  MapPin,
} from "lucide-react";
import {
  formatDate,
  formatMoney,
  invoiceCode,
  requestCode,
  normalizePaymentStatus,
  paymentStatusLabel,
} from "@/lib/constants";
import { exportToCSV } from "@/lib/csv-export";
import { exportInvoiceToA4Pdf } from "@/lib/invoice-pdf";
import { getInvoiceCsvRows, INVOICE_CSV_HEADERS } from "@/lib/invoice-csv";
import { ListStatsBar } from "@/components/app/list-stats-bar";

export { normalizePaymentStatus, paymentStatusLabel };

/** Lịch sử một lần cập nhật trạng thái thanh toán của hóa đơn */
export interface InvoicePaymentHistoryItem {
  historyId: string;
  oldStatus: string;
  newStatus: string;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string | null;
  notes: string | null;
  updatedBy: string;
  updatedByName: string;
  createdAt: string;
}

/** Thông tin tóm tắt của từng cá thể ngựa trong hóa đơn */
export interface InvoiceHorseSummary {
  horseId: string;
  name: string;
  microchipId: string | null;
  breed: string | null;
  gender: string | null;
  birthYear: number | null;
}

/** Thông tin chi tiết hành trình vận chuyển gắn với hóa đơn */
export interface InvoiceTransportDetails {
  requestId: string;
  planId: string | null;
  originName: string | null;
  originCountry: string | null;
  destinationName: string | null;
  destinationCountry: string | null;
  departureDate: string | null;
  arrivalDate: string | null;
  completedAt: string | null;
  recipientName: string | null;
  horseCount: number;
  horses: InvoiceHorseSummary[];
}

/** Dòng hạng mục dịch vụ hiển thị trên bảng kê chi tiết hóa đơn A4 */
export interface InvoiceLineItemRecord {
  lineNo: number;
  itemCode: string | null;
  description: string;
  category: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  includedInPackage: boolean;
}

/** Cấu trúc bản ghi Hóa đơn (Invoice) nhận từ API `/invoices` */
export interface InvoiceRecord {
  invoiceId: string;
  invoiceNumber?: string | null;
  requestId: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  pdfUrl: string;
  paymentStatus: string;
  paymentMethod: string | null;
  issuedAt: string;
  dueDate: string | null;
  paidAt: string | null;
  updatedAt: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedByName: string | null;
  isOverdue: boolean;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  paymentHistory?: InvoicePaymentHistoryItem[];
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerOrganization?: string | null;
  transportDetails?: InvoiceTransportDetails | null;
  lineItems?: InvoiceLineItemRecord[];
  subtotal?: number;
  discountAmount?: number;
  additionalFees?: number;
  taxAmount?: number;
  preparedByName?: string | null;
}

/** Thông tin tóm tắt của đơn vận chuyển đã phê duyệt để lập hóa đơn thủ công */
interface ApprovedRequest {
  requestId: string;
  customerName: string;
  estimatedAmount: number | null;
  currency: string;
}

/**
 * Xác định nhãn tiếng Việt hiển thị cho một hóa đơn:
 * - Nếu hóa đơn chưa thanh toán đủ (không phải PAID hoặc REFUNDED) mà cờ `isOverdue`
 *   từ Backend trả về là `true` hoặc đã quá hạn `dueDate`, luôn ưu tiên hiển thị
 *   "Quá hạn thanh toán" để cảnh báo kịp thời cho Quản lý và Khách hàng.
 */
export function resolveInvoiceStatusLabel(inv: Pick<InvoiceRecord, "paymentStatus" | "isOverdue" | "dueDate">): string {
  const normalized = normalizePaymentStatus(inv.paymentStatus, inv.dueDate);
  const isCompletedOrRefunded = normalized === "PAID" || normalized === "REFUNDED";

  if (!isCompletedOrRefunded && (inv.isOverdue || normalized === "OVERDUE")) {
    return "Quá hạn thanh toán";
  }
  return paymentStatusLabel(inv.paymentStatus, inv.dueDate);
}

export function InvoiceList() {
  const { navigate, user } = useAppStore();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    requestId: "",
    amount: "",
    currency: "USD",
    pdfUrl: "",
    paymentMethod: "Chuyển khoản thủ công",
  });
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);

  // Kiểm tra người dùng hiện tại có phải Quản lý Logistics hay không
  const isManager = user?.roleId === "LOGISTICS_MANAGER";

  /** Tải danh sách hóa đơn từ API `/invoices` */
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setInvoices(await apiGet<InvoiceRecord[]>("/invoices"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách hóa đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  /** Khi Quản lý mở form Tạo hóa đơn mới, tải danh sách các đơn vận chuyển đã phê duyệt */
  useEffect(() => {
    if (showCreate && isManager) {
      apiGet<ApprovedRequest[]>("/transport-requests?status=APPROVED")
        .then(setApprovedRequests)
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Không thể tải các yêu cầu đã phê duyệt.");
        });
    }
  }, [showCreate, isManager]);

  /** Xử lý phát hành hóa đơn mới (chỉ dành cho Quản lý Logistics) */
  const handleCreate = async () => {
    const selectedRequest = approvedRequests.find((request) => request.requestId === createForm.requestId);
    if (!createForm.requestId || !createForm.amount) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn đơn vận chuyển và kiểm tra số tiền hóa đơn.",
        variant: "destructive",
      });
      return;
    }
    if (selectedRequest?.currency !== "USD") {
      toast({
        title: "Không thể lập hóa đơn",
        description: "Chỉ hỗ trợ yêu cầu có đơn vị tiền tệ USD. Hệ thống không tự quy đổi dữ liệu lịch sử.",
        variant: "destructive",
      });
      return;
    }
    if (createForm.pdfUrl.trim().length > 512) {
      toast({ title: "Đường dẫn PDF quá dài", description: "Đường dẫn tệp PDF tối đa 512 ký tự.", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    try {
      const autoPdfUrl =
        createForm.pdfUrl.trim() || `/invoices/auto-${createForm.requestId}.pdf`;
      await apiPost("/invoices", {
        requestId: createForm.requestId,
        amount: Number(createForm.amount),
        currency: createForm.currency,
        pdfUrl: autoPdfUrl,
        paymentMethod: createForm.paymentMethod,
      });
      toast({
        title: "Đã phát hành hóa đơn thành công",
        description: "Hóa đơn dịch vụ chuẩn A4 đã sẵn sàng để xem trước và xuất tệp PDF.",
      });
      setShowCreate(false);
      setCreateForm({ requestId: "", amount: "", currency: "USD", pdfUrl: "", paymentMethod: "Chuyển khoản thủ công" });
      load();
    } catch (e) {
      toast({ title: "Lỗi", description: e instanceof Error ? e.message : "Không thể tạo hóa đơn.", variant: "destructive" });
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  /**
   * Lọc danh sách hóa đơn theo từ khóa tìm kiếm (số hóa đơn, mã UUID, mã đơn vận chuyển, tên khách hàng)
   * kết hợp với bộ lọc trạng thái thanh toán tiếng Việt.
   */
  const filtered = invoices.filter((inv) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      !search ||
      inv.requestId.toLowerCase().includes(keyword) ||
      inv.invoiceId.toLowerCase().includes(keyword) ||
      (inv.invoiceNumber?.toLowerCase().includes(keyword) ?? false) ||
      (inv.customerName?.toLowerCase().includes(keyword) ?? false);
    const label = resolveInvoiceStatusLabel(inv);
    const matchStatus = statusFilter === "Tất cả" || label === statusFilter;
    return matchSearch && matchStatus;
  });

  /** Xuất danh sách hóa đơn đang lọc ra tệp CSV để phục vụ đối soát kế toán */
  const handleExportCSV = () => {
    const rows = filtered.flatMap(getInvoiceCsvRows);
    exportToCSV(`equideli-hoa-don-${new Date().toISOString().slice(0, 10)}.csv`, INVOICE_CSV_HEADERS, rows);
    toast({ title: "Đã xuất tệp CSV", description: `${filtered.length} hóa đơn đã được tải xuống.` });
  };

  // Tính toán các chỉ số tổng hợp (KPI) trên toàn bộ danh sách hóa đơn
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => {
    if (normalizePaymentStatus(inv.paymentStatus, inv.dueDate) === "PAID") {
      return sum + (Number(inv.amount) || 0);
    }
    return sum + (Number(inv.paidAmount) || 0);
  }, 0);
  const totalRemaining = Math.max(0, totalInvoiced - totalPaid);

  // Đếm số lượng hóa đơn theo từng trạng thái chuẩn tiếng Việt
  const overdueCount = invoices.filter((i) => resolveInvoiceStatusLabel(i) === "Quá hạn thanh toán").length;
  const unpaidCount = invoices.filter((i) => resolveInvoiceStatusLabel(i) === "Chưa thanh toán").length;
  const partiallyPaidCount = invoices.filter((i) => resolveInvoiceStatusLabel(i) === "Thanh toán một phần").length;
  const paidCount = invoices.filter((i) => resolveInvoiceStatusLabel(i) === "Đã thanh toán").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hóa đơn & Quản lý thanh toán"
        description={
          isManager
            ? "Quản lý chứng từ hóa đơn quốc tế chuẩn A4 sau khi hoàn tất chuyến và đối soát thanh toán ngoại tuyến."
            : "Tra cứu hóa đơn dịch vụ chuẩn A4, tải chứng từ PDF và theo dõi tình trạng thanh toán ngoại tuyến."
        }
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                aria-label="Tìm kiếm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm số HĐ, mã đơn, khách hàng..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0} className="gap-1.5">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Xuất CSV</span>
            </Button>
            {isManager && (
              <Button onClick={() => setShowCreate(true)} className="gap-2 btn-press font-semibold">
                <Plus className="h-4 w-4" /> Phát hành hóa đơn
              </Button>
            )}
          </div>
        }
      />

      {/* Hộp thông báo giải thích quy trình thanh toán ngoại tuyến của EQUIDELI */}
      <div className="rounded-xl border border-[#D6A15D]/35 bg-[#2B201A]/90 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#D6A15D] mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm text-[#F5EDE3]">Phương thức thanh toán ngoại tuyến</p>
            <p className="text-xs text-[#D8C8B8] leading-relaxed">
              EQUIDELI chỉ quản lý hóa đơn, lưu trữ chứng từ và theo dõi trạng thái thanh toán. Các giao dịch thanh toán được thực hiện ngoại tuyến theo thỏa thuận giữa khách hàng và đơn vị vận chuyển. Website không tích hợp cổng thanh toán trực tuyến.
            </p>
          </div>
        </div>
      </div>

      {/* Biểu mẫu phát hành hóa đơn mới (chỉ hiển thị cho Quản lý Logistics) */}
      {showCreate && (
        <Card className="border-primary/30 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-[var(--text-primary)]">
              <Plus className="h-4 w-4 text-primary" /> Phát hành hóa đơn dịch vụ mới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Đơn vận chuyển đã phê duyệt</Label>
              <select
                value={createForm.requestId}
                onChange={(e) => {
                  const req = approvedRequests.find((r) => r.requestId === e.target.value);
                  setCreateForm({
                    ...createForm,
                    requestId: e.target.value,
                    amount: req?.currency === "USD" && req.estimatedAmount != null ? String(req.estimatedAmount) : "",
                    currency: "USD",
                    pdfUrl: e.target.value ? `/invoices/auto-${e.target.value}.pdf` : "",
                  });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Chọn đơn vận chuyển đã phê duyệt —</option>
                {approvedRequests.map((r) => (
                  <option key={r.requestId} value={r.requestId} disabled={r.currency !== "USD"}>
                    {r.customerName || "Khách hàng"} — Đơn {requestCode(r.requestId)}
                    {r.estimatedAmount != null ? ` (${formatMoney(r.estimatedAmount, r.currency)})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-secondary)]">
                Hệ thống tự động trích xuất thông tin khách hàng, lộ trình, hồ sơ ngựa và bảng kê hạng mục báo giá từ cơ sở dữ liệu.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tổng số tiền hóa đơn (USD)</Label>
                <Input
                  type="number"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Đơn vị tiền tệ</Label>
                <Input value="USD" readOnly />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phương thức thanh toán thỏa thuận</Label>
                <select
                  value={createForm.paymentMethod}
                  onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>Chuyển khoản thủ công</option>
                  <option>Tiền mặt</option>
                  <option>Bảo lãnh ngân hàng</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Đường dẫn chứng từ PDF (tự động khởi tạo nếu để trống)</Label>
                <Input
                  type="text"
                  value={createForm.pdfUrl}
                  onChange={(e) => setCreateForm({ ...createForm, pdfUrl: e.target.value })}
                  placeholder="/invoices/auto-..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={createLoading} className="gap-2 font-semibold">
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Xác nhận phát hành
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4 Thẻ thống kê tổng hợp tài chính (Tổng giá trị, Đã thanh toán, Còn phải thu, Quá hạn) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Tổng giá trị hóa đơn</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{formatMoney(totalInvoiced, "USD")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-bg)] text-[var(--success-fg)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Đã thanh toán</p>
                <p className="text-sm font-bold text-[var(--success-fg)]">{formatMoney(totalPaid, "USD")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning-fg)]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Còn phải thu</p>
                <p className="text-sm font-bold text-[var(--warning-fg)]">{formatMoney(totalRemaining, "USD")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${overdueCount > 0 ? "bg-[var(--danger-bg)] text-[var(--danger-fg)]" : "bg-muted text-[var(--text-secondary)]"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Quá hạn thanh toán</p>
                <p className={`text-sm font-bold ${overdueCount > 0 ? "text-[var(--danger-fg)]" : "text-[var(--text-primary)]"}`}>
                  {overdueCount} hóa đơn
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Các nút lọc nhanh theo trạng thái thanh toán chuẩn tiếng Việt */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "Tất cả", count: invoices.length },
          { label: "Chưa thanh toán", count: unpaidCount },
          { label: "Thanh toán một phần", count: partiallyPaidCount },
          { label: "Đã thanh toán", count: paidCount },
          { label: "Quá hạn thanh toán", count: overdueCount },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.label)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.label
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "bg-muted text-[var(--text-secondary)] hover:bg-muted/80 hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Thanh tóm tắt tỷ lệ trạng thái */}
      <ListStatsBar
        total={invoices.length}
        filtered={filtered.length}
        stats={[
          { label: "Đã thanh toán", value: paidCount, tone: "success" },
          { label: "Thanh toán một phần", value: partiallyPaidCount, tone: "warning" },
          { label: "Chưa thanh toán", value: unpaidCount, tone: "warning" },
          { label: "Quá hạn thanh toán", value: overdueCount, tone: "danger" },
        ]}
      />

      {/* Danh sách từng hóa đơn */}
      {filtered.length === 0 ? (
        <EmptyState
          illustration="no-data"
          title="Không có hóa đơn"
          description="Hóa đơn được phát hành tự động sau khi chuyến vận chuyển hoàn tất và bàn giao thành công."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const statusLabel = resolveInvoiceStatusLabel(inv);
            const isOverdue = statusLabel === "Quá hạn thanh toán";
            const isPaid = statusLabel === "Đã thanh toán";
            const isPartiallyPaid = statusLabel === "Thanh toán một phần";
            const paid = inv.paidAmount ?? (isPaid ? inv.amount : 0);
            const remaining = inv.remainingAmount ?? Math.max(0, inv.amount - paid);
            const displayNo = inv.invoiceNumber || invoiceCode(inv.invoiceId);
            const routeText =
              inv.transportDetails?.originName && inv.transportDetails?.destinationName
                ? `${inv.transportDetails.originName} → ${inv.transportDetails.destinationName}`
                : null;

            return (
              <div
                key={inv.invoiceId}
                onClick={() => navigate("invoice-detail", { id: inv.invoiceId })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("invoice-detail", { id: inv.invoiceId });
                  }
                }}
                className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md ${
                  isOverdue ? "border-[var(--danger-border)] bg-[var(--danger-bg)]/30" : "border-border"
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    isPaid
                      ? "bg-[var(--success-bg)] text-[var(--success-fg)]"
                      : isOverdue
                      ? "bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                      : isPartiallyPaid
                      ? "bg-[var(--warning-bg)] text-[var(--warning-fg)]"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      Hóa đơn {displayNo}
                    </p>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">
                      (Đơn {requestCode(inv.requestId)})
                    </span>
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--danger-bg)] border border-[var(--danger-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--danger-fg)]">
                        <AlertTriangle className="h-3 w-3" /> Quá hạn {inv.daysOverdue ?? 1} ngày
                      </span>
                    )}
                    {!isOverdue && !isPaid && inv.daysUntilDue != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                        <Clock className="h-3 w-3" /> Còn {inv.daysUntilDue} ngày
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                    {inv.customerName && (
                      <span>
                        Khách hàng: <strong className="text-[var(--text-primary)]">{inv.customerName}</strong>
                      </span>
                    )}
                    {routeText && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" /> {routeText}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Phát hành: {formatDate(inv.issuedAt)}
                    </span>
                    {inv.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Hạn: {formatDate(inv.dueDate)}
                      </span>
                    )}
                  </div>

                  {/* Nếu hóa đơn thanh toán một phần, hiển thị rõ số tiền đã trả và số tiền còn lại */}
                  {isPartiallyPaid && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <span className="text-[var(--success-fg)] font-medium">Đã trả: {formatMoney(paid, inv.currency)}</span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--warning-fg)] font-medium">Còn lại: {formatMoney(remaining, inv.currency)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={statusLabel} />
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {formatMoney(inv.amount, inv.currency)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Xuất PDF chuẩn A4"
                    className="hidden sm:inline-flex gap-1.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportInvoiceToA4Pdf(inv);
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5" /> PDF A4
                  </Button>
                  <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
