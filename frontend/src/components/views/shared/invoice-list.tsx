"use client";

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
import { Receipt, Search, ChevronRight, Calendar, Clock, CreditCard, Plus, Loader2, Download } from "lucide-react";
import { formatDate, formatMoney, invoiceCode, requestCode } from "@/lib/constants";
import { exportToCSV } from "@/lib/csv-export";
import { ListStatsBar } from "@/components/app/list-stats-bar";

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

interface ApprovedRequest {
  requestId: string;
  customerName: string;
  estimatedAmount: number | null;
  currency: string;
}

interface CurrencyTotals {
  total: number;
  paid: number;
  unpaid: number;
}

export function normalizePaymentStatus(status: string | null | undefined): "PAID" | "UNPAID" | "REFUNDED" | "UNKNOWN" {
  if (!status) return "UNKNOWN";
  const s = status.trim().toLowerCase();
  if (s === "paid" || s === "da thanh toan" || s === "đã thanh toán" || s === "completed") return "PAID";
  if (s === "unpaid" || s === "chua thanh toan" || s === "chưa thanh toán" || s === "pending") return "UNPAID";
  if (s === "refunded" || s === "da hoan tien" || s === "đã hoàn tiền") return "REFUNDED";
  return "UNKNOWN";
}

function paymentStatusLabel(status: string): string {
  const normalized = normalizePaymentStatus(status);
  switch (normalized) {
    case "UNPAID": return "Chưa thanh toán";
    case "PAID": return "Đã thanh toán";
    case "REFUNDED": return "Đã hoàn tiền";
    default: return status;
  }
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

  const isManager = user?.roleId === "LOGISTICS_MANAGER";

  const load = async () => {
    try { setInvoices(await apiGet<InvoiceRecord[]>("/invoices")); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể tải hóa đơn."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void Promise.resolve().then(load); }, []);


  useEffect(() => {
    if (showCreate && isManager) {
      apiGet<ApprovedRequest[]>("/transport-requests?status=APPROVED")
        .then(setApprovedRequests)
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Không thể tải các yêu cầu đã phê duyệt.");
        });
    }
  }, [showCreate, isManager]);

  const handleCreate = async () => {
    const selectedRequest = approvedRequests.find((request) => request.requestId === createForm.requestId);
    if (!createForm.requestId || !createForm.amount || !createForm.pdfUrl.trim()) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng chọn đơn, nhập số tiền và link PDF hóa đơn.", variant: "destructive" });
      return;
    }
    if (selectedRequest?.currency !== "USD") {
      toast({
        title: "Không thể lập hóa đơn",
        description: "Chỉ hỗ trợ yêu cầu có đơn vị USD. Hệ thống không tự quy đổi dữ liệu lịch sử.",
        variant: "destructive",
      });
      return;
    }
    if (createForm.pdfUrl.trim().length > 512) {
      toast({ title: "Link PDF quá dài", description: "Đường dẫn PDF tối đa 512 ký tự.", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    try {
      await apiPost("/invoices", {
        requestId: createForm.requestId,
        amount: Number(createForm.amount),
        currency: createForm.currency,
        pdfUrl: createForm.pdfUrl.trim(),
        paymentMethod: createForm.paymentMethod,
      });
      toast({ title: "Đã tạo hóa đơn" });
      setShowCreate(false);
      setCreateForm({ requestId: "", amount: "", currency: "USD", pdfUrl: "", paymentMethod: "Chuyển khoản thủ công" });
      load();
    } catch (e) { toast({ title: "Lỗi", description: e instanceof Error ? e.message : "Không thể tạo hóa đơn.", variant: "destructive" }); }
    finally { setCreateLoading(false); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const filtered = invoices.filter((inv) => {
    const matchSearch = !search || inv.requestId.includes(search) || inv.invoiceId.includes(search) || (inv.customerName?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus = statusFilter === "Tất cả" || paymentStatusLabel(inv.paymentStatus) === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExportCSV = () => {
    const headers = [
      "Invoice ID",
      "Transport request ID",
      "Amount",
      "Currency",
      "Payment status",
      "Issued at (ISO 8601)",
      "Paid at (ISO 8601)",
      "Payment method",
      "Invoice PDF URL",
    ];
    const rows = filtered.map((inv) => [
      inv.invoiceId,
      inv.requestId,
      inv.amount,
      inv.currency,
      paymentStatusLabel(inv.paymentStatus),
      inv.issuedAt,
      inv.paidAt ?? "",
      inv.paymentMethod || "",
      inv.pdfUrl,
    ]);
    exportToCSV(`equideli-hoa-don-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast({ title: "Đã xuất CSV", description: `${rows.length} hóa đơn đã được tải xuống.` });
  };

  const totalsByCurrency = invoices.reduce<Record<string, CurrencyTotals>>((totals, invoice) => {
    const currency = invoice.currency || "USD";
    const currencyTotals = totals[currency] || { total: 0, paid: 0, unpaid: 0 };
    const amount = Number(invoice.amount) || 0;
    currencyTotals.total += amount;
    const normalized = normalizePaymentStatus(invoice.paymentStatus);
    if (normalized === "PAID") currencyTotals.paid += amount;
    if (normalized === "UNPAID") currencyTotals.unpaid += amount;
    totals[currency] = currencyTotals;
    return totals;
  }, {});
  const formatCurrencyTotals = (getAmount: (totals: CurrencyTotals) => number) =>
    Object.entries(totalsByCurrency)
      .map(([currency, totals]) => formatMoney(getAmount(totals), currency))
      .join(" · ") || formatMoney(0, "USD");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hóa đơn & Thanh toán"
        description={isManager ? "Quản lý hóa đơn và theo dõi trạng thái thanh toán" : "Hóa đơn và trạng thái thanh toán của các yêu cầu của bạn"}
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm kiếm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="pl-9" /></div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0} className="gap-1.5"><Download className="h-4 w-4" /> <span className="hidden sm:inline">Xuất CSV</span></Button>
            {isManager && <Button onClick={() => setShowCreate(true)} className="gap-2 btn-press"><Plus className="h-4 w-4" /> Tạo hóa đơn</Button>}
          </div>
        }
      />

      {/* Create invoice modal */}
      {showCreate && (
        <Card className="border-primary/30 animate-fade-in-up">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Tạo hóa đơn mới</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Đơn vận chuyển</Label>
              <select value={createForm.requestId} onChange={(e) => {
                const req = approvedRequests.find((r) => r.requestId === e.target.value);
                setCreateForm({
                  ...createForm,
                  requestId: e.target.value,
                  amount: req?.currency === "USD" && req.estimatedAmount != null ? String(req.estimatedAmount) : "",
                  currency: "USD",
                });
              }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">— Chọn đơn đã phê duyệt —</option>
                {approvedRequests.map((r) => <option key={r.requestId} value={r.requestId} disabled={r.currency !== "USD"}>{r.customerName || "Khách hàng"} — Đơn {requestCode(r.requestId)}{r.estimatedAmount != null ? ` (${formatMoney(r.estimatedAmount, r.currency)})` : ""}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Chọn yêu cầu đã phê duyệt và cung cấp link PDF hóa đơn.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Số tiền</Label><Input type="number" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} placeholder="0" /></div>
              <div className="space-y-2"><Label>Loại tiền</Label><Input value="USD" readOnly /></div>
              {approvedRequests.find((request) => request.requestId === createForm.requestId)?.currency !== "USD" && createForm.requestId && (
                <p className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-bg)]/30 p-3 text-sm text-[var(--warning-fg)]">
                  Yêu cầu này dùng đơn vị tiền tệ lịch sử khác USD. Không thể lập hóa đơn cho tới khi dữ liệu được xử lý; hệ thống không tự quy đổi.
                </p>
              )}
            </div>
            <div className="space-y-2"><Label>Link PDF hóa đơn</Label><Input type="url" value={createForm.pdfUrl} onChange={(e) => setCreateForm({ ...createForm, pdfUrl: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Phương thức thanh toán</Label><select value={createForm.paymentMethod} onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Chuyển khoản thủ công</option><option>Tiền mặt</option></select></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
              <Button onClick={handleCreate} disabled={createLoading} className="gap-2">{createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tạo hóa đơn</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Receipt className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Tổng giá trị</p><p className="text-sm font-bold">{formatCurrencyTotals((totals) => totals.total)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-bg)] text-[var(--success-fg)]"><CreditCard className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Đã thanh toán</p><p className="text-sm font-bold text-[var(--success-fg)]">{formatCurrencyTotals((totals) => totals.paid)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning-fg)]"><Clock className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Chưa thanh toán</p><p className="text-sm font-bold text-[var(--warning-fg)]">{formatCurrencyTotals((totals) => totals.unpaid)}</p></div></div></CardContent></Card>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "Tất cả", count: invoices.length },
          { label: "Chưa thanh toán", count: invoices.filter((i) => paymentStatusLabel(i.paymentStatus) === "Chưa thanh toán").length },
          { label: "Đã thanh toán", count: invoices.filter((i) => paymentStatusLabel(i.paymentStatus) === "Đã thanh toán").length },
          { label: "Đã hoàn tiền", count: invoices.filter((i) => paymentStatusLabel(i.paymentStatus) === "Đã hoàn tiền").length },
        ].map((tab) => (
          <button key={tab.label} onClick={() => setStatusFilter(tab.label)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === tab.label ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{tab.label} ({tab.count})</button>
        ))}
      </div>

      {/* Stats overview */}
      <ListStatsBar
        total={invoices.length}
        filtered={filtered.length}
        stats={[
          { label: "Đã thanh toán", value: invoices.filter((i) => paymentStatusLabel(i.paymentStatus) === "Đã thanh toán").length, tone: "success" },
          { label: "Chưa thanh toán", value: invoices.filter((i) => paymentStatusLabel(i.paymentStatus) === "Chưa thanh toán").length, tone: "warning" },
          { label: "Đã hoàn tiền", value: invoices.filter((invoice) => paymentStatusLabel(invoice.paymentStatus) === "Đã hoàn tiền").length, tone: "danger" },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState illustration="no-data" title="Không có hóa đơn" description="Hóa đơn sẽ được tạo khi đơn vận chuyển được phê duyệt." />
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <button key={inv.invoiceId} onClick={() => navigate("invoice-detail", { id: inv.invoiceId })} className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Receipt className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Hóa đơn {invoiceCode(inv.invoiceId)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {isManager && <span>Khách hàng: {inv.customerName || `Đơn ${requestCode(inv.requestId)}`}</span>}
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Phát hành: {formatDate(inv.issuedAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={paymentStatusLabel(inv.paymentStatus)} />
                <span className="text-sm font-bold text-foreground">{formatMoney(inv.amount, inv.currency)}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
