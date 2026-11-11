"use client";

/**
 * ============================================================================
 * EQUIDELI — TRANG GIẢI QUYẾT TÀI KHOẢN BỊ HẠN CHẾ DÀNH CHO KHÁCH HÀNG
 * (CUSTOMER RESTRICTED ACCOUNT VIEW)
 * ============================================================================
 * Màn hình này dành cho Khách hàng (`CUSTOMER`) đang bị hạn chế tài khoản.
 * Giúp khách hàng tự tra cứu nguyên nhân và chủ động gửi hồ sơ giải quyết:
 * 1. Xem chi tiết quyết định hạn chế (`currentBlacklist`): Lý do, thời điểm,
 *    số tiền cần thanh toán (`amountDue`), hạn thanh toán (`dueDate`), mã đơn
 *    và mã hóa đơn liên quan.
 * 2. Gửi bằng chứng thanh toán ngoại tuyến (`POST /blacklist/my-payment-proof`):
 *    Khách hàng chuyển khoản ngân hàng bên ngoài hệ thống, sau đó tải ảnh biên lai
 *    (`uploadFile`) kèm số tiền, ngày chuyển và mã tham chiếu giao dịch để
 *    Quản lý Logistics đối soát.
 * 3. Gửi đơn kiến nghị / giải trình (`POST /blacklist/my-appeal`):
 *    Trình bày lý do và đính kèm tài liệu chứng minh nếu có sai sót.
 * 4. Theo dõi lịch sử xử lý (`appeals`): Xem trạng thái xét duyệt và ghi chú
 *    phản hồi trực tiếp từ Quản lý Logistics.
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, uploadFile } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  AlertTriangle,
  Receipt,
  Upload,
  ExternalLink,
  Clock,
  PhoneCall,
  Loader2,
  MessageSquare,
  FileText,
} from "lucide-react";

/** Bảng ánh xạ mã lý do hạn chế sang nhãn tiếng Việt */
const REASON_LABELS: Record<string, string> = {
  UNPAID_INVOICE: "Chưa thanh toán hóa đơn",
  OUTSTANDING_DEBT: "Còn công nợ vận chuyển",
  SERVICE_VIOLATION: "Vi phạm điều kiện dịch vụ",
  INACCURATE_INFO: "Cung cấp thông tin không chính xác",
  TRANSPORT_VIOLATION: "Vi phạm quy định vận chuyển",
  IMPACT_OPERATION: "Có hành vi gây ảnh hưởng dịch vụ",
  OTHER: "Lý do khác",
};

interface BlacklistAppealItem {
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

interface BlacklistItem {
  blacklistId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
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
  reactivatedAt?: string | null;
}

interface CustomerStatusData {
  restricted: boolean;
  currentBlacklist?: BlacklistItem | null;
  appeals: BlacklistAppealItem[];
  pendingAppealsCount: number;
}

export function CustomerRestrictedView() {
  const { toast } = useToast();

  const [statusData, setStatusData] = useState<CustomerStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  // Trạng thái đóng/mở các hộp thoại chức năng
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Trạng thái biểu mẫu Gửi bằng chứng thanh toán ngoại tuyến
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Chuyển khoản ngân hàng");
  const [referenceCode, setReferenceCode] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Trạng thái biểu mẫu Gửi đơn kiến nghị / giải trình
  const [appealContent, setAppealContent] = useState("");
  const [appealDocUrl, setAppealDocUrl] = useState("");
  const [uploadingAppealDoc, setUploadingAppealDoc] = useState(false);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  /** Tải thông tin hạn chế và lịch sử kiến nghị của khách hàng hiện tại */
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CustomerStatusData>("/blacklist/my-status");
      setStatusData(data);
    } catch (err: unknown) {
      toast({
        title: "Không thể tải trạng thái tài khoản",
        description: err instanceof Error ? err.message : "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  /** Tải tệp ảnh biên lai chuyển khoản lên máy chủ */
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const url = await uploadFile(file);
      setReceiptUrl(url);
      toast({ title: "Tải chứng từ biên lai thành công" });
    } catch (err: unknown) {
      toast({
        title: "Tải tệp thất bại",
        description: err instanceof Error ? err.message : "Lỗi tệp.",
        variant: "destructive",
      });
    } finally {
      setUploadingReceipt(false);
    }
  };

  /** Tải tệp tài liệu đính kèm đơn kiến nghị lên máy chủ */
  const handleAppealDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAppealDoc(true);
    try {
      const url = await uploadFile(file);
      setAppealDocUrl(url);
      toast({ title: "Tải tài liệu đính kèm thành công" });
    } catch (err: unknown) {
      toast({
        title: "Tải tệp thất bại",
        description: err instanceof Error ? err.message : "Lỗi tệp.",
        variant: "destructive",
      });
    } finally {
      setUploadingAppealDoc(false);
    }
  };

  /** Gửi bằng chứng đã thanh toán ngoại tuyến tới Quản lý Logistics */
  const submitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusData?.currentBlacklist) return;
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast({ title: "Vui lòng nhập số tiền đã thanh toán hợp lệ", variant: "destructive" });
      return;
    }
    if (!receiptUrl.trim()) {
      toast({ title: "Vui lòng tải lên ảnh chụp biên lai giao dịch", variant: "destructive" });
      return;
    }

    setSubmittingPayment(true);
    try {
      await apiPost("/blacklist/my-payment-proof", {
        blacklistId: statusData.currentBlacklist.blacklistId,
        relatedInvoiceId: statusData.currentBlacklist.relatedInvoiceId,
        relatedRequestId: statusData.currentBlacklist.relatedRequestId,
        amountPaid: parseFloat(amountPaid),
        paymentDate,
        paymentMethod,
        referenceCode: referenceCode.trim() || null,
        documentUrl: receiptUrl.trim(),
        notes: paymentNotes.trim() || null,
      });

      toast({
        title: "Đã gửi bằng chứng thanh toán thành công",
        description: "Hồ sơ của bạn đã được chuyển tới Quản lý Logistics để đối chiếu và xác minh.",
      });

      setPaymentModalOpen(false);
      setAmountPaid("");
      setReferenceCode("");
      setReceiptUrl("");
      setPaymentNotes("");
      await loadStatus();
    } catch (err: unknown) {
      toast({
        title: "Không thể gửi bằng chứng",
        description: err instanceof Error ? err.message : "Đã xảy ra lỗi.",
        variant: "destructive",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  /** Gửi đơn kiến nghị / giải trình tới Quản lý Logistics */
  const submitAppealForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusData?.currentBlacklist) return;
    if (!appealContent.trim()) {
      toast({ title: "Vui lòng nhập nội dung giải trình hoặc kiến nghị", variant: "destructive" });
      return;
    }

    setSubmittingAppeal(true);
    try {
      await apiPost("/blacklist/my-appeal", {
        blacklistId: statusData.currentBlacklist.blacklistId,
        relatedInvoiceId: statusData.currentBlacklist.relatedInvoiceId,
        relatedRequestId: statusData.currentBlacklist.relatedRequestId,
        content: appealContent.trim(),
        documentUrl: appealDocUrl.trim() || null,
      });

      toast({
        title: "Đã gửi đơn kiến nghị thành công",
        description: "Đơn kiến nghị đã được ghi nhận và gửi đến Quản lý Logistics xem xét.",
      });

      setAppealModalOpen(false);
      setAppealContent("");
      setAppealDocUrl("");
      await loadStatus();
    } catch (err: unknown) {
      toast({
        title: "Không thể gửi kiến nghị",
        description: err instanceof Error ? err.message : "Đã xảy ra lỗi.",
        variant: "destructive",
      });
    } finally {
      setSubmittingAppeal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Đang tải thông tin trạng thái tài khoản...</p>
      </div>
    );
  }

  const current = statusData?.currentBlacklist;
  const isRestricted = statusData?.restricted ?? false;
  const reasonLabel = current ? (REASON_LABELS[current.reason] || current.reason) : "";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Thẻ thông tin hạn chế chính & 5 nút hành động giải quyết */}
      <Card className="border-[var(--danger-border)] bg-gradient-to-b from-[var(--danger-bg)] via-card to-card p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="rounded-2xl bg-[var(--danger-bg)] p-4 border border-[var(--danger-border)] shrink-0 text-[var(--danger-fg)]">
            <ShieldAlert className="h-10 w-10" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Tài khoản đang bị hạn chế
              </h2>
              {isRestricted ? (
                <Badge variant="outline" className="bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)] text-xs py-1">
                  Đang áp dụng hạn chế
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)] text-xs py-1">
                  Đang hoạt động bình thường
                </Badge>
              )}
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Tài khoản của bạn hiện đang bị hạn chế một số chức năng sử dụng EQUIDELI (không thể tạo đơn vận chuyển mới).
              Vui lòng kiểm tra lý do hạn chế bên dưới và thực hiện các bước cần thiết để gửi bằng chứng thanh toán hoặc gửi đơn kiến nghị đến Quản lý Logistics để được xem xét mở khóa.
            </p>

            {current && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-muted/30 p-4 rounded-xl border border-border text-xs pt-3 mt-2">
                <div>
                  <span className="text-[var(--text-secondary)] block text-[11px]">Lý do bị hạn chế:</span>
                  <span className="font-semibold text-[var(--danger-fg)] text-sm">{reasonLabel}</span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] block text-[11px]">Thời điểm ghi nhận:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {new Date(current.restrictedAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                {current.amountDue != null && (
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[11px]">Số tiền cần thanh toán:</span>
                    <span className="font-bold text-[var(--danger-fg)] text-base">
                      ${current.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    {current.dueDate && <span className="block text-[10px] text-[var(--text-secondary)]">Hạn: {current.dueDate}</span>}
                  </div>
                )}
                {current.relatedRequestId && (
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[11px]">Đơn vận chuyển liên quan:</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">#{current.relatedRequestId.slice(0, 8)}</span>
                  </div>
                )}
                {current.relatedInvoiceId && (
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[11px]">Hóa đơn liên quan:</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">#{current.relatedInvoiceId.slice(0, 8)}</span>
                  </div>
                )}
              </div>
            )}

            {/* 5 nút chức năng hướng dẫn từng bước cho khách hàng */}
            <div className="flex flex-wrap items-center gap-2.5 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViolationModalOpen(true)}
                className="h-9 text-xs gap-1.5"
              >
                <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
                1. Xem chi tiết vi phạm
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  if (current?.amountDue) setAmountPaid(current.amountDue.toString());
                  setPaymentModalOpen(true);
                }}
                className="h-9 text-xs gap-1.5 bg-[var(--success)] hover:bg-[var(--success)]/90 text-[#171311] font-semibold"
              >
                <Receipt className="h-4 w-4" />
                2. Gửi bằng chứng thanh toán
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAppealModalOpen(true)}
                className="h-9 text-xs gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                3. Gửi đơn kiến nghị
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const el = document.getElementById("appeals-history-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-9 text-xs gap-1.5"
              >
                <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
                4. Theo dõi kết quả xử lý
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSupportModalOpen(true)}
                className="h-9 text-xs gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <PhoneCall className="h-4 w-4" />
                5. Liên hệ hỗ trợ
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Hộp giải thích chính sách hạn chế và quy trình đối soát ngoại tuyến */}
      <Card className="border-border bg-card p-4">
        <div className="flex items-start gap-3 text-xs text-[var(--text-secondary)]">
          <AlertTriangle className="h-5 w-5 text-[var(--warning-fg)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--text-primary)] text-sm">Chính sách hạn chế & Quy trình giải quyết:</p>
            <p>• Các đơn hàng và chuyến vận chuyển hiện tại của bạn vẫn được vận hành và cập nhật lịch trình bình thường.</p>
            <p>• Do việc thanh toán diễn ra ngoại tuyến, hệ thống không tự động mở khóa khi bạn tải ảnh lên. Quản lý Logistics sẽ đối chiếu thông tin ngân hàng và phê duyệt mở khóa trong thời gian sớm nhất.</p>
            <p>• Bạn vẫn có thể xem lại toàn bộ hồ sơ ngựa, lịch sử chuyến đi và hóa đơn bất kỳ lúc nào.</p>
          </div>
        </div>
      </Card>

      {/* 3. Dòng thời gian lịch sử gửi chứng từ & kiến nghị */}
      <div id="appeals-history-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Lịch sử gửi chứng từ & kiến nghị ({statusData?.appeals?.length || 0})
          </h3>
          <Button variant="outline" size="sm" onClick={() => void loadStatus()} className="h-8 text-xs gap-1">
            Làm mới tiến độ
          </Button>
        </div>

        {(!statusData?.appeals || statusData.appeals.length === 0) ? (
          <Card className="border-border bg-card/60 p-8 text-center text-[var(--text-secondary)] text-xs">
            <p>Bạn chưa gửi chứng từ thanh toán hoặc đơn kiến nghị nào.</p>
            <p className="text-[11px] mt-1">Sử dụng các nút ở trên để gửi hồ sơ giải quyết tới ban quản lý.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {statusData.appeals.map((a) => (
              <Card key={a.appealId} className="border-border bg-card p-4 text-xs space-y-3">
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
                      Gửi lúc: {new Date(a.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div>
                    {a.status === "PENDING" && (
                      <Badge variant="outline" className="bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning-border)] font-medium">Đang chờ Quản lý xem xét</Badge>
                    )}
                    {a.status === "PAYMENT_VERIFIED" && (
                      <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)]">Đã xác minh thanh toán</Badge>
                    )}
                    {a.status === "PAYMENT_UNVERIFIED" && (
                      <Badge variant="outline" className="bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)]">Chưa xác minh được</Badge>
                    )}
                    {a.status === "APPROVED" && (
                      <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)]">Kiến nghị đã được chấp thuận</Badge>
                    )}
                    {a.status === "REJECTED" && (
                      <Badge variant="outline" className="bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)]">Kiến nghị bị từ chối</Badge>
                    )}
                    {a.status === "MORE_INFO_REQUESTED" && (
                      <Badge variant="outline" className="bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-border)]">Cần bổ sung thông tin</Badge>
                    )}
                  </div>
                </div>

                {a.appealType === "PAYMENT_PROOF" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/20 p-2.5 rounded text-[11px]">
                    <p><span className="text-[var(--text-secondary)]">Số tiền:</span> <strong className="text-[var(--text-primary)]">${a.amountPaid?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p>
                    <p><span className="text-[var(--text-secondary)]">Ngày chuyển:</span> {a.paymentDate}</p>
                    <p><span className="text-[var(--text-secondary)]">Phương thức:</span> {a.paymentMethod || "—"}</p>
                    <p><span className="text-[var(--text-secondary)]">Mã tham chiếu:</span> <span className="font-mono text-[var(--text-primary)]">{a.referenceCode || "—"}</span></p>
                  </div>
                )}

                {a.content && (
                  <div className="text-[11px]">
                    <span className="text-[var(--text-secondary)] font-semibold uppercase text-[10px] block">Nội dung đã gửi:</span>
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
                      Xem chứng từ đã gửi
                    </a>
                  </div>
                )}

                {a.reviewNotes && (
                  <div className="p-3 rounded-lg border border-border/80 bg-muted/30 text-xs space-y-1">
                    <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      Phản hồi từ Quản lý Logistics ({a.reviewerName || "Quản lý"}):
                    </p>
                    <p className="text-[var(--text-secondary)]">{a.reviewNotes}</p>
                    {a.reviewedAt && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        Thời gian: {new Date(a.reviewedAt).toLocaleString("vi-VN")}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* HỘP THOẠI 1: Xem chi tiết vi phạm */}
      {current && (
        <Dialog open={violationModalOpen} onOpenChange={setViolationModalOpen}>
          <DialogContent className="sm:max-w-[500px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--danger-fg)]" />
                Chi tiết lý do hạn chế
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs pt-2">
              <div className="p-3 bg-muted/20 rounded-lg space-y-1.5 border border-border">
                <p><span className="text-[var(--text-secondary)]">Lý do:</span> <strong className="text-[var(--danger-fg)]">{reasonLabel}</strong></p>
                <p><span className="text-[var(--text-secondary)]">Thời gian ghi nhận:</span> {new Date(current.restrictedAt).toLocaleString("vi-VN")}</p>
                {current.amountDue && <p><span className="text-[var(--text-secondary)]">Số tiền yêu cầu:</span> <strong className="text-[var(--text-primary)]">${current.amountDue}</strong></p>}
                {current.dueDate && <p><span className="text-[var(--text-secondary)]">Hạn chót:</span> {current.dueDate}</p>}
              </div>

              {current.description && (
                <div>
                  <span className="text-[var(--text-secondary)] font-semibold text-[11px] block">Mô tả từ Quản lý:</span>
                  <p className="text-[var(--text-primary)] mt-1 p-2 bg-muted/10 rounded border border-border">{current.description}</p>
                </div>
              )}

              {current.evidenceUrl && (
                <div>
                  <a
                    href={current.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Xem tài liệu / bằng chứng đính kèm từ quản lý
                  </a>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => setViolationModalOpen(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* HỘP THOẠI 2: Gửi bằng chứng thanh toán ngoại tuyến */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[var(--success-fg)]" />
              Gửi bằng chứng đã thanh toán
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-secondary)]">
              Tải lên hình ảnh biên lai ngân hàng hoặc chứng từ chuyển khoản để Quản lý Logistics đối chiếu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitPaymentProof} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-[var(--text-primary)]">
                  Số tiền đã thanh toán (USD) <span className="text-[var(--danger-fg)]">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Ví dụ: 1250"
                  required
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Ngày thanh toán</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Phương thức chuyển khoản</Label>
                <Input
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="Chuyển khoản ngân hàng..."
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-[var(--text-primary)]">Mã giao dịch / Mã tham chiếu</Label>
                <Input
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="Ví dụ: FT260012345"
                  className="h-8 text-xs bg-background font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-[var(--text-primary)]">
                Ảnh chụp biên lai / Chứng từ giao dịch <span className="text-[var(--danger-fg)]">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="Đường dẫn hoặc tải tệp..."
                  required
                  className="h-8 text-xs bg-background flex-1"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80">
                    {uploadingReceipt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Tải ảnh
                  </span>
                  <input type="file" onChange={handleReceiptUpload} className="hidden" accept="image/*,.pdf" />
                </label>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Hỗ trợ JPG, PNG, PDF tối đa 10MB.</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-[var(--text-primary)]">Ghi chú thêm</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ghi chú nội dung chuyển tiền, tên chủ tài khoản người gửi..."
                className="text-xs bg-background min-h-[60px]"
              />
            </div>

            <DialogFooter className="mt-4 border-t border-border/60 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>Hủy</Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingPayment}
                className="bg-[var(--success)] hover:bg-[var(--success)]/90 text-[#171311] font-semibold"
              >
                {submittingPayment && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Gửi bằng chứng
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* HỘP THOẠI 3: Gửi đơn kiến nghị / giải trình */}
      <Dialog open={appealModalOpen} onOpenChange={setAppealModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Gửi đơn kiến nghị / giải trình
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-secondary)]">
              Giải thích lý do bạn cho rằng quyết định hạn chế tài khoản chưa chính xác hoặc cung cấp thêm thông tin chứng minh.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitAppealForm} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-[var(--text-primary)]">
                Nội dung kiến nghị <span className="text-[var(--danger-fg)]">*</span>
              </Label>
              <Textarea
                value={appealContent}
                onChange={(e) => setAppealContent(e.target.value)}
                placeholder="Trình bày chi tiết lý do, căn cứ kiến nghị..."
                required
                className="text-xs bg-background min-h-[100px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-[var(--text-primary)]">Tài liệu chứng minh (nếu có)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={appealDocUrl}
                  onChange={(e) => setAppealDocUrl(e.target.value)}
                  placeholder="Đường dẫn hoặc tải tệp..."
                  className="h-8 text-xs bg-background flex-1"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80">
                    {uploadingAppealDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Tải tệp
                  </span>
                  <input type="file" onChange={handleAppealDocUpload} className="hidden" accept="image/*,.pdf" />
                </label>
              </div>
            </div>

            <DialogFooter className="mt-4 border-t border-border/60 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setAppealModalOpen(false)}>Hủy</Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingAppeal}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {submittingAppeal && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Gửi kiến nghị
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* HỘP THOẠI 5: Thông tin liên hệ bộ phận hỗ trợ */}
      <Dialog open={supportModalOpen} onOpenChange={setSupportModalOpen}>
        <DialogContent className="sm:max-w-[420px] border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              Liên hệ bộ phận hỗ trợ EQUIDELI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-[var(--text-secondary)] pt-2">
            <p className="text-[var(--text-primary)]">Nếu bạn cần giải quyết khẩn cấp hoặc có thắc mắc về công nợ và vi phạm, vui lòng liên hệ:</p>
            <div className="p-3 bg-muted/20 rounded-lg space-y-2 border border-border">
              <p><strong className="text-[var(--text-primary)]">Tổng đài hỗ trợ 24/7:</strong> (+84) 1900 8888</p>
              <p><strong className="text-[var(--text-primary)]">Email giải quyết khiếu nại:</strong> support@equideli.com</p>
              <p><strong className="text-[var(--text-primary)]">Bộ phận phụ trách:</strong> Ban Quản lý Logistics & Điều hành vận chuyển</p>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setSupportModalOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
