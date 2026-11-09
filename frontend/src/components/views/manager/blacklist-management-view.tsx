"use client";

/**
 * ============================================================================
 * EQUIDELI — QUẢN LÝ DANH SÁCH KHÁCH HÀNG HẠN CHẾ (BLACKLIST MANAGEMENT VIEW)
 * ============================================================================
 * Phân hệ này dành cho Quản lý Logistics (`LOGISTICS_MANAGER`) nhằm quản lý
 * các tài khoản Khách hàng (`CUSTOMER`) vi phạm điều kiện dịch vụ hoặc còn
 * nghĩa vụ tài chính (công nợ hóa đơn quá hạn) chưa hoàn tất.
 *
 * Nguyên tắc nghiệp vụ cốt lõi:
 * - Hạn chế tài khoản (Blacklist) KHÔNG phải là xóa tài khoản hay khóa đăng nhập.
 * - Khách hàng bị hạn chế chỉ bị chặn quyền "Tạo yêu cầu vận chuyển mới",
 *   nhưng vẫn đăng nhập được để xem dữ liệu lịch sử, tải lên biên lai chuyển khoản
 *   (`PAYMENT_PROOF`) hoặc gửi đơn kiến nghị (`APPEAL`).
 * - Do thanh toán diễn ra ngoại tuyến, Quản lý Logistics sẽ trực tiếp kiểm tra
 *   chứng từ ngân hàng (`POST /blacklist/appeals/{id}/verify-payment`), xét duyệt
 *   kiến nghị (`POST /blacklist/appeals/{id}/review`) và phê duyệt mở khóa tài khoản
 *   (`POST /blacklist/{id}/reactivate`).
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, uploadFile } from "@/lib/api-client";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  Search,
  Filter,
  PlusCircle,
  AlertTriangle,
  UserX,
  CheckCircle,
  ExternalLink,
  Upload,
  Check,
  Eye,
  Loader2,
  RefreshCw,
  Truck,
  MessageSquare,
} from "lucide-react";

/** Cấu trúc một bản ghi Bằng chứng thanh toán hoặc Đơn kiến nghị từ Khách hàng */
export interface BlacklistAppealItem {
  appealId: string;
  blacklistId: string;
  customerId: string;
  customerName: string;
  appealType: "PAYMENT_PROOF" | "APPEAL";
  relatedInvoiceId?: string | null;
  relatedRequestId?: string | null;
  amountPaid?: number | null;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  referenceCode?: string | null;
  documentUrl?: string | null;
  content?: string | null;
  status: "PENDING" | "PAYMENT_VERIFIED" | "PAYMENT_UNVERIFIED" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUESTED";
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

/** Cấu trúc một Hồ sơ hạn chế tài khoản khách hàng (Blacklist Entry) */
export interface BlacklistItem {
  blacklistId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerAvatarUrl?: string | null;
  restrictedById: string;
  restrictedByName: string;
  restrictedAt: string;
  reason: string;
  description?: string | null;
  relatedRequestId?: string | null;
  relatedInvoiceId?: string | null;
  amountDue?: number | null;
  dueDate?: string | null;
  evidenceUrl?: string | null;
  status: "RESTRICTED" | "PENDING_REVIEW" | "APPROVED_FOR_REACTIVATION" | "REJECTED";
  resolutionNotes?: string | null;
  resolvedById?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
  reactivatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  appeals: BlacklistAppealItem[];
  activeTripsCount?: number;
}

/** Số liệu thống kê tổng quan của phân hệ Danh sách hạn chế */
export interface BlacklistStats {
  totalRestricted: number;
  unpaidRestricted: number;
  pendingReview: number;
  paymentVerified: number;
  reactivated: number;
  rejected: number;
}

interface CustomerUser {
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  organizationName?: string | null;
}

/** Danh mục các lý do hạn chế chuẩn hóa bằng tiếng Việt */
const REASON_OPTIONS = [
  { value: "UNPAID_INVOICE", label: "Chưa thanh toán hóa đơn" },
  { value: "OUTSTANDING_DEBT", label: "Còn công nợ vận chuyển" },
  { value: "SERVICE_VIOLATION", label: "Vi phạm điều kiện dịch vụ" },
  { value: "INACCURATE_INFO", label: "Cung cấp thông tin không chính xác" },
  { value: "TRANSPORT_VIOLATION", label: "Vi phạm quy định vận chuyển" },
  { value: "IMPACT_OPERATION", label: "Có hành vi gây ảnh hưởng dịch vụ" },
  { value: "OTHER", label: "Lý do khác" },
];

export function BlacklistManagementView() {
  const { toast } = useToast();

  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [stats, setStats] = useState<BlacklistStats>({
    totalRestricted: 0,
    unpaidRestricted: 0,
    pendingReview: 0,
    paymentVerified: 0,
    reactivated: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  // Trạng thái bộ lọc tìm kiếm
  const [search, setSearch] = useState("");
  const [filterReason, setFilterReason] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Trạng thái hộp thoại Thêm khách hàng vào danh sách hạn chế
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [reason, setReason] = useState("UNPAID_INVOICE");
  const [description, setDescription] = useState("");
  const [relatedRequestId, setRelatedRequestId] = useState("");
  const [relatedInvoiceId, setRelatedInvoiceId] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [creating, setCreating] = useState(false);

  // Trạng thái hộp thoại Xem chi tiết & Xử lý kiến nghị
  const [selectedItem, setSelectedItem] = useState<BlacklistItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Trạng thái ghi chú xác minh thanh toán và phản hồi kiến nghị
  const [verifyNotes, setVerifyNotes] = useState("");
  const [appealNotes, setAppealNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Trạng thái xác nhận mở khóa tài khoản
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [reactivateNotes, setReactivateNotes] = useState("");
  const [reactivating, setReactivating] = useState(false);

  /** Tải đồng thời danh sách hồ sơ hạn chế và thống kê tổng quan từ Server */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, statsData] = await Promise.all([
        apiGet<BlacklistItem[]>(`/blacklist?search=${encodeURIComponent(search)}&reason=${filterReason}&status=${filterStatus}`),
        apiGet<BlacklistStats>("/blacklist/stats"),
      ]);
      setItems(entriesData);
      setStats(statsData);
    } catch (err: unknown) {
      toast({
        title: "Không thể tải danh sách khách hàng hạn chế",
        description: err instanceof Error ? err.message : "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [search, filterReason, filterStatus, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /** Tải danh sách tài khoản Khách hàng để chọn khi tạo hồ sơ hạn chế mới */
  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const data = await apiGet<CustomerUser[]>("/users?role=CUSTOMER");
      setCustomers(data);
    } catch {
      // Bỏ qua nếu gặp lỗi tạm thời
    } finally {
      setLoadingCustomers(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedCustomerId("");
    setReason("UNPAID_INVOICE");
    setDescription("");
    setRelatedRequestId("");
    setRelatedInvoiceId("");
    setAmountDue("");
    setDueDate("");
    setEvidenceUrl("");
    setCreateModalOpen(true);
    void loadCustomers();
  };

  /** Tải tệp bằng chứng vi phạm lên Server */
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEvidence(true);
    try {
      const url = await uploadFile(file);
      setEvidenceUrl(url);
      toast({ title: "Tải chứng từ thành công" });
    } catch (err: unknown) {
      toast({
        title: "Không thể tải lên",
        description: err instanceof Error ? err.message : "Lỗi tệp.",
        variant: "destructive",
      });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!selectedCustomerId) {
      toast({ title: "Vui lòng chọn khách hàng", variant: "destructive" });
      return;
    }
    if (reason === "OTHER" && !description.trim()) {
      toast({ title: "Vui lòng nhập mô tả chi tiết cho lý do khác", variant: "destructive" });
      return;
    }
    setConfirmAddOpen(true);
  };

  /** Gửi yêu cầu thêm khách hàng vào danh sách hạn chế (`POST /blacklist`) */
  const executeAddBlacklist = async () => {
    setCreating(true);
    try {
      await apiPost("/blacklist", {
        customerId: selectedCustomerId,
        reason,
        description: description.trim() || null,
        relatedRequestId: relatedRequestId.trim() || null,
        relatedInvoiceId: relatedInvoiceId.trim() || null,
        amountDue: amountDue ? parseFloat(amountDue) : null,
        dueDate: dueDate || null,
        evidenceUrl: evidenceUrl || null,
      });

      toast({
        title: "Đã đưa khách hàng vào danh sách hạn chế",
        description: "Tài khoản khách hàng đã được chuyển sang trạng thái hạn chế tạo đơn mới.",
      });

      setConfirmAddOpen(false);
      setCreateModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast({
        title: "Không thể thêm vào danh sách hạn chế",
        description: err instanceof Error ? err.message : "Đã xảy ra lỗi.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const openDetail = (item: BlacklistItem) => {
    setSelectedItem(item);
    setVerifyNotes("");
    setAppealNotes("");
    setDetailModalOpen(true);
  };

  /**
   * Quản lý Logistics xác minh biên lai thanh toán ngoại tuyến do khách hàng gửi lên
   * (`POST /blacklist/appeals/{appealId}/verify-payment`).
   */
  const handleVerifyPayment = async (appealId: string, verified: boolean) => {
    setActionLoading(true);
    try {
      await apiPost(`/blacklist/appeals/${appealId}/verify-payment`, {
        verified,
        notes: verifyNotes.trim() || null,
      });

      toast({
        title: verified ? "Đã xác minh thanh toán" : "Đã từ chối chứng từ thanh toán",
        description: "Khách hàng đã nhận được thông báo phản hồi.",
      });

      await loadData();
      if (selectedItem) {
        const updated = await apiGet<BlacklistItem>(`/blacklist/${selectedItem.blacklistId}`);
        setSelectedItem(updated);
      }
    } catch (err: unknown) {
      toast({
        title: "Thao tác thất bại",
        description: err instanceof Error ? err.message : "Lỗi xử lý.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Quản lý Logistics xét duyệt đơn kiến nghị của khách hàng
   * (`POST /blacklist/appeals/{appealId}/review`) với 3 quyết định:
   * - `APPROVE`: Chấp thuận kiến nghị
   * - `REJECT`: Từ chối kiến nghị
   * - `REQUEST_MORE_INFO`: Yêu cầu bổ sung thêm bằng chứng/thông tin
   */
  const handleReviewAppeal = async (appealId: string, decision: "APPROVE" | "REJECT" | "REQUEST_MORE_INFO") => {
    setActionLoading(true);
    try {
      await apiPost(`/blacklist/appeals/${appealId}/review`, {
        decision,
        notes: appealNotes.trim() || null,
      });

      toast({
        title: decision === "APPROVE" ? "Đã chấp thuận kiến nghị" : decision === "REJECT" ? "Đã từ chối kiến nghị" : "Đã yêu cầu bổ sung thông tin",
        description: "Đã gửi thông báo giải quyết tới khách hàng.",
      });

      await loadData();
      if (selectedItem) {
        const updated = await apiGet<BlacklistItem>(`/blacklist/${selectedItem.blacklistId}`);
        setSelectedItem(updated);
      }
    } catch (err: unknown) {
      toast({
        title: "Thao tác thất bại",
        description: err instanceof Error ? err.message : "Lỗi xử lý.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Phê duyệt mở khóa tài khoản cho khách hàng (`POST /blacklist/{blacklistId}/reactivate`).
   * Sau khi mở khóa, khách hàng có thể tạo đơn vận chuyển mới bình thường.
   */
  const handleReactivate = async () => {
    if (!selectedItem) return;
    setReactivating(true);
    try {
      await apiPost(`/blacklist/${selectedItem.blacklistId}/reactivate`, {
        notes: reactivateNotes.trim() || "Quản lý Logistics đã chấp thuận mở khóa tài khoản.",
      });

      toast({
        title: "Phê duyệt mở khóa thành công",
        description: `Tài khoản ${selectedItem.customerName} đã được khôi phục trạng thái hoạt động bình thường.`,
      });

      setReactivateConfirmOpen(false);
      setDetailModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast({
        title: "Không thể mở khóa tài khoản",
        description: err instanceof Error ? err.message : "Lỗi xử lý.",
        variant: "destructive",
      });
    } finally {
      setReactivating(false);
    }
  };

  /** Hiển thị Badge trạng thái hồ sơ hạn chế với màu sắc ngữ nghĩa */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESTRICTED":
        return <Badge variant="outline" className="bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)]">Bị hạn chế</Badge>;
      case "PENDING_REVIEW":
        return <Badge variant="outline" className="bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning-border)]">Chờ xem xét</Badge>;
      case "APPROVED_FOR_REACTIVATION":
        return <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)]">Đã mở khóa</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-muted text-[var(--text-secondary)] border-border">Bị từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /** Chuyển mã lý do hạn chế sang nhãn tiếng Việt */
  const getReasonLabel = (code: string) => {
    const found = REASON_OPTIONS.find((r) => r.value === code);
    return found ? found.label : code;
  };

  const selectedCustomerObj = customers.find((c) => c.userId === selectedCustomerId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh sách khách hàng hạn chế"
        description="Theo dõi danh sách khách hàng bị hạn chế tài khoản, xử lý xác minh thanh toán và phê duyệt mở khóa dịch vụ."
        icon={<ShieldAlert className="h-5 w-5" />}
        actions={
          <Button
            onClick={openCreateDialog}
            className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
          >
            <PlusCircle className="h-4 w-4" />
            Thêm vào danh sách hạn chế
          </Button>
        }
      />

      {/* 1. Các thẻ chỉ số thống kê (Statistics Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border bg-card/80 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase">Tổng hạn chế</p>
          <p className="text-2xl font-bold text-[var(--danger-fg)] mt-1">{stats.totalRestricted}</p>
        </Card>
        <Card className="border-border bg-card/80 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase">Chưa thanh toán</p>
          <p className="text-2xl font-bold text-[var(--warning-fg)] mt-1">{stats.unpaidRestricted}</p>
        </Card>
        <Card className="border-border bg-card/80 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase">Chờ xem xét</p>
          <p className="text-2xl font-bold text-[var(--info-fg)] mt-1">{stats.pendingReview}</p>
        </Card>
        <Card className="border-border bg-card/80 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase">Đã xác minh tiền</p>
          <p className="text-2xl font-bold text-[var(--text-cyan)] mt-1">{stats.paymentVerified}</p>
        </Card>
        <Card className="border-border bg-card/80 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase">Đã mở khóa</p>
          <p className="text-2xl font-bold text-[var(--success-fg)] mt-1">{stats.reactivated}</p>
        </Card>
        <Card className="border-border bg-card/80 p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase">Kiến nghị từ chối</p>
          <p className="text-2xl font-bold text-[var(--text-muted)] mt-1">{stats.rejected}</p>
        </Card>
      </div>

      {/* 2. Thanh tìm kiếm và lọc theo Lý do / Trạng thái */}
      <Card className="border-border bg-card/60 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, mã định danh..."
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Filter className="h-3.5 w-3.5" />
              <span>Lý do:</span>
            </div>
            <Select value={filterReason} onValueChange={setFilterReason}>
              <SelectTrigger className="h-9 text-xs w-[180px] bg-background">
                <SelectValue placeholder="Tất cả lý do" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả lý do</SelectItem>
                {REASON_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] ml-2">
              <span>Trạng thái:</span>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 text-xs w-[160px] bg-background">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="RESTRICTED">Đang hạn chế</SelectItem>
                <SelectItem value="PENDING_REVIEW">Chờ xem xét</SelectItem>
                <SelectItem value="APPROVED_FOR_REACTIVATION">Đã mở khóa</SelectItem>
                <SelectItem value="REJECTED">Bị từ chối</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => void loadData()} className="h-9 px-3 gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Bảng danh sách hồ sơ hạn chế */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Đang tải danh sách khách hàng hạn chế...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--text-secondary)]">
              <ShieldAlert className="h-10 w-10 opacity-40 text-[var(--success-fg)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Không có khách hàng nào trong danh sách hạn chế</p>
              <p className="text-xs text-[var(--text-secondary)]">Không có hồ sơ hạn chế phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[var(--text-secondary)] font-semibold">
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-3">Lý do hạn chế</th>
                    <th className="py-3 px-3">Đơn / Hóa đơn</th>
                    <th className="py-3 px-3">Số tiền nợ</th>
                    <th className="py-3 px-3">Người thực hiện</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item) => {
                    const initials = (item.customerName || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <tr key={item.blacklistId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              {item.customerAvatarUrl && <AvatarImage src={item.customerAvatarUrl} alt={item.customerName} />}
                              <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-[var(--text-primary)] text-sm">{item.customerName}</p>
                              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] mt-0.5">
                                <span>{item.customerEmail}</span>
                                {item.customerPhone && <span>· {item.customerPhone}</span>}
                              </div>
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                Mã: {item.customerId.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-[200px]">
                          <p className="font-medium text-[var(--text-primary)]">{getReasonLabel(item.reason)}</p>
                          {item.description && (
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">{item.description}</p>
                          )}
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {new Date(item.restrictedAt).toLocaleDateString("vi-VN")}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          {item.relatedRequestId ? (
                            <span className="font-mono text-[11px] block text-[var(--text-primary)]">
                              Đơn #{item.relatedRequestId.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px]">—</span>
                          )}
                          {item.relatedInvoiceId && (
                            <span className="font-mono text-[10px] text-[var(--text-secondary)] block">
                              HĐ #{item.relatedInvoiceId.slice(0, 8)}
                            </span>
                          )}
                          {(item.activeTripsCount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--warning-fg)] mt-0.5">
                              <Truck className="h-3 w-3" /> {item.activeTripsCount} chuyến đang chạy
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {item.amountDue != null ? (
                            <span className="font-semibold text-[var(--danger-fg)] text-sm">
                              ${item.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-medium text-[var(--text-primary)]">{item.restrictedByName}</p>
                        </td>

                        <td className="py-3 px-3">
                          {getStatusBadge(item.status)}
                          {item.appeals && item.appeals.length > 0 && (
                            <span className="block text-[10px] text-[var(--info-fg)] mt-1">
                              {item.appeals.length} kiến nghị / chứng từ
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetail(item)}
                            className="h-8 text-xs gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Chi tiết
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. HỘP THOẠI: Thêm khách hàng vào danh sách hạn chế */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserX className="h-5 w-5 text-[var(--danger-fg)]" />
              Thêm khách hàng vào danh sách hạn chế
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-secondary)]">
              Tài khoản khách hàng sẽ bị hạn chế tạo đơn mới nhưng vẫn được phép đăng nhập gửi kiến nghị và chứng từ thanh toán.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Chọn khách hàng */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">
                Chọn khách hàng vi phạm <span className="text-[var(--danger-fg)]">*</span>
              </Label>
              {loadingCustomers ? (
                <p className="text-xs text-[var(--text-secondary)]">Đang tải danh sách khách hàng...</p>
              ) : (
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="— Chọn tài khoản khách hàng —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {customers.map((c) => (
                      <SelectItem key={c.userId} value={c.userId}>
                        {c.name} ({c.email}) {c.organizationName ? `· ${c.organizationName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedCustomerObj && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
                <p><span className="text-[var(--text-secondary)]">Họ tên:</span> <strong className="text-[var(--text-primary)]">{selectedCustomerObj.name}</strong></p>
                <p><span className="text-[var(--text-secondary)]">Email:</span> {selectedCustomerObj.email}</p>
                <p><span className="text-[var(--text-secondary)]">Điện thoại:</span> {selectedCustomerObj.phoneNumber || "—"}</p>
                <p className="font-mono text-[10px] text-[var(--text-muted)]">Mã định danh: {selectedCustomerObj.userId}</p>
              </div>
            )}

            {/* Chọn lý do hạn chế */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">
                Lý do hạn chế <span className="text-[var(--danger-fg)]">*</span>
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mô tả chi tiết */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">
                Mô tả chi tiết vi phạm {reason === "OTHER" && <span className="text-[var(--danger-fg)]">*</span>}
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập nội dung vi phạm, căn cứ xác minh..."
                className="text-xs bg-background min-h-[70px]"
              />
            </div>

            {/* Mã đơn & Hóa đơn liên quan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Mã đơn vận chuyển liên quan</Label>
                <Input
                  value={relatedRequestId}
                  onChange={(e) => setRelatedRequestId(e.target.value)}
                  placeholder="Mã định danh đơn vận chuyển"
                  className="h-8 text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Mã hóa đơn liên quan</Label>
                <Input
                  value={relatedInvoiceId}
                  onChange={(e) => setRelatedInvoiceId(e.target.value)}
                  placeholder="Mã định danh hóa đơn"
                  className="h-8 text-xs bg-background font-mono"
                />
              </div>
            </div>

            {/* Số tiền nợ & Ngày đến hạn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Số tiền còn phải thanh toán (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountDue}
                  onChange={(e) => setAmountDue(e.target.value)}
                  placeholder="Ví dụ: 1250.00"
                  className="h-8 text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Ngày đến hạn thanh toán</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Tải lên bằng chứng vi phạm */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[var(--text-primary)]">Tài liệu / Bằng chứng vi phạm</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="Đường dẫn chứng từ hoặc chọn tệp..."
                  className="h-8 text-xs bg-background flex-1"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80">
                    {uploadingEvidence ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Tải tệp
                  </span>
                  <input type="file" onChange={handleEvidenceUpload} className="hidden" accept="image/*,.pdf" />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 border-t border-border/60 pt-3">
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button
              size="sm"
              onClick={handleConfirmAdd}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              Tiếp tục xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại Xác nhận trước khi áp dụng hạn chế */}
      <AlertDialog open={confirmAddOpen} onOpenChange={setConfirmAddOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--danger-fg)] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận hạn chế tài khoản khách hàng
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2 text-[var(--text-primary)]">
              <p>Bạn sắp áp dụng chế độ hạn chế tài khoản cho khách hàng:</p>
              <div className="p-3 bg-muted/30 rounded-lg border border-border/80 text-xs">
                <p><strong>Khách hàng:</strong> {selectedCustomerObj?.name}</p>
                <p><strong>Lý do:</strong> {getReasonLabel(reason)}</p>
                {amountDue && <p><strong>Số tiền nợ:</strong> ${amountDue}</p>}
              </div>
              <p className="text-[var(--text-secondary)] text-[11px]">
                • Tài khoản này sẽ bị chặn tạo đơn vận chuyển mới.<br />
                • Khách hàng vẫn có quyền đăng nhập để xem hồ sơ và gửi kiến nghị / bằng chứng thanh toán.<br />
                • Dữ liệu và các chuyến đang vận chuyển sẽ không bị hủy bỏ.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creating}>Quay lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAddBlacklist}
              disabled={creating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Xác nhận hạn chế
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 5. HỘP THOẠI: Xem xét & Xử lý hồ sơ hạn chế (Detail Modal) */}
      {selectedItem && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-border bg-card p-6">
            <DialogHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-[var(--danger-fg)]" />
                    Hồ sơ hạn chế: {selectedItem.customerName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Mã hồ sơ: <span className="font-mono text-[var(--text-primary)]">{selectedItem.blacklistId}</span>
                  </DialogDescription>
                </div>
                {getStatusBadge(selectedItem.status)}
              </div>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Chi tiết khách hàng & Lý do hạn chế */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-4 rounded-xl border border-border text-xs">
                <div>
                  <span className="text-[var(--text-secondary)] block text-[11px]">Khách hàng</span>
                  <p className="font-semibold text-[var(--text-primary)] text-sm">{selectedItem.customerName}</p>
                  <p className="text-[var(--text-secondary)]">{selectedItem.customerEmail}</p>
                  {selectedItem.customerPhone && <p className="text-[var(--text-secondary)]">{selectedItem.customerPhone}</p>}
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] block text-[11px]">Lý do hạn chế</span>
                  <p className="font-semibold text-[var(--danger-fg)]">{getReasonLabel(selectedItem.reason)}</p>
                  <p className="text-[var(--text-secondary)] text-[11px]">Ngày: {new Date(selectedItem.restrictedAt).toLocaleString("vi-VN")}</p>
                  <p className="text-[var(--text-secondary)] text-[11px]">Bởi: {selectedItem.restrictedByName}</p>
                </div>
                {selectedItem.amountDue != null && (
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[11px]">Số tiền cần thanh toán</span>
                    <p className="font-bold text-[var(--danger-fg)] text-sm">
                      ${selectedItem.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    {selectedItem.dueDate && <p className="text-[10px] text-[var(--text-secondary)]">Hạn: {selectedItem.dueDate}</p>}
                  </div>
                )}
                <div>
                  <span className="text-[var(--text-secondary)] block text-[11px]">Đơn / Hóa đơn gắn liền</span>
                  <p className="font-mono text-[11px] text-[var(--text-primary)]">
                    {selectedItem.relatedRequestId ? `Đơn: #${selectedItem.relatedRequestId.slice(0, 8)}` : "—"}
                  </p>
                  {selectedItem.relatedInvoiceId && (
                    <p className="font-mono text-[10px] text-[var(--text-secondary)]">HĐ: #{selectedItem.relatedInvoiceId.slice(0, 8)}</p>
                  )}
                </div>
                {selectedItem.description && (
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-border/40">
                    <span className="text-[var(--text-secondary)] block text-[11px]">Mô tả vi phạm</span>
                    <p className="text-[var(--text-primary)]">{selectedItem.description}</p>
                  </div>
                )}
                {selectedItem.evidenceUrl && (
                  <div className="col-span-1 sm:col-span-2 pt-1">
                    <a
                      href={selectedItem.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Xem chứng từ / bằng chứng vi phạm đính kèm
                    </a>
                  </div>
                )}
              </div>

              {/* Thông tin mở khóa nếu tài khoản đã được khôi phục */}
              {selectedItem.status === "APPROVED_FOR_REACTIVATION" && (
                <div className="p-3 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-[var(--success-fg)] flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Tài khoản đã được mở khóa hoạt động bình thường
                  </p>
                  <p className="text-[var(--text-primary)]">Người duyệt: <strong>{selectedItem.resolvedByName || "Quản lý"}</strong> lúc {selectedItem.reactivatedAt ? new Date(selectedItem.reactivatedAt).toLocaleString("vi-VN") : ""}</p>
                  {selectedItem.resolutionNotes && (
                    <p className="text-[var(--text-secondary)]">Ghi chú mở khóa: {selectedItem.resolutionNotes}</p>
                  )}
                </div>
              )}

              {/* Danh sách Bằng chứng thanh toán & Đơn kiến nghị từ khách hàng */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Danh sách bằng chứng & kiến nghị ({selectedItem.appeals?.length || 0})
                </h4>

                {(!selectedItem.appeals || selectedItem.appeals.length === 0) ? (
                  <p className="text-xs text-[var(--text-secondary)] py-4 text-center bg-muted/10 rounded-lg">
                    Chưa có bằng chứng thanh toán hoặc đơn kiến nghị nào từ khách hàng.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedItem.appeals.map((a) => (
                      <div key={a.appealId} className="border border-border/80 bg-card rounded-xl p-4 text-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <div className="flex items-center gap-2">
                            {a.appealType === "PAYMENT_PROOF" ? (
                              <Badge variant="outline" className="bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-border)]">
                                Bằng chứng thanh toán
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/40">
                                Đơn kiến nghị
                              </Badge>
                            )}
                            <span className="text-[11px] text-[var(--text-secondary)]">
                              {new Date(a.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>

                          <div>
                            {a.status === "PENDING" && <Badge variant="outline" className="bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning-border)]">Chờ xử lý</Badge>}
                            {a.status === "PAYMENT_VERIFIED" && <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)]">Đã xác minh tiền</Badge>}
                            {a.status === "PAYMENT_UNVERIFIED" && <Badge variant="outline" className="bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)]">Chưa xác minh</Badge>}
                            {a.status === "APPROVED" && <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)]">Đã chấp thuận</Badge>}
                            {a.status === "REJECTED" && <Badge variant="outline" className="bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)]">Đã từ chối</Badge>}
                            {a.status === "MORE_INFO_REQUESTED" && <Badge variant="outline" className="bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-border)]">Yêu cầu bổ sung</Badge>}
                          </div>
                        </div>

                        {a.appealType === "PAYMENT_PROOF" ? (
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <p><span className="text-[var(--text-secondary)]">Số tiền:</span> <strong className="text-[var(--text-primary)]">${a.amountPaid?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p>
                            <p><span className="text-[var(--text-secondary)]">Ngày:</span> {a.paymentDate}</p>
                            <p><span className="text-[var(--text-secondary)]">Hình thức:</span> {a.paymentMethod || "—"}</p>
                            <p><span className="text-[var(--text-secondary)]">Mã tham chiếu:</span> <span className="font-mono text-[var(--text-primary)]">{a.referenceCode || "—"}</span></p>
                          </div>
                        ) : null}

                        {a.content && (
                          <div className="bg-muted/20 p-2.5 rounded text-[11px]">
                            <p className="text-[var(--text-secondary)] text-[10px] uppercase font-semibold">Nội dung giải trình / ghi chú:</p>
                            <p className="text-[var(--text-primary)] mt-0.5">{a.content}</p>
                          </div>
                        )}

                        {a.documentUrl && (
                          <div>
                            <a
                              href={a.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Xem ảnh biên lai / chứng từ đính kèm
                            </a>
                          </div>
                        )}

                        {a.reviewedAt && (
                          <div className="bg-muted/30 p-2.5 rounded text-[11px] border border-border/60">
                            <p className="text-[var(--text-secondary)] text-[10px]">
                              Đã xử lý bởi <strong>{a.reviewerName || "Quản lý"}</strong> lúc {new Date(a.reviewedAt).toLocaleString("vi-VN")}
                            </p>
                            {a.reviewNotes && <p className="text-[var(--text-primary)] mt-0.5">Phản hồi: {a.reviewNotes}</p>}
                          </div>
                        )}

                        {/* Các nút thao tác xử lý dành cho Quản lý khi kiến nghị đang ở trạng thái PENDING */}
                        {a.status === "PENDING" && (
                          <div className="pt-2 border-t border-border/40 space-y-2">
                            {a.appealType === "PAYMENT_PROOF" ? (
                              <div className="space-y-2">
                                <Input
                                  value={verifyNotes}
                                  onChange={(e) => setVerifyNotes(e.target.value)}
                                  placeholder="Ghi chú xác minh thanh toán (ví dụ: Đã kiểm tra khớp lệnh chuyển tiền Vietcombank)..."
                                  className="h-8 text-xs bg-background"
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => void handleVerifyPayment(a.appealId, false)}
                                    className="h-7 text-xs text-[var(--danger-fg)] border-[var(--danger-border)] hover:bg-[var(--danger-bg)]"
                                  >
                                    Chưa xác minh được
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => void handleVerifyPayment(a.appealId, true)}
                                    className="h-7 text-xs bg-[var(--success)] hover:bg-[var(--success)]/90 text-[#171311] font-semibold gap-1"
                                  >
                                    <Check className="h-3 w-3" />
                                    Xác minh thanh toán thành công
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Input
                                  value={appealNotes}
                                  onChange={(e) => setAppealNotes(e.target.value)}
                                  placeholder="Nhập lý do hoặc phản hồi cho khách hàng..."
                                  className="h-8 text-xs bg-background"
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => void handleReviewAppeal(a.appealId, "REQUEST_MORE_INFO")}
                                    className="h-7 text-xs border-border"
                                  >
                                    Yêu cầu bổ sung
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => void handleReviewAppeal(a.appealId, "REJECT")}
                                    className="h-7 text-xs text-[var(--danger-fg)] border-[var(--danger-border)]"
                                  >
                                    Từ chối kiến nghị
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => void handleReviewAppeal(a.appealId, "APPROVE")}
                                    className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
                                  >
                                    Chấp thuận kiến nghị
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-5 border-t border-border/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>

              {selectedItem.status !== "APPROVED_FOR_REACTIVATION" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setReactivateNotes("Quản lý Logistics đã chấp thuận khôi phục tài khoản.");
                    setReactivateConfirmOpen(true);
                  }}
                  className="bg-[var(--success)] hover:bg-[var(--success)]/90 text-[#171311] font-semibold gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Phê duyệt mở khóa tài khoản
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Hộp thoại Xác nhận phê duyệt mở khóa tài khoản */}
      <AlertDialog open={reactivateConfirmOpen} onOpenChange={setReactivateConfirmOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--success-fg)] flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Xác nhận phê duyệt mở khóa tài khoản
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2 text-[var(--text-primary)]">
              <p>Bạn sắp mở khóa tài khoản cho khách hàng: <strong>{selectedItem?.customerName}</strong></p>
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Ghi chú quyết định mở khóa:</Label>
                <Input
                  value={reactivateNotes}
                  onChange={(e) => setReactivateNotes(e.target.value)}
                  placeholder="Ghi chú mở khóa..."
                  className="h-8 text-xs bg-background"
                />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] pt-1">
                • Trạng thái tài khoản sẽ trở lại hoạt động bình thường.<br />
                • Khách hàng sẽ được phép tạo đơn vận chuyển mới.<br />
                • Toàn bộ lịch sử vi phạm và kiến nghị vẫn được lưu trữ vĩnh viễn trên hệ thống.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reactivating}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={reactivating}
              className="bg-[var(--success)] hover:bg-[var(--success)]/90 text-[#171311] font-semibold"
            >
              {reactivating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Xác nhận mở khóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
