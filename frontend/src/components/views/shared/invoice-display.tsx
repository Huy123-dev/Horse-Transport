/**
 * ============================================================================
 * EQUIDELI — THẺ HIỂN THỊ HÓA ĐƠN NHÚNG TRONG ĐƠN VẬN CHUYỂN (INVOICE DISPLAY)
 * ============================================================================
 * Component này được nhúng trực tiếp trong trang Chi tiết Yêu cầu vận chuyển
 * (`request-detail`) để hiển thị nhanh thông tin hóa đơn của đơn hàng đó
 * (`GET /transport-requests/{requestId}/invoice`), cho phép mở xem chứng từ
 * hóa đơn quốc tế chuẩn A4 hoặc tải tệp PDF chuẩn A4.
 *
 * Nếu người dùng là Quản lý Logistics (`LOGISTICS_MANAGER`) và hóa đơn chưa
 * thanh toán đủ, cho phép xác nhận nhanh đã nhận thanh toán ngoại tuyến
 * thông qua API `PUT /invoices/{invoiceId}/pay`.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { ApiError, apiGet, apiPut } from "@/lib/api-client";
import {
  formatDateTime,
  formatMoney,
  invoiceCode,
  paymentStatusLabel,
  normalizePaymentStatus,
} from "@/lib/constants";
import { exportInvoiceToA4Pdf } from "@/lib/invoice-pdf";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/app/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, CreditCard, ExternalLink, FileDown, Receipt } from "lucide-react";
import type { InvoiceRecord } from "./invoice-list";

interface InvoiceDisplayProps {
  requestId: string;
}

export function InvoiceDisplay({ requestId }: InvoiceDisplayProps) {
  const { user, navigate } = useAppStore();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Chuyển khoản thủ công");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Tải hóa đơn gắn với mã đơn vận chuyển (`requestId`).
   * Nếu API trả về 404 (đơn chưa hoàn tất nên chưa phát hành hóa đơn),
   * hiển thị thông báo nhẹ nhàng thay vì báo lỗi hệ thống.
   */
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError("");
      setInvoice(null);
      try {
        const loadedInvoice = await apiGet<InvoiceRecord>(`/transport-requests/${requestId}/invoice`);
        if (active) setInvoice(loadedInvoice);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setInvoice(null);
        } else {
          setError(cause instanceof Error ? cause.message : "Không thể tải hóa đơn.");
        }
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [requestId]);

  /** Ghi nhận hóa đơn đã được thanh toán đủ bên ngoài hệ thống */
  const markPaid = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      const updated = await apiPut<InvoiceRecord>(`/invoices/${invoice.invoiceId}/pay`, { paymentMethod });
      if (updated.invoiceId !== invoice.invoiceId || normalizePaymentStatus(updated.paymentStatus) !== "PAID") {
        throw new Error("Hệ thống chưa xác nhận trạng thái đã thanh toán.");
      }
      setInvoice(updated);
      setConfirmOpen(false);
      toast({ title: "Đã ghi nhận thanh toán ngoại tuyến" });
    } catch (cause) {
      toast({
        title: "Không thể cập nhật hóa đơn",
        description: cause instanceof Error ? cause.message : "Đã xảy ra lỗi khi ghi nhận thanh toán.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-[var(--text-secondary)]">
          Đang tải hóa đơn...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-[var(--danger-fg)]" role="alert">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-[var(--text-secondary)]">
          Chưa có hóa đơn được phát hành cho yêu cầu này. Hóa đơn sẽ tự động phát hành sau khi chuyến vận chuyển hoàn tất bàn giao.
        </CardContent>
      </Card>
    );
  }

  const isManager = user?.roleId === "LOGISTICS_MANAGER";
  const normalizedStatus = normalizePaymentStatus(invoice.paymentStatus, invoice.dueDate);
  const isUnpaid = normalizedStatus !== "PAID" && normalizedStatus !== "REFUNDED";
  const statusLabel = paymentStatusLabel(invoice.paymentStatus, invoice.dueDate);
  const displayNo = invoice.invoiceNumber || invoiceCode(invoice.invoiceId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base text-[var(--text-primary)]">
          <Receipt className="h-4 w-4 text-primary" /> Hóa đơn dịch vụ & Thanh toán
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportInvoiceToA4Pdf(invoice)}
            className="gap-1.5 text-xs"
          >
            <FileDown className="h-3.5 w-3.5 text-[#D6A15D]" /> Xuất PDF (A4)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("invoice-detail", { id: invoice.invoiceId })}
            className="gap-1.5 text-xs"
          >
            Xem hóa đơn A4 <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              Tổng hóa đơn <strong className="font-mono text-[var(--text-primary)]">{displayNo}</strong>
            </p>
            <p className="text-2xl font-bold text-primary">
              {formatMoney(invoice.amount, invoice.currency)}
            </p>
          </div>
          <div className="text-right space-y-1">
            <StatusBadge status={statusLabel} />
            <p className="text-xs text-[var(--text-secondary)]">
              Phát hành {formatDateTime(invoice.issuedAt)}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Tổng chi phí dịch vụ vận chuyển và chăm sóc ngựa trọn gói theo báo giá xác nhận.
        </p>

        {/* Hướng dẫn thanh toán ngoại tuyến */}
        <div className="rounded-lg border border-[#D6A15D]/30 bg-[#2B201A]/80 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#F5EDE3]">
            <CreditCard className="h-4 w-4 text-[#D6A15D]" /> Phương thức thanh toán ngoại tuyến
          </div>
          <p className="mt-1.5 text-xs text-[#D8C8B8] leading-relaxed">
            EQUIDELI chỉ quản lý hóa đơn, lưu trữ chứng từ và theo dõi trạng thái thanh toán. Các giao dịch thanh toán được thực hiện ngoại tuyến theo thỏa thuận giữa khách hàng và đơn vị vận chuyển. Website không tích hợp cổng thanh toán trực tuyến.
          </p>
        </div>

        {/* Khu vực xác nhận nhanh dành cho Quản lý Logistics */}
        {isManager && isUnpaid && (
          <div className="space-y-3">
            <label className="block space-y-2 text-sm text-[var(--text-primary)]">
              <span>Phương thức đã nhận</span>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Chuyển khoản thủ công</option>
                <option>Tiền mặt</option>
              </select>
            </label>
            <Button onClick={() => setConfirmOpen(true)} disabled={saving} className="gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Xác nhận đã thanh toán
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ghi nhận đã nhận thanh toán?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Chỉ xác nhận khoản tiền đã nhận bên ngoài hệ thống. EQUIDELI không thực hiện giao dịch thanh toán trực tuyến.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={saving}>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault();
                      void markPaid();
                    }}
                    disabled={saving}
                  >
                    {saving ? "Đang cập nhật..." : "Xác nhận"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {normalizedStatus === "PAID" && (
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--success-fg)]">
            <CheckCircle2 className="h-4 w-4" />{" "}
            {invoice.paidAt ? `Đã ghi nhận lúc ${formatDateTime(invoice.paidAt)}` : "Đã ghi nhận thanh toán"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
