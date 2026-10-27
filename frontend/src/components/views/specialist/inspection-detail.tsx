"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { HorseImage } from "@/components/app/horse-image";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, FileText, Heart, ShieldCheck } from "lucide-react";
import { formatDateTime, inspectionCode, inspectionStatusLabel, requestCode } from "@/lib/constants";

interface InspectionRecord {
  inspectionId: string;
  requestId: string;
  horseId: string;
  horseName: string;
  horseImageUrl: string | null;
  agencyName: string;
  status: string;
  remarks: string | null;
  assignedSpecialistId: string | null;
  specialistName: string | null;
  updatedAt: string;
}

interface HorseDocument {
  documentId: string;
  requestId: string | null;
  documentType: string;
  fileName: string | null;
  expiryDate: string | null;
  expired: boolean;
  uploadedAt: string;
}

type ReviewStatus = "PROCESSING" | "NEEDS_INFO" | "APPROVED" | "REJECTED";

function canonicalStatus(status: string): string {
  switch (status.trim().toLowerCase()) {
    case "cho xu ly":
    case "pending":
      return "PENDING";
    case "dang xu ly":
    case "processing":
      return "PROCESSING";
    case "yeu cau bo sung ho so":
    case "needs_info":
    case "needs info":
      return "NEEDS_INFO";
    case "da phe duyet":
    case "approved":
      return "APPROVED";
    case "tu choi":
    case "rejected":
      return "REJECTED";
    default:
      return status.trim().toUpperCase();
  }
}

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  PROCESSING: "Đang xử lý",
  NEEDS_INFO: "Yêu cầu bổ sung",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Từ chối",
};

export function InspectionDetail() {
  const { params, navigate, user } = useAppStore();
  const { toast } = useToast();
  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [documents, setDocuments] = useState<HorseDocument[] | null>(null);
  const [documentsError, setDocumentsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("PROCESSING");
  const [remarks, setRemarks] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isSpecialist = user?.roleId === "TRANSPORT_SPECIALIST";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const record = await apiGet<InspectionRecord>(`/inspections/${params.id}`);
      setInspection(record);
      setRemarks(record.remarks || "");
      setReviewStatus("PROCESSING");
      try {
        const horseDocuments = await apiGet<HorseDocument[]>(`/horses/${record.horseId}/documents`);
        setDocuments(horseDocuments.filter((document) => document.requestId === record.requestId || document.requestId === null));
        setDocumentsError("");
      } catch (documentError: unknown) {
        setDocumentsError(documentError instanceof Error ? documentError.message : "Không thể tải danh sách tài liệu.");
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải bản ghi kiểm định.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const currentStatus = inspection ? canonicalStatus(inspection.status) : "";
  const availableStatuses = useMemo((): ReviewStatus[] => {
    switch (currentStatus) {
      case "PENDING":
        return ["PROCESSING", "NEEDS_INFO", "APPROVED", "REJECTED"];
      case "PROCESSING":
        return ["NEEDS_INFO", "APPROVED", "REJECTED"];
      case "NEEDS_INFO":
        return ["PROCESSING", "APPROVED", "REJECTED"];
      case "REJECTED":
        return ["PROCESSING"];
      default:
        return [];
    }
  }, [currentStatus]);

  const handleReview = async () => {
    if (!inspection) return;
    if (["NEEDS_INFO", "REJECTED"].includes(reviewStatus) && !remarks.trim()) {
      toast({ title: "Cần ghi rõ lý do", description: "Nhập lý do từ chối hoặc nội dung cần bổ sung.", variant: "destructive" });
      setConfirmOpen(false);
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/inspections/${inspection.inspectionId}/status`, {
        status: reviewStatus,
        remarks: remarks.trim() || null,
      });
      toast({ title: "Đã cập nhật trạng thái kiểm định." });
      setConfirmOpen(false);
      await load();
    } catch (saveError: unknown) {
      toast({
        title: "Không thể cập nhật trạng thái",
        description: saveError instanceof Error ? saveError.message : "Yêu cầu không thành công.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isSpecialist) {
    return <ErrorState message="Trang xử lý kiểm định chỉ dành cho vai trò Chuyên viên Thủ tục & Kiểm dịch." />;
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!inspection) return <ErrorState message="Không tìm thấy bản ghi kiểm định." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hồ sơ kiểm định ${inspectionCode(inspection.inspectionId)}`}
        description={`${inspection.horseName} · ${inspection.agencyName}`}
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={<div className="flex items-center gap-2"><StatusBadge status={inspectionStatusLabel(inspection.status)} /><Button variant="outline" size="sm" onClick={() => navigate("inspections")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Danh sách</Button></div>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Mã kiểm định</p><p className="mt-1 text-sm font-semibold">{inspectionCode(inspection.inspectionId)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Yêu cầu gốc</p><Button variant="link" className="h-auto p-0 text-sm" onClick={() => navigate("request-detail", { id: inspection.requestId })}>{requestCode(inspection.requestId)}</Button></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Chuyên viên</p><p className="mt-1 text-sm font-semibold">{inspection.specialistName || "Chưa phân công"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cập nhật</p><p className="mt-1 text-sm font-semibold">{formatDateTime(inspection.updatedAt)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Heart className="h-4 w-4" /> Hồ sơ ngựa và giấy tờ</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <HorseImage src={inspection.horseImageUrl} name={inspection.horseName} className="h-14 w-14 shrink-0 rounded-md" />
              <p className="text-sm">Ngựa: <span className="font-medium">{inspection.horseName}</span></p>
            </div>
            {documentsError && <p role="alert" className="text-sm text-destructive">{documentsError}</p>}
            {documents === null && !documentsError && <p className="text-sm text-muted-foreground">Đang tải tài liệu...</p>}
            {documents?.length === 0 && <EmptyState title="Chưa có tài liệu gắn với ngựa/yêu cầu" />}
            {documents?.map((document) => (
              <div key={document.documentId} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{document.fileName || document.documentType}</p>
                  <p className="text-xs text-muted-foreground">{document.documentType} · Tải lên {formatDateTime(document.uploadedAt)}</p>
                </div>
                <div className="text-right text-xs">
                  <p>{document.expiryDate ? `Hạn: ${formatDateTime(document.expiryDate)}` : "Không có hạn"}</p>
                  <StatusBadge status={document.expired ? "Hết hạn" : "Chưa xác minh"} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Thông tin này ghi nhận tiến độ kiểm tra hồ sơ, không phải kết luận pháp lý.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Kết quả và xử lý</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Ghi chú hiện tại</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{inspection.remarks || "Chưa có ghi chú."}</p>
            </div>
            {availableStatuses.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="inspection-status">Trạng thái tiếp theo</Label>
                  <select id="inspection-status" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {availableStatuses.map((status) => <option key={status} value={status}>{REVIEW_LABELS[status]}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspection-remarks">{reviewStatus === "NEEDS_INFO" || reviewStatus === "REJECTED" ? "Lý do / nội dung cần bổ sung *" : "Ghi chú"}</Label>
                  <Textarea id="inspection-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} />
                </div>
                <Button onClick={() => setConfirmOpen(true)} disabled={saving}>
                  Xác nhận {REVIEW_LABELS[reviewStatus].toLowerCase()}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Bản ghi đã ở trạng thái cuối; không thể chuyển tiếp từ giao diện.</p>
            )}
            <p className="text-xs text-muted-foreground">Thời điểm hiển thị là lần cập nhật gần nhất.</p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận cập nhật hồ sơ?</AlertDialogTitle>
            <AlertDialogDescription>Trạng thái hồ sơ sẽ chuyển sang “{REVIEW_LABELS[reviewStatus]}” và khách hàng sẽ nhận được thông báo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleReview(); }} disabled={saving}>
              {saving ? "Đang lưu..." : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
