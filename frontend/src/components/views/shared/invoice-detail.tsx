"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPut } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Receipt, Calendar, CreditCard, CheckCircle2, Plus, Download, FileText, Printer } from "lucide-react";
import { formatDate, formatDateTime, formatMoney, invoiceCode, requestCode } from "@/lib/constants";
import { exportToCSV } from "@/lib/csv-export";

interface InvoiceRecord {
  invoiceId: string;
  requestId: string;
  amount: number;
  currency: string;
  pdfUrl: string;
  paymentStatus: string;
  paymentMethod: string | null;
  issuedAt: string;
  paidAt: string | null;
  customerId?: string | null;
  customerName?: string | null;
}

export function InvoiceDetail() {
  const { params, navigate, user } = useAppStore();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [payForm, setPayForm] = useState({ method: "Chuyển khoản thủ công" });

  const load = useCallback(async () => {
    try {
      const invoiceData = await apiGet<InvoiceRecord>(`/invoices/${params.id}`);
      setInvoice(invoiceData);
    }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Không thể tải hóa đơn."); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      const updated = await apiPut<InvoiceRecord>(`/invoices/${params.id}/pay`, {
        paymentMethod: payForm.method,
      });
      if (updated.invoiceId !== invoice?.invoiceId || updated.paymentStatus !== "PAID") {
        throw new Error("Backend không xác nhận trạng thái đã thanh toán.");
      }
      setInvoice(updated);
      toast({ title: "Đã cập nhật trạng thái thanh toán" });
      setShowPayForm(false);
      setConfirmPaymentOpen(false);
      setPayForm({ method: "Chuyển khoản thủ công" });
    } catch (e: unknown) { toast({ title: "Lỗi", description: e instanceof Error ? e.message : "Không thể cập nhật trạng thái thanh toán.", variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!invoice) return <ErrorState message="Không tìm thấy hóa đơn" />;

  const isPaid = invoice.paymentStatus === "PAID";
  const isUnpaid = invoice.paymentStatus === "UNPAID";
  const isRefunded = invoice.paymentStatus === "REFUNDED";
  const totalPaid = isPaid ? invoice.amount : 0;
  const remaining = isUnpaid ? invoice.amount : 0;
  const isManager = user?.roleId === "LOGISTICS_MANAGER";
  const canUpdatePaymentStatus = isManager && isUnpaid;
  const paymentStatusLabel = invoice.paymentStatus === "PAID"
    ? "Đã thanh toán"
    : invoice.paymentStatus === "UNPAID"
      ? "Chưa thanh toán"
      : invoice.paymentStatus === "REFUNDED"
        ? "Đã hoàn tiền"
        : invoice.paymentStatus;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hóa đơn ${invoiceCode(invoice.invoiceId)}`}
        description={`Yêu cầu ${requestCode(invoice.requestId)}`}
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <div className="no-print flex items-center gap-2">
            <StatusBadge status={paymentStatusLabel} />
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> <span className="hidden sm:inline">In</span></Button>
            <Button variant="outline" size="sm" onClick={() => navigate("invoices")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
          </div>
        }
      />

      {/* Printable invoice header */}
      <div className="print-area">
        <div className="mb-4 hidden print:block">
          <div className="flex items-center justify-between border-b-2 border-[var(--chestnut)] pb-3">
            <div className="flex items-center gap-3">
              <img src="/equideli-logo.png" alt="EQUIDELI" className="h-12 w-12 rounded-lg" />
              <div>
                <p className="text-2xl font-extrabold text-[var(--chestnut)]">EQUIDELI</p>
                <p className="text-xs text-[var(--ink-soft)]">Hệ thống quản lý vận chuyển ngựa đua</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">HÓA ĐƠN</p>
              <p className="text-xs">{invoiceCode(invoice.invoiceId)}</p>
              <p className="text-xs">{formatDate(invoice.issuedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main invoice info */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Chi tiết hóa đơn</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Mã hóa đơn</p><p className="font-mono text-xs font-medium">{invoice.invoiceId}</p></div>
                <div><p className="text-xs text-muted-foreground">Ngày phát hành</p><p className="font-medium">{formatDateTime(invoice.issuedAt)}</p></div>
                <div><p className="text-xs text-muted-foreground">Phương thức</p><p className="font-medium">{invoice.paymentMethod || "—"}</p></div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Khách hàng</p>
                <p className="font-semibold text-sm">{invoice.customerName || "Chưa có thông tin"}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Đơn vận chuyển liên quan</p>
                <button onClick={() => navigate("request-detail", { id: invoice.requestId })} className="mt-1 text-sm font-semibold text-primary hover:underline">Đơn {requestCode(invoice.requestId)}</button>
              </div>
            </CardContent>
          </Card>

          {/* Payment breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Thanh toán</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Tổng hóa đơn</p><p className="text-lg font-bold">{formatMoney(invoice.amount, invoice.currency)}</p></div>
                <div className="rounded-lg bg-[var(--success-bg)]/40 p-3"><p className="text-xs text-muted-foreground">Đã trả</p><p className="text-lg font-bold text-[var(--success-fg)]">{formatMoney(totalPaid, invoice.currency)}</p></div>
                <div className="rounded-lg bg-[var(--warning-bg)]/40 p-3"><p className="text-xs text-muted-foreground">Còn lại</p><p className="text-lg font-bold text-[var(--warning-fg)]">{formatMoney(remaining, invoice.currency)}</p></div>
              </div>

              <p className="text-xs text-muted-foreground">
                Thông tin thanh toán được ghi nhận và lưu trữ trực tiếp trên hệ thống.
              </p>

              {/* Pay button / form */}
              {canUpdatePaymentStatus ? (
                !showPayForm ? (
                  <Button onClick={() => setShowPayForm(true)} className="w-full gap-2 bg-[var(--success)] hover:bg-[var(--success)]/90"><CreditCard className="h-4 w-4" /> Cập nhật trạng thái thanh toán</Button>
                ) : (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-2"><Label className="text-xs">Phương thức thanh toán</Label><select value={payForm.method} onChange={(e) => setPayForm({ method: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Chuyển khoản thủ công</option><option>Tiền mặt</option></select></div>
                      <p className="text-xs text-muted-foreground">Thao tác này sẽ ghi nhận trạng thái thanh toán vào hóa đơn.</p>
                      <div className="flex gap-2">
                        <Button onClick={() => setConfirmPaymentOpen(true)} disabled={actionLoading} className="flex-1 gap-2 bg-[var(--success)] hover:bg-[var(--success)]/90"><CheckCircle2 className="h-4 w-4" /> Ghi nhận đã thanh toán</Button>
                        <Button variant="outline" onClick={() => setShowPayForm(false)}>Hủy</Button>
                      </div>

                      <AlertDialog open={confirmPaymentOpen} onOpenChange={setConfirmPaymentOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ghi nhận hóa đơn đã thanh toán?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Thao tác này chỉ cập nhật trạng thái và phương thức trong Equideli; hệ thống không thực hiện giao dịch thanh toán.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={actionLoading}>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleMarkPaid(); }} disabled={actionLoading}>
                              {actionLoading ? "Đang cập nhật..." : "Xác nhận"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                )
              ) : isPaid ? (
                <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success-bg)]/30 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--success)]" />
                  <p className="mt-2 font-semibold text-[var(--success-fg)]">Hóa đơn đã thanh toán đầy đủ</p>
                  <p className="text-xs text-[var(--success-fg)]/70">{invoice.paidAt ? `Hoàn tất lúc ${formatDateTime(invoice.paidAt)}` : "Chưa ghi nhận thời điểm thanh toán."}</p>
                </div>
              ) : isRefunded ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  Hóa đơn đã được ghi nhận trạng thái hoàn tiền. Chi tiết giao dịch hoàn tiền chưa được cập nhật.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Yêu cầu liên quan</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Mã yêu cầu vận chuyển</p>
              <button onClick={() => navigate("request-detail", { id: invoice.requestId })} className="font-mono text-xs font-medium text-primary hover:underline">{invoice.requestId}</button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tóm tắt chi phí</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tổng hóa đơn</span><span className="font-medium">{formatMoney(invoice.amount, invoice.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Đã thanh toán</span><span className="font-medium text-[var(--success-fg)]">−{formatMoney(totalPaid, invoice.currency)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Còn phải trả</span><span className="text-[var(--warning-fg)]">{formatMoney(remaining, invoice.currency)}</span></div>
            </CardContent>
          </Card>

          <div className="no-print space-y-2">
            <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> In / Lưu PDF</Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => {
              exportToCSV(`hoa-don-${invoiceCode(invoice.invoiceId)}.csv`,
                ["Invoice ID", "Transport request ID", "Amount", "Currency", "Payment status", "Issued at (ISO 8601)", "Paid at (ISO 8601)", "Payment method", "Invoice PDF URL"],
                [[invoice.invoiceId, invoice.requestId, invoice.amount, invoice.currency, paymentStatusLabel, invoice.issuedAt, invoice.paidAt ?? "", invoice.paymentMethod || "", invoice.pdfUrl]]);
              toast({ title: "Đã xuất CSV" });
            }}><Download className="h-4 w-4" /> Tải CSV</Button>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block mt-8 border-t border-[var(--ink-soft)] pt-3 text-center text-xs text-[var(--ink-soft)]">
        <p>Cảm ơn quý khách đã sử dụng dịch vụ vận chuyển ngựa đua EQUIDELI.</p>
        <p className="mt-1">EQUIDELI © 2026 · Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới</p>
      </div>
    </div>
  );
}
