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
import { FileText, Loader2 } from "lucide-react";

interface CompensationClaim {
  claimId: string;
  requestId: string;
  description: string;
  requestedAmount: number | null;
  currency: string;
  evidenceUrl: string | null;
  status: string;
  decisionNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

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
  const [description, setDescription] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    apiGet<CompensationClaim[]>(`/transport-requests/${requestId}/compensation-claims`)
      .then((claims) => {
        if (active) setClaimsState({ requestId, claims, error: "" });
      })
      .catch((cause: unknown) => {
        if (active) setClaimsState({
          requestId,
          claims: [],
          error: cause instanceof Error ? cause.message : "Không thể tải yêu cầu bồi thường.",
        });
      });
    return () => { active = false; };
  }, [requestId, reloadKey]);

  const currentState = claimsState?.requestId === requestId ? claimsState : null;
  const claims = currentState?.claims ?? [];
  const loading = currentState === null;
  const error = currentState?.error ?? "";

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = requestedAmount.trim() ? Number(requestedAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      toast({ title: "Số tiền yêu cầu không hợp lệ", description: "Số tiền phải lớn hơn 0 USD hoặc để trống.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(`/transport-requests/${requestId}/compensation-claims`, {
        description: description.trim(),
        requestedAmount: amount,
        evidenceUrl: evidenceUrl.trim() || null,
      });
      setDescription("");
      setRequestedAmount("");
      setEvidenceUrl("");
      toast({ title: "Đã gửi yêu cầu bồi thường" });
      setReloadKey((key) => key + 1);
    } catch (cause) {
      toast({
        title: "Không thể gửi yêu cầu bồi thường",
        description: cause instanceof Error ? cause.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (claim: CompensationClaim, status: "APPROVED" | "REJECTED") => {
    const decisionNote = decisionNotes[claim.claimId]?.trim() ?? "";
    if (status === "REJECTED" && !decisionNote) {
      toast({ title: "Cần ghi lý do từ chối", variant: "destructive" });
      return;
    }
    setReviewingId(claim.claimId);
    try {
      await apiPatch(`/compensation-claims/${claim.claimId}/review`, { status, decisionNote: decisionNote || null });
      toast({ title: status === "APPROVED" ? "Đã chấp thuận yêu cầu" : "Đã từ chối yêu cầu" });
      setReloadKey((key) => key + 1);
    } catch (cause) {
      toast({
        title: "Không thể xử lý yêu cầu bồi thường",
        description: cause instanceof Error ? cause.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setReviewingId(null);
    }
  };

  const hasSubmittedClaim = claims.some((claim) => claim.status === "SUBMITTED");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Yêu cầu bồi thường</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Đang tải yêu cầu bồi thường…</p>
          : error ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</Button></div>
            : claims.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có yêu cầu bồi thường.</p>
              : claims.map((claim) => (
                <div key={claim.claimId} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={claimStatusLabel(claim.status)} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(claim.submittedAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{claim.description}</p>
                  {claim.requestedAmount != null && <p className="text-sm font-semibold">{formatMoney(claim.requestedAmount, claim.currency)}</p>}
                  {claim.evidenceUrl && <a href={claim.evidenceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Mở chứng cứ đính kèm</a>}
                  {claim.reviewedAt && <p className="text-xs text-muted-foreground">Xử lý {formatDateTime(claim.reviewedAt)}{claim.reviewedByName ? ` · ${claim.reviewedByName}` : ""}</p>}
                  {claim.decisionNote && <p className="rounded-md bg-muted p-3 text-sm">{claim.decisionNote}</p>}
                  {isManager && claim.status === "SUBMITTED" && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <Label htmlFor={`claim-note-${claim.claimId}`}>Ghi chú xử lý (bắt buộc nếu từ chối)</Label>
                      <Textarea id={`claim-note-${claim.claimId}`} maxLength={2000} value={decisionNotes[claim.claimId] ?? ""} onChange={(event) => setDecisionNotes((current) => ({ ...current, [claim.claimId]: event.target.value }))} />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="destructive" onClick={() => void review(claim, "REJECTED")} disabled={reviewingId === claim.claimId}>
                          {reviewingId === claim.claimId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Từ chối"}
                        </Button>
                        <Button onClick={() => void review(claim, "APPROVED")} disabled={reviewingId === claim.claimId}>
                          {reviewingId === claim.claimId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Chấp thuận"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

        {!isManager && canSubmit && !loading && !error && !hasSubmittedClaim && (
          <form onSubmit={(event) => void submit(event)} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Gửi yêu cầu sau khi chuyến đã hoàn thành và có biên bản bàn giao. Mọi số tiền yêu cầu được nhập bằng USD.</p>
            <div className="space-y-2">
              <Label htmlFor="claim-description">Mô tả sự việc *</Label>
              <Textarea id="claim-description" required maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claim-amount">Số tiền yêu cầu (USD, tùy chọn)</Label>
                <Input id="claim-amount" type="number" min="0.01" step="0.01" value={requestedAmount} onChange={(event) => setRequestedAmount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-evidence">Đường dẫn chứng cứ (tùy chọn)</Label>
                <Input id="claim-evidence" type="url" maxLength={512} value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Gửi yêu cầu
              </Button>
            </div>
          </form>
        )}
        {!isManager && !canSubmit && (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            Có thể gửi yêu cầu bồi thường sau khi chuyến hoàn thành và biên bản bàn giao được ghi nhận.
          </p>
        )}
        {!isManager && canSubmit && hasSubmittedClaim && (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            Yêu cầu bồi thường đang chờ xử lý. Bạn có thể gửi yêu cầu mới sau khi yêu cầu hiện tại được giải quyết.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function claimStatusLabel(status: string): string {
  switch (status) {
    case "SUBMITTED": return "Đang chờ xử lý";
    case "APPROVED": return "Đã chấp thuận";
    case "REJECTED": return "Đã từ chối";
    default: return status;
  }
}
