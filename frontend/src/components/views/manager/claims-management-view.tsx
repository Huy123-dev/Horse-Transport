"use client";

import { useEffect, useState, useMemo } from "react";
import { apiGet, apiPatch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Scale,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  CompensationClaim,
  CLAIM_CATEGORIES,
  formatClaimStatus,
  formatClaimCategory,
  formatSeverity,
} from "@/components/views/shared/compensation-claims-panel";
import { formatDateTime, formatMoney, requestCode } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";

export function ClaimsManagementView() {
  const { navigate } = useAppStore();
  const { toast } = useToast();
  const [claims, setClaims] = useState<CompensationClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Review modal state
  const [selectedClaim, setSelectedClaim] = useState<CompensationClaim | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>("APPROVED");
  const [approvedAmount, setApprovedAmount] = useState<string>("");
  const [decisionNote, setDecisionNote] = useState<string>("");
  const [reviewing, setReviewing] = useState(false);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await apiGet<CompensationClaim[]>("/compensation-claims");
      setClaims(data);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách khiếu nại bồi thường.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadClaims);
  }, []);

  const openReviewModal = (claim: CompensationClaim) => {
    setSelectedClaim(claim);
    setReviewStatus("APPROVED");
    setApprovedAmount(claim.requestedAmount ? String(claim.requestedAmount) : "");
    setDecisionNote(claim.decisionNote || "");
  };

  const handleReviewSubmit = async () => {
    if (!selectedClaim) return;

    if (
      (reviewStatus === "REJECTED" ||
        reviewStatus === "PARTIALLY_APPROVED" ||
        reviewStatus === "NEED_INFO") &&
      !decisionNote.trim()
    ) {
      toast({
        title: "Yêu cầu ghi chú giải trình",
        description: "Vui lòng nhập lý do giải quyết hoặc hướng dẫn bổ sung thông tin.",
        variant: "destructive",
      });
      return;
    }

    let apprAmt: number | null = null;
    if (reviewStatus === "APPROVED") {
      apprAmt = approvedAmount ? Number(approvedAmount) : (selectedClaim.requestedAmount ?? 0);
    } else if (reviewStatus === "PARTIALLY_APPROVED") {
      if (!approvedAmount || isNaN(Number(approvedAmount)) || Number(approvedAmount) <= 0) {
        toast({
          title: "Số tiền không hợp lệ",
          description: "Vui lòng nhập số tiền bồi thường được duyệt một phần.",
          variant: "destructive",
        });
        return;
      }
      apprAmt = Number(approvedAmount);
      if (selectedClaim.requestedAmount && apprAmt > selectedClaim.requestedAmount) {
        toast({
          title: "Số tiền vượt mức",
          description: "Số tiền duyệt một phần không thể lớn hơn mức khách hàng yêu cầu.",
          variant: "destructive",
        });
        return;
      }
    } else if (reviewStatus === "REJECTED") {
      apprAmt = 0;
    }

    setReviewing(true);
    try {
      await apiPatch(`/compensation-claims/${selectedClaim.claimId}/review`, {
        status: reviewStatus,
        decisionNote: decisionNote.trim() || null,
        approvedAmount: apprAmt,
      });

      toast({
        title: "Đã xử lý vụ việc",
        description: `Yêu cầu bồi thường đã chuyển sang trạng thái: ${formatClaimStatus(reviewStatus)}`,
      });
      setSelectedClaim(null);
      void loadClaims();
    } catch (err: unknown) {
      toast({
        title: "Không thể cập nhật vụ việc",
        description: err instanceof Error ? err.message : "Đã có lỗi xảy ra.",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  };

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const matchSearch =
        !search ||
        claim.claimId.toLowerCase().includes(search.toLowerCase()) ||
        claim.requestId.toLowerCase().includes(search.toLowerCase()) ||
        (claim.requestCode?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (claim.customerName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        claim.description.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "ALL" || claim.status === statusFilter;
      const matchCategory = categoryFilter === "ALL" || claim.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [claims, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) =>
      ["SUBMITTED", "UNDER_REVIEW", "NEED_INFO"].includes(c.status)
    ).length;
    const approved = claims.filter((c) =>
      ["APPROVED", "PARTIALLY_APPROVED", "RESOLVED"].includes(c.status)
    ).length;
    const rejected = claims.filter((c) => c.status === "REJECTED").length;

    const totalRequested = claims.reduce((acc, c) => acc + (Number(c.requestedAmount) || 0), 0);
    const totalApproved = claims.reduce((acc, c) => acc + (Number(c.approvedAmount) || 0), 0);

    return { total, pending, approved, rejected, totalRequested, totalApproved };
  }, [claims]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý bồi thường & Khiếu nại"
        description="Giải quyết các vụ việc khiếu nại, sự cố vận chuyển và xem xét bồi thường thỏa đáng"
        icon={<Scale className="h-5 w-5" />}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm kiếm vụ việc"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn, khách hàng..."
              className="pl-9"
            />
          </div>
        }
      />

      {/* Thẻ thống kê tổng quan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng số vụ việc</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning-fg)]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cần thẩm định</p>
              <p className="text-lg font-bold text-[var(--warning-fg)]">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-bg)] text-[var(--success-fg)]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã chấp thuận</p>
              <p className="text-lg font-bold text-[var(--success-fg)]">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã duyệt chi bồi thường</p>
              <p className="text-lg font-bold text-[var(--success-fg)]">
                {formatMoney(stats.totalApproved, "USD")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bộ lọc trạng thái & tình huống */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "SUBMITTED", label: "Chờ duyệt" },
            { key: "UNDER_REVIEW", label: "Đang thẩm định" },
            { key: "NEED_INFO", label: "Cần bổ sung" },
            { key: "APPROVED", label: "Đã duyệt" },
            { key: "PARTIALLY_APPROVED", label: "Duyệt một phần" },
            { key: "REJECTED", label: "Từ chối" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="category-select" className="text-xs text-muted-foreground whitespace-nowrap">
            Nhóm tình huống:
          </Label>
          <select
            id="category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
          >
            <option value="ALL">Tất cả nhóm</option>
            {CLAIM_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh sách các vụ việc */}
      {filteredClaims.length === 0 ? (
        <EmptyState
          illustration="no-data"
          title="Không tìm thấy yêu cầu bồi thường"
          description={
            search || statusFilter !== "ALL" || categoryFilter !== "ALL"
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              : "Hiện chưa có khiếu nại bồi thường nào phát sinh."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => (
            <Card key={claim.claimId} className="transition-all hover:border-primary/40 hover:shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={formatClaimStatus(claim.status)} />
                    <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {claim.categoryLabel || formatClaimCategory(claim.category)}
                    </span>
                    <button
                      onClick={() => navigate("request-detail", { id: claim.requestId })}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                    >
                      Đơn {claim.requestCode || requestCode(claim.requestId)}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Gửi lúc {formatDateTime(claim.submittedAt)}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-3 space-y-2">
                    <p className="whitespace-pre-wrap text-sm">{claim.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Khách hàng: <strong className="text-foreground">{claim.customerName || "—"}</strong></span>
                      <span>·</span>
                      <span>Mức độ: <strong className="text-foreground">{formatSeverity(claim.severity)}</strong></span>
                      {claim.evidenceUrl && (
                        <>
                          <span>·</span>
                          <a href={claim.evidenceUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            Tài liệu minh chứng đính kèm
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-right">Yêu cầu bồi thường</p>
                      <p className="text-base font-bold sm:text-right text-foreground">
                        {claim.requestedAmount != null ? formatMoney(claim.requestedAmount, claim.currency) : "—"}
                      </p>
                      {claim.approvedAmount != null && (
                        <p className="text-xs font-semibold sm:text-right text-[var(--success-fg)] mt-0.5">
                          Duyệt: {formatMoney(claim.approvedAmount, claim.currency)}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => openReviewModal(claim)}
                      className="gap-1.5 w-full sm:w-auto"
                    >
                      <Scale className="h-3.5 w-3.5" /> Giải quyết vụ việc
                    </Button>
                  </div>
                </div>

                {claim.decisionNote && (
                  <div className="rounded-lg bg-muted/60 p-3 text-xs">
                    <p className="font-semibold text-foreground">Giải trình của Ban Quản lý:</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{claim.decisionNote}</p>
                    {claim.reviewedByName && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Người giải quyết: {claim.reviewedByName} · {formatDateTime(claim.reviewedAt)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal xử lý & thẩm định vụ việc */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => { if (!open) setSelectedClaim(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Thẩm định & Giải quyết khiếu nại bồi thường
            </DialogTitle>
            <DialogDescription>
              Vụ việc gắn với Đơn {selectedClaim?.requestCode || (selectedClaim ? requestCode(selectedClaim.requestId) : "")} của khách hàng {selectedClaim?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/70 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tình huống:</span>
                  <span className="font-medium">{selectedClaim.categoryLabel || formatClaimCategory(selectedClaim.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền khách yêu cầu:</span>
                  <span className="font-bold text-foreground">
                    {selectedClaim.requestedAmount != null ? formatMoney(selectedClaim.requestedAmount, selectedClaim.currency) : "Không yêu cầu tiền"}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground border-t border-border pt-1.5 whitespace-pre-wrap">
                  {selectedClaim.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-status">Quyết định xử lý *</Label>
                <select
                  id="review-status"
                  value={reviewStatus}
                  onChange={(e) => {
                    const st = e.target.value;
                    setReviewStatus(st);
                    if (st === "APPROVED") {
                      setApprovedAmount(selectedClaim.requestedAmount ? String(selectedClaim.requestedAmount) : "");
                    } else if (st === "REJECTED") {
                      setApprovedAmount("0");
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="APPROVED">Chấp thuận toàn bộ yêu cầu</option>
                  <option value="PARTIALLY_APPROVED">Chấp thuận một phần (Duyệt theo thỏa thuận)</option>
                  <option value="NEED_INFO">Yêu cầu khách hàng bổ sung chứng từ / thông tin</option>
                  <option value="UNDER_REVIEW">Đang thẩm định cùng bên vận chuyển & bảo hiểm</option>
                  <option value="REJECTED">Từ chối yêu cầu bồi thường</option>
                  <option value="RESOLVED">Đã giải quyết xong (Đóng hồ sơ bồi thường)</option>
                </select>
              </div>

              {(reviewStatus === "APPROVED" || reviewStatus === "PARTIALLY_APPROVED") && (
                <div className="space-y-2">
                  <Label htmlFor="approved-amount">Số tiền duyệt bồi thường (USD) *</Label>
                  <Input
                    id="approved-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    placeholder="VD: 500.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Số tiền bồi thường thực tế sẽ được cập nhật và thông báo tới khách hàng.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="decision-note">
                  Ý kiến giải quyết & Giải trình{" "}
                  {reviewStatus === "REJECTED" ||
                  reviewStatus === "PARTIALLY_APPROVED" ||
                  reviewStatus === "NEED_INFO"
                    ? "(Bắt buộc *)"
                    : "(Tùy chọn)"}
                </Label>
                <Textarea
                  id="decision-note"
                  rows={3}
                  maxLength={2000}
                  placeholder="Ghi rõ lý do quyết định, các điều khoản bảo hiểm áp dụng hoặc chỉ dẫn cụ thể cho khách hàng..."
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedClaim(null)}
              disabled={reviewing}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void handleReviewSubmit()}
              disabled={reviewing}
              className="gap-2"
            >
              {reviewing && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận quyết định
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
