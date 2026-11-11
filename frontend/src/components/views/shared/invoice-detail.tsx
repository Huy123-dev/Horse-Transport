"use client";

/**
 * ============================================================================
 * EQUIDELI — CHI TIẾT HÓA ĐƠN QUỐC TẾ A4 & QUẢN LÝ THANH TOÁN (INVOICE DETAIL)
 * ============================================================================
 * Màn hình này hiển thị chứng từ Hóa đơn dịch vụ vận chuyển ngựa đua quốc tế
 * chuẩn A4 (`EquideliInvoiceDocument`) kèm theo bộ công cụ quản lý:
 * 1. Xem trước trực tiếp toàn bộ bố cục hóa đơn A4 (Phân khu A đến J) với
 *    Logo chính thức `/equideli-logo.png`, thông tin người bán/khách hàng,
 *    chi tiết hành trình & ngựa vận chuyển, bảng kê hạng mục dịch vụ và tổng hợp tài chính.
 * 2. Xuất tệp PDF chuẩn A4 (`exportInvoiceToA4Pdf`) hỗ trợ 100% phông chữ tiếng Việt
 *    và tách biệt hoàn toàn khỏi giao diện nền tối của bảng điều khiển.
 * 3. In trực tiếp chứng từ A4 (`window.print()`) hoặc tải dữ liệu đối soát CSV.
 * 4. Theo dõi bảng Lịch sử cập nhật trạng thái thanh toán (`paymentHistory`).
 * 5. Chức năng dành riêng cho Quản lý Logistics (`LOGISTICS_MANAGER`):
 *    Mở hộp thoại cập nhật trạng thái thanh toán ngoại tuyến (`PATCH /invoices/{id}/payment-status`),
 *    tự động gợi ý trạng thái (`UNPAID` / `PARTIALLY_PAID` / `PAID`) dựa trên số tiền thực nhận.
 * ============================================================================
 */

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPatch } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Printer,
  History,
  Download,
  FileDown,
  ExternalLink,
} from "lucide-react";
import {
  formatDateTime,
  formatMoney,
  requestCode,
  normalizePaymentStatus,
  paymentStatusLabel,
} from "@/lib/constants";
import { exportToCSV } from "@/lib/csv-export";
import { exportInvoiceToA4Pdf } from "@/lib/invoice-pdf";
import { getInvoiceCsvRows, INVOICE_CSV_HEADERS } from "@/lib/invoice-csv";
import { InvoiceRecord, resolveInvoiceStatusLabel } from "./invoice-list";
import {
  EquideliInvoiceDocument,
  getFormattedInvoiceNumber,
} from "./equideli-invoice-document";

export function InvoiceDetail() {
  const { params, navigate, user } = useAppStore();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Trạng thái hộp thoại cập nhật thanh toán dành cho Quản lý Logistics
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: "PARTIALLY_PAID",
    paidAmount: "",
    paymentMethod: "Chuyển khoản thủ công",
    dueDate: "",
    notes: "",
  });

  /**
   * Tải chi tiết hóa đơn từ Backend và khởi tạo giá trị mặc định cho biểu mẫu cập nhật.
   */
  const load = useCallback(async () => {
    try {
      const invoiceData = await apiGet<InvoiceRecord>(`/invoices/${params.id}`);
      setInvoice(invoiceData);
      const norm = normalizePaymentStatus(invoiceData.paymentStatus, invoiceData.dueDate);
      setUpdateForm({
        status: norm === "OVERDUE" ? (invoiceData.paidAmount > 0 ? "PARTIALLY_PAID" : "UNPAID") : norm,
        paidAmount: String(invoiceData.paidAmount ?? (norm === "PAID" ? invoiceData.amount : 0)),
        paymentMethod: invoiceData.paymentMethod || "Chuyển khoản thủ công",
        dueDate: invoiceData.dueDate ? invoiceData.dueDate.slice(0, 10) : "",
        notes: "",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết hóa đơn.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  /**
   * Gửi yêu cầu cập nhật trạng thái thanh toán ngoại tuyến lên Server
   * (`PATCH /invoices/{invoiceId}/payment-status`).
   * Kiểm tra tính hợp lệ: `0 <= paidAmount <= invoice.amount`.
   */
  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amountNum = Number(updateForm.paidAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      toast({
        title: "Số tiền không hợp lệ",
        description: "Vui lòng nhập số tiền đã thanh toán lớn hơn hoặc bằng 0.",
        variant: "destructive",
      });
      return;
    }
    if (amountNum > invoice.amount) {
      toast({
        title: "Vượt quá tổng tiền",
        description: "Số tiền đã thanh toán không được lớn hơn tổng số tiền hóa đơn.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const payload: Record<string, unknown> = {
        status: updateForm.status,
        paidAmount: amountNum,
        paymentMethod: updateForm.paymentMethod,
        notes: updateForm.notes.trim() || undefined,
      };
      if (updateForm.dueDate) {
        payload.dueDate = `${updateForm.dueDate}T23:59:59`;
      }

      const updated = await apiPatch<InvoiceRecord>(`/invoices/${invoice.invoiceId}/payment-status`, payload);
      setInvoice(updated);
      toast({
        title: "Cập nhật thành công",
        description: "Trạng thái thanh toán và lịch sử giao dịch đã được ghi nhận.",
      });
      setShowUpdateModal(false);
      load();
    } catch (e: unknown) {
      toast({
        title: "Lỗi cập nhật",
        description: e instanceof Error ? e.message : "Không thể cập nhật trạng thái thanh toán.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setLoading(true);
          setError("");
          void load();
        }}
      />
    );
  }
  if (!invoice) return <ErrorState message="Không tìm thấy hóa đơn" />;

  const isManager = user?.roleId === "LOGISTICS_MANAGER";
  const statusLabel = resolveInvoiceStatusLabel(invoice);
  const formattedInvoiceNo = getFormattedInvoiceNumber(invoice);
  const isPaid = statusLabel === "Đã thanh toán";

  // Tính toán số tiền đã thanh toán và số tiền còn phải thu
  const totalAmount = invoice.amount;
  const paidAmount = invoice.paidAmount ?? (isPaid ? totalAmount : 0);
  const remainingAmount = invoice.remainingAmount ?? Math.max(0, totalAmount - paidAmount);

  const handleExportCsv = () => {
    exportToCSV(
      `hoa-don-${formattedInvoiceNo}.csv`,
      INVOICE_CSV_HEADERS,
      getInvoiceCsvRows(invoice)
    );
    toast({ title: "Đã xuất tệp CSV", description: "Bản sao lưu dữ liệu hóa đơn đã được tải về máy." });
  };

  return (
    <div className="space-y-6">
      {/* Thanh tiêu đề & bộ nút hành động quản trị (ẩn khi in A4) */}
      <div className="no-print">
        <PageHeader
          title={`Hóa đơn ${formattedInvoiceNo}`}
          description={`Chứng từ dịch vụ vận chuyển quốc tế · Đơn ${requestCode(invoice.requestId)}`}
          icon={<Receipt className="h-5 w-5" />}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={statusLabel} />
              {isManager && (
                <Button
                  size="sm"
                  onClick={() => setShowUpdateModal(true)}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  <CreditCard className="h-4 w-4" /> Cập nhật trạng thái thanh toán
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportInvoiceToA4Pdf(invoice)}
                className="gap-1.5 border-[#D6A15D]/50 text-[var(--text-primary)] hover:bg-[#D6A15D]/15"
              >
                <FileDown className="h-4 w-4 text-[#D6A15D]" /> Xuất PDF (A4)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">In hóa đơn</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" /> <span className="hidden md:inline">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("invoices")}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Quay lại
              </Button>
            </div>
          }
        />
      </div>

      {/* Thanh liên kết nhanh đến hồ sơ đơn vận chuyển và tóm tắt đối soát (ẩn khi in A4) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D6A15D]/35 bg-[#2B201A]/90 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[#D8C8B8]">
            Số hóa đơn: <strong className="font-mono text-[#F5EDE3]">{formattedInvoiceNo}</strong>
          </span>
          <span className="text-[#D8C8B8]">
            Tổng cộng: <strong className="font-mono text-[#D6A15D]">{formatMoney(totalAmount, invoice.currency)}</strong>
          </span>
          <span className="text-[#D8C8B8]">
            Đã thanh toán: <strong className="font-mono text-[#81C995]">{formatMoney(paidAmount, invoice.currency)}</strong>
          </span>
          <span className="text-[#D8C8B8]">
            Còn phải thu: <strong className="font-mono text-[#F2BD65]">{formatMoney(remainingAmount, invoice.currency)}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate("request-detail", { id: invoice.requestId })}
          className="inline-flex items-center gap-1.5 font-semibold text-[#D6A15D] hover:underline"
        >
          Xem hồ sơ đơn vận chuyển {requestCode(invoice.requestId)}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ====================================================================
          BẢN XEM TRƯỚC CHỨNG TỪ HÓA ĐƠN QUỐC TẾ CHUẨN A4 (SECTIONS A -> J)
          ==================================================================== */}
      <EquideliInvoiceDocument invoice={invoice} />

      {/* ====================================================================
          BẢNG LỊCH SỬ CẬP NHẬT TRẠNG THÁI THANH TOÁN NGOẠI TUYẾN (AUDIT LOG)
          ==================================================================== */}
      <Card className="no-print">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-[var(--text-primary)]">
            <History className="h-4 w-4 text-primary" /> Lịch sử cập nhật trạng thái thanh toán ngoại tuyến
          </CardTitle>
          {isManager && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpdateModal(true)}
              className="gap-1.5 text-xs"
            >
              <CreditCard className="h-3.5 w-3.5" /> Ghi nhận thanh toán mới
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!invoice.paymentHistory || invoice.paymentHistory.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-2 text-center">
              Chưa có lịch sử cập nhật thanh toán bổ sung.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[var(--text-secondary)]">
                    <th className="pb-2 font-medium">Thời gian</th>
                    <th className="pb-2 font-medium">Người cập nhật</th>
                    <th className="pb-2 font-medium">Thay đổi trạng thái</th>
                    <th className="pb-2 font-medium">Đã trả</th>
                    <th className="pb-2 font-medium">Còn lại</th>
                    <th className="pb-2 font-medium">Phương thức</th>
                    <th className="pb-2 font-medium">Ghi chú đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoice.paymentHistory.map((item) => (
                    <tr key={item.historyId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 whitespace-nowrap text-[var(--text-secondary)]">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="py-2.5 whitespace-nowrap font-medium text-[var(--text-primary)]">
                        {item.updatedByName || "Hệ thống"}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className="text-[var(--text-secondary)]">
                          {paymentStatusLabel(item.oldStatus)}
                        </span>
                        <span className="mx-1.5 text-primary">→</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {paymentStatusLabel(item.newStatus)}
                        </span>
                      </td>
                      <td className="py-2.5 whitespace-nowrap font-medium text-[var(--success-fg)]">
                        {formatMoney(item.paidAmount, invoice.currency)}
                      </td>
                      <td className="py-2.5 whitespace-nowrap font-medium text-[var(--warning-fg)]">
                        {formatMoney(item.remainingAmount, invoice.currency)}
                      </td>
                      <td className="py-2.5 whitespace-nowrap text-[var(--text-secondary)]">
                        {item.paymentMethod || "—"}
                      </td>
                      <td
                        className="py-2.5 max-w-[260px] truncate text-[var(--text-secondary)]"
                        title={item.notes || ""}
                      >
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hộp thoại Cập nhật trạng thái thanh toán ngoại tuyến (chỉ dành cho Quản lý Logistics) */}
      {isManager && (
        <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                <CreditCard className="h-5 w-5 text-primary" /> Cập nhật trạng thái thanh toán ngoại tuyến
              </DialogTitle>
              <DialogDescription className="text-[var(--text-secondary)]">
                Ghi nhận số tiền thanh toán thực tế bên ngoài hệ thống và cập nhật trạng thái hóa đơn{" "}
                {formattedInvoiceNo}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdatePayment} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái thanh toán mục tiêu</Label>
                <select
                  id="status"
                  value={updateForm.status}
                  onChange={(e) => {
                    // Tự động đồng bộ số tiền khi Quản lý chọn "Đã thanh toán" (100% số tiền) hoặc "Chưa thanh toán" (0)
                    const st = e.target.value;
                    let newPaid = updateForm.paidAmount;
                    if (st === "PAID") newPaid = String(invoice.amount);
                    if (st === "UNPAID") newPaid = "0";
                    setUpdateForm({ ...updateForm, status: st, paidAmount: newPaid });
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium"
                >
                  <option value="UNPAID">Chưa thanh toán</option>
                  <option value="PARTIALLY_PAID">Thanh toán một phần</option>
                  <option value="PAID">Đã thanh toán</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Số tiền đã trả ({invoice.currency})</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={invoice.amount}
                    value={updateForm.paidAmount}
                    onChange={(e) => {
                      // Tự động suy luận trạng thái (UNPAID / PARTIALLY_PAID / PAID) theo số tiền thực trả
                      const val = e.target.value;
                      const num = Number(val);
                      let autoStatus = updateForm.status;
                      if (num >= invoice.amount) autoStatus = "PAID";
                      else if (num > 0) autoStatus = "PARTIALLY_PAID";
                      else if (num === 0) autoStatus = "UNPAID";
                      setUpdateForm({ ...updateForm, paidAmount: val, status: autoStatus });
                    }}
                    placeholder="0.00"
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Tối đa: {formatMoney(invoice.amount, invoice.currency)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Gia hạn thanh toán (tùy chọn)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={updateForm.dueDate}
                    onChange={(e) => setUpdateForm({ ...updateForm, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Phương thức thanh toán đã nhận</Label>
                <select
                  id="paymentMethod"
                  value={updateForm.paymentMethod}
                  onChange={(e) => setUpdateForm({ ...updateForm, paymentMethod: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>Chuyển khoản thủ công</option>
                  <option>Tiền mặt</option>
                  <option>Bảo lãnh ngân hàng</option>
                  <option>Ủy nhiệm chi</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú đối soát / Lý do cập nhật</Label>
                <Input
                  id="notes"
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  placeholder="VD: Nhận 5,000 USD đợt 1 qua VCB, mã GD 123456"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUpdateModal(false)}
                  disabled={actionLoading}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {actionLoading ? "Đang lưu..." : "Xác nhận cập nhật"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
