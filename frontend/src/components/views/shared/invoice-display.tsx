import { useEffect, useState } from "react";
import { ApiError, apiGet, apiPut } from "@/lib/api-client";
import { formatDateTime, formatMoney, invoiceCode } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CheckCircle2, CreditCard, Receipt } from "lucide-react";

interface InvoiceRecord {
  invoiceId: string;
  requestId: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string | null;
  issuedAt: string;
  paidAt: string | null;
}

interface InvoiceDisplayProps {
  requestId: string;
}

export function InvoiceDisplay({ requestId }: InvoiceDisplayProps) {
  const user = useAppStore((state) => state.user);
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Chuyển khoản thủ công");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const markPaid = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      const updated = await apiPut<InvoiceRecord>(`/invoices/${invoice.invoiceId}/pay`, { paymentMethod });
      if (updated.invoiceId !== invoice.invoiceId || updated.paymentStatus !== "PAID") {
        throw new Error("Backend không xác nhận trạng thái đã thanh toán.");
      }
      setInvoice(updated);
      setConfirmOpen(false);
      toast({ title: "Đã ghi nhận thanh toán thủ công" });
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
    return <Card><CardContent className="p-4 text-sm text-muted-foreground">Đang tải hóa đơn...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="p-4 text-sm text-destructive" role="alert">{error}</CardContent></Card>;
  }

  if (!invoice) {
    return <Card><CardContent className="p-4 text-sm text-muted-foreground">Chưa có hóa đơn được phát hành cho yêu cầu này.</CardContent></Card>;
  }

  const isManager = user?.roleId === "LOGISTICS_MANAGER";
  const isUnpaid = invoice.paymentStatus === "UNPAID";
  const statusLabel = invoice.paymentStatus === "PAID"
    ? "Đã thanh toán"
    : invoice.paymentStatus === "UNPAID"
      ? "Chưa thanh toán"
      : invoice.paymentStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" /> Báo giá và thanh toán
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Tổng hóa đơn {invoiceCode(invoice.invoiceId)}</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(invoice.amount, invoice.currency)}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium">{statusLabel}</p>
            <p className="text-xs text-muted-foreground">Phát hành {formatDateTime(invoice.issuedAt)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tổng chi phí dịch vụ vận chuyển và chăm sóc ngựa trọn gói.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> Hướng dẫn thanh toán</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanh toán thủ công bằng chuyển khoản hoặc tiền mặt theo thông tin đã được đơn vị vận chuyển xác nhận.
            Hệ thống chưa cấu hình tài khoản nhận tiền; vui lòng xác minh thông tin trực tiếp trước khi chuyển khoản.
            Khi chuyển khoản, ghi mã yêu cầu {requestId} trong nội dung.
          </p>
        </div>
        {isManager && isUnpaid && (
          <div className="space-y-3">
            <label className="block space-y-2 text-sm">
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
            <Button onClick={() => setConfirmOpen(true)} disabled={saving} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Xác nhận đã thanh toán
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ghi nhận đã nhận thanh toán?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Chỉ xác nhận khoản tiền đã nhận bên ngoài hệ thống. Equideli không thực hiện giao dịch thanh toán.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={saving}>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={(event) => { event.preventDefault(); void markPaid(); }} disabled={saving}>
                    {saving ? "Đang cập nhật..." : "Xác nhận"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {invoice.paymentStatus === "PAID" && (
          <p className="flex items-center gap-2 text-sm text-[var(--success-fg)]">
            <CheckCircle2 className="h-4 w-4" /> {invoice.paidAt ? `Đã ghi nhận lúc ${formatDateTime(invoice.paidAt)}` : "Đã ghi nhận thanh toán"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
