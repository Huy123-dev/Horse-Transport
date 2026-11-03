import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, formatMoney } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/app/status-badge";
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Scale,
} from "lucide-react";

export interface CompensationClaim {
  claimId: string;
  requestId: string;
  requestCode?: string;
  customerId?: string;
  customerName?: string;
  category?: string | null;
  categoryLabel?: string | null;
  severity?: string | null;
  description: string;
  requestedAmount: number | null;
  approvedAmount?: number | null;
  currency: string;
  evidenceUrl: string | null;
  status: string;
  statusLabel?: string | null;
  decisionNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

export const CLAIM_CATEGORIES = [
  { value: "HORSE_HEALTH", label: "Sức khỏe / Chấn thương của ngựa" },
  { value: "TRANSPORT_DELAY", label: "Chậm trễ hành trình nghiêm trọng" },
  { value: "ASSET_DAMAGE", label: "Hư hại trang thiết bị / Tài sản đi kèm" },
  { value: "INVOICE_DISCREPANCY", label: "Sai lệch chi phí / Hóa đơn thanh toán" },
  { value: "SERVICE_MISMATCH", label: "Dịch vụ không đúng cam kết ban đầu" },
  { value: "OTHER", label: "Lý do khác (yêu cầu nhập mô tả cụ thể)" },
] as const;

export const CLAIM_SEVERITIES = [
  { value: "LOW", label: "Thấp - Ảnh hưởng nhỏ, không gián đoạn kế hoạch" },
  { value: "MEDIUM", label: "Trung bình - Ảnh hưởng lịch trình hoặc thể trạng nhẹ" },
  { value: "HIGH", label: "Cao - Thiệt hại đáng kể về sức khỏe hoặc chi phí" },
  { value: "CRITICAL", label: "Nghiêm trọng - Chấn thương nặng hoặc tổn thất lớn" },
] as const;

interface CompensationClaimsPanelProps {
  requestId: string;
  isManager: boolean;
  canSubmit: boolean;
}

export function CompensationClaimsPanel({ requestId, isManager, canSubmit }: CompensationClaimsPanelProps) {
  const { toast } = useToast();
  const [claimsState, setClaimsState] = useState<{
    requestId: string;
    claims: CompensationClaim[];
    error: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Form submission state
  const [category, setCategory] = useState<string>("HORSE_HEALTH");
  const [severity, setSeverity] = useState<string>("MEDIUM");
  const [description, setDescription] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Manager review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [approvedAmounts, setApprovedAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    apiGet<CompensationClaim[]>(`/transport-requests/${requestId}/compensation-claims`)
      .then((claims) => {
        if (active) setClaimsState({ requestId, claims, error: "" });
      })
      .catch((cause: unknown) => {
        if (active) {
          setClaimsState({
            requestId,
            claims: [],
            error: cause instanceof Error ? cause.message : "Không thể tải yêu cầu bồi thường.",
          });
        }
      });
    return () => { active = false; };
  }, [requestId, reloadKey]);

  const currentState = claimsState?.requestId === requestId ? claimsState : null;
  const claims = currentState?.claims ?? [];
  const loading = currentState === null;
  const error = currentState?.error ?? "";

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (category === "OTHER" && !description.trim()) {
      toast({
        title: "Thiếu mô tả",
        description: "Khi chọn lý do 'Khác', bạn vui lòng nhập chi tiết sự việc xảy ra.",
        variant: "destructive",
      });
      return;
    }

    const amount = requestedAmount.trim() ? Number(requestedAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      toast({
        title: "Số tiền yêu cầu không hợp lệ",
        description: "Số tiền yêu cầu phải lớn hơn 0 USD.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(`/transport-requests/${requestId}/compensation-claims`, {
        category,
        severity,
        description: description.trim(),
        requestedAmount: amount,
        currency: "USD",
        evidenceUrl: evidenceUrl.trim() || null,
      });

      setDescription("");
      setRequestedAmount("");
      setEvidenceUrl("");
      setCategory("HORSE_HEALTH");
      setSeverity("MEDIUM");
      toast({ title: "Đã gửi yêu cầu bồi thường", description: "Hồ sơ của bạn đã được chuyển đến bộ phận quản lý xem xét." });
      setReloadKey((key) => key + 1);
    } catch (cause) {
      toast({
        title: "Không thể gửi yêu cầu bồi thường",
        description: cause instanceof Error ? cause.message : "Vui lòng kiểm tra lại thông tin.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (
    claim: CompensationClaim,
    status: "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | "NEED_INFO"
  ) => {
    const decisionNote = decisionNotes[claim.claimId]?.trim() ?? "";
    const approvedAmtStr = approvedAmounts[claim.claimId]?.trim() ?? "";

    if ((status === "REJECTED" || status === "PARTIALLY_APPROVED" || status === "NEED_INFO") && !decisionNote) {
      toast({
        title: "Yêu cầu ghi chú xử lý",
        description: "Vui lòng nhập lý do giải trình hoặc hướng dẫn bổ sung hồ sơ.",
        variant: "destructive",
      });
      return;
    }

    let approvedAmount: number | null = null;
    if (status === "APPROVED") {
      approvedAmount = approvedAmtStr ? Number(approvedAmtStr) : (claim.requestedAmount ?? 0);
    } else if (status === "PARTIALLY_APPROVED") {
      if (!approvedAmtStr || isNaN(Number(approvedAmtStr)) || Number(approvedAmtStr) <= 0) {
        toast({
          title: "Thiếu số tiền duyệt",
          description: "Vui lòng nhập số tiền bồi thường được duyệt một phần.",
          variant: "destructive",
        });
        return;
      }
      approvedAmount = Number(approvedAmtStr);
      if (claim.requestedAmount && approvedAmount > claim.requestedAmount) {
        toast({
          title: "Số tiền không hợp lệ",
          description: "Số tiền duyệt một phần không thể vượt quá mức khách hàng yêu cầu.",
          variant: "destructive",
        });
        return;
      }
    }

    setReviewingId(claim.claimId);
    try {
      await apiPatch(`/compensation-claims/${claim.claimId}/review`, {
        status,
        decisionNote: decisionNote || null,
        approvedAmount,
      });

      toast({
        title: "Đã cập nhật xử lý",
        description: `Yêu cầu bồi thường đã được chuyển sang trạng thái: ${formatClaimStatus(status)}`,
      });
      setReloadKey((key) => key + 1);
    } catch (cause) {
      toast({
        title: "Không thể xử lý yêu cầu",
        description: cause instanceof Error ? cause.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setReviewingId(null);
    }
  };

  const hasPendingClaim = claims.some((c) =>
    ["SUBMITTED", "UNDER_REVIEW", "NEED_INFO"].includes(c.status)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4" /> Yêu cầu bồi thường & Khiếu nại
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải danh sách khiếu nại…</p>
        ) : error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</Button>
          </div>
        ) : claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có yêu cầu bồi thường nào cho chuyến vận chuyển này.</p>
        ) : (
          claims.map((claim) => (
            <div key={claim.claimId} className="space-y-3 rounded-xl border border-border p-4 bg-card/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={formatClaimStatus(claim.status)} />
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {claim.categoryLabel || formatClaimCategory(claim.category)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(claim.submittedAt)}</span>
              </div>

              <div className="space-y-1">
                <p className="whitespace-pre-wrap text-sm text-foreground">{claim.description}</p>
                {claim.severity && (
                  <p className="text-xs text-muted-foreground">
                    Mức độ ảnh hưởng: <span className="font-medium text-foreground">{formatSeverity(claim.severity)}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Số tiền yêu cầu: </span>
                  <span className="font-semibold text-foreground">
                    {claim.requestedAmount != null ? formatMoney(claim.requestedAmount, claim.currency) : "Không yêu cầu tiền"}
                  </span>
                </div>
                {claim.approvedAmount != null && (
                  <div>
                    <span className="text-xs text-muted-foreground">Số tiền duyệt bồi thường: </span>
                    <span className="font-bold text-[var(--success-fg)]">
                      {formatMoney(claim.approvedAmount, claim.currency)}
                    </span>
                  </div>
                )}
              </div>

              {claim.evidenceUrl && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Tài liệu/Bằng chứng: </span>
                  <a href={claim.evidenceUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    Xem liên kết đính kèm
                  </a>
                </div>
              )}

              {claim.decisionNote && (
                <div className="rounded-lg bg-muted/70 p-3 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground">Giải trình / Ý kiến xử lý của Quản lý:</p>
                  <p className="mt-1 whitespace-pre-wrap">{claim.decisionNote}</p>
                  {claim.reviewedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Xử lý lúc {formatDateTime(claim.reviewedAt)}
                      {claim.reviewedByName ? ` · Người giải quyết: ${claim.reviewedByName}` : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Form xử lý của Manager */}
              {isManager && ["SUBMITTED", "UNDER_REVIEW", "NEED_INFO"].includes(claim.status) && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 mt-2">
                  <p className="text-xs font-semibold text-primary">Giải quyết yêu cầu bồi thường (Dành cho Quản lý)</p>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`appr-amt-${claim.claimId}`} className="text-xs">Số tiền duyệt bồi thường (USD)</Label>
                      <Input
                        id={`appr-amt-${claim.claimId}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={claim.requestedAmount ? String(claim.requestedAmount) : "0"}
                        value={approvedAmounts[claim.claimId] ?? ""}
                        onChange={(e) => setApprovedAmounts({ ...approvedAmounts, [claim.claimId]: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor={`claim-note-${claim.claimId}`} className="text-xs">
                        Ghi chú giải quyết (Bắt buộc khi từ chối, duyệt một phần, hoặc yêu cầu bổ sung)
                      </Label>
                      <Textarea
                        id={`claim-note-${claim.claimId}`}
                        maxLength={2000}
                        rows={2}
                        placeholder="Nhập lý do chấp thuận / từ chối hoặc các giấy tờ khách hàng cần bổ sung..."
                        value={decisionNotes[claim.claimId] ?? ""}
                        onChange={(e) => setDecisionNotes({ ...decisionNotes, [claim.claimId]: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleReview(claim, "NEED_INFO")}
                      disabled={reviewingId === claim.claimId}
                      className="gap-1.5 text-warning"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Yêu cầu bổ sung
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleReview(claim, "PARTIALLY_APPROVED")}
                      disabled={reviewingId === claim.claimId}
                      className="gap-1.5"
                    >
                      Duyệt một phần
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleReview(claim, "REJECTED")}
                      disabled={reviewingId === claim.claimId}
                      className="gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Từ chối
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleReview(claim, "APPROVED")}
                      disabled={reviewingId === claim.claimId}
                      className="gap-1.5"
                    >
                      {reviewingId === claim.claimId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Chấp thuận toàn bộ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Khách hàng gửi yêu cầu bồi thường mới */}
        {!isManager && canSubmit && !loading && !error && !hasPendingClaim && (
          <form onSubmit={(event) => void submit(event)} className="space-y-4 border-t border-border pt-4">
            <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground border border-primary/20">
              <p className="font-semibold text-foreground mb-1">Chính sách bảo đảm & Bồi thường Equideli:</p>
              Quý khách có thể gửi yêu cầu bồi thường khi phát hiện sự cố sau khi hoàn tất hành trình bàn giao. Ban Quản lý sẽ thẩm định và phản hồi trong thời gian sớm nhất.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claim-category">Nhóm tình huống khiếu nại *</Label>
                <select
                  id="claim-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CLAIM_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="claim-severity">Mức độ ảnh hưởng</Label>
                <select
                  id="claim-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CLAIM_SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-description">
                Mô tả chi tiết sự việc {category === "OTHER" ? "*" : "(tùy chọn)"}
              </Label>
              <Textarea
                id="claim-description"
                rows={3}
                required={category === "OTHER"}
                maxLength={4000}
                placeholder={category === "OTHER" ? "Vui lòng ghi rõ chi tiết sự việc..." : "Nếu để trống, hệ thống sẽ tự động tạo nội dung giải trình theo tình huống đã chọn."}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claim-amount">Số tiền yêu cầu bồi thường (USD, tùy chọn)</Label>
                <Input
                  id="claim-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="VD: 500.00"
                  value={requestedAmount}
                  onChange={(event) => setRequestedAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-evidence">Đường dẫn tài liệu / Ảnh minh chứng (tùy chọn)</Label>
                <Input
                  id="claim-evidence"
                  type="url"
                  maxLength={512}
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Gửi yêu cầu bồi thường
              </Button>
            </div>
          </form>
        )}

        {!isManager && !canSubmit && (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Chức năng gửi yêu cầu bồi thường sẽ khả dụng sau khi chuyến vận chuyển được đánh dấu hoàn thành và có biên bản bàn giao.
          </p>
        )}

        {!isManager && canSubmit && hasPendingClaim && (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Hiện tại bạn đã có yêu cầu bồi thường đang trong quy trình thẩm định. Bạn có thể gửi yêu cầu mới sau khi vụ việc được giải quyết.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function formatClaimStatus(status?: string | null): string {
  if (!status) return "Chờ xử lý";
  switch (status.toUpperCase()) {
    case "SUBMITTED": return "Đã gửi (Chờ duyệt)";
    case "UNDER_REVIEW": return "Đang thẩm định";
    case "NEED_INFO": return "Cần bổ sung thông tin";
    case "APPROVED": return "Đã chấp thuận";
    case "PARTIALLY_APPROVED": return "Chấp thuận một phần";
    case "REJECTED": return "Đã từ chối";
    case "RESOLVED": return "Đã giải quyết";
    case "CLOSED": return "Đã đóng";
    default: return status;
  }
}

export function formatClaimCategory(category?: string | null): string {
  if (!category) return "Chung";
  const found = CLAIM_CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
}

export function formatSeverity(severity?: string | null): string {
  if (!severity) return "Trung bình";
  const found = CLAIM_SEVERITIES.find((s) => s.value === severity);
  return found ? found.label : severity;
}
