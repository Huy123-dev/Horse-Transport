"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ApiError, apiDownloadFile, apiGet, apiPatch, apiPostFormData, apiPut } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { HorseImage } from "@/components/app/horse-image";
import { InvoiceDisplay } from "@/components/views/shared/invoice-display";
import { JourneyTimeline } from "@/components/views/shared/journey-timeline";
import { RouteHistoryMap } from "@/components/views/shared/route-history-map";
import { CompensationClaimsPanel } from "@/components/views/shared/compensation-claims-panel";
import { ServiceFeedbackPanel } from "@/components/views/customer/service-feedback-panel";
import { StatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, FileText, Heart, Trophy, CheckCircle2, XCircle,
  Upload, ScrollText, ShieldCheck, Clock, Download,
} from "lucide-react";
import { formatDate, formatDateTime, formatMoney, inspectionStatusLabel, planCode, requestCode, transportPlanStatusLabel, transportRequestStatusLabel } from "@/lib/constants";
import { pricingUnitLabel, type PricingCatalogItem, type PricingQuote } from "@/lib/pricing-types";

interface RequestHorse {
  horseId: string;
  name: string;
  microchipId: string;
  imageUrl?: string | null;
}

interface TransportRequest {
  requestId: string;
  customerId: string;
  customerName: string;
  origin: { locationId: string; name: string; countryCode: string | null };
  destination: { locationId: string; name: string; countryCode: string | null };
  scheduledDepartureDate: string | null;
  scheduledArrivalDate: string | null;
  specialRequirements: string | null;
  status: string;
  estimatedAmount: number | null;
  currency: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  specialistApprovedBy?: string | null;
  specialistApprovedByName?: string | null;
  specialistApprovedAt?: string | null;
  rejectionReason?: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  horses: RequestHorse[];
  createdAt: string;
  updatedAt: string;
}

interface TransportPlanSummary {
  planId: string;
  requestId: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
}

interface HorseDocument {
  documentId: string;
  horseId: string;
  horseName: string;
  requestId: string | null;
  documentType: string;
  fileName: string | null;
  expiryDate: string | null;
  expired: boolean;
  uploadedAt: string;
}

interface InspectionRecord {
  inspectionId: string;
  horseId: string;
  horseName: string;
  agencyName: string;
  status: string;
  remarks: string | null;
  updatedAt: string;
}

interface StallConfiguration {
  horseId: string;
  horseName: string | null;
  size: string;
  lengthMeters: number;
  widthMeters: number;
}

export function RequestDetail() {
  const { params, navigate, user } = useAppStore();
  const { toast } = useToast();
  const [request, setRequest] = useState<TransportRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [plan, setPlan] = useState<TransportPlanSummary | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [planError, setPlanError] = useState("");


  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocContext, setUploadingDocContext] = useState<{ docType: string, horseId: string } | null>(null);

  const [approvalNote, setApprovalNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "specialist-approve" | "specialist-reject" | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [pricingCatalog, setPricingCatalog] = useState<PricingCatalogItem[]>([]);
  const [pricingQuote, setPricingQuote] = useState<PricingQuote | null>(null);
  const [pricingPackageCode, setPricingPackageCode] = useState("");
  const [pricingServiceCodes, setPricingServiceCodes] = useState<string[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

  const [docsData, setDocsData] = useState<HorseDocument[] | null>(null);
  const [docsError, setDocsError] = useState("");
  const [inspections, setInspections] = useState<InspectionRecord[] | null>(null);
  const [inspectionsError, setInspectionsError] = useState("");
  const [stallConfigurations, setStallConfigurations] = useState<StallConfiguration[] | null>(null);
  const [stallConfigurationError, setStallConfigurationError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setRequest(null);
    setPlan(null);
    setPlanLoaded(false);
    setPlanError("");
    setDocsData(null);
    setDocsError("");
    setInspections(null);
    setInspectionsError("");
    setStallConfigurations(null);
    setStallConfigurationError("");
    try {
      setRequest(await apiGet<TransportRequest>(`/transport-requests/${params.id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi tải chi tiết đơn hàng.");
    }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    if (!request || !["da phe duyet", "approved"].includes(request.status.trim().toLowerCase()) || planLoaded) return;
    void Promise.resolve().then(async () => {
      try {
        setPlan(await apiGet<TransportPlanSummary>(`/transport-requests/${request.requestId}/plan`));
        setPlanError("");
      } catch (e: unknown) {
        if (e instanceof ApiError && e.status === 404) {
          setPlan(null);
          setPlanError("");
        } else {
          setPlanError(e instanceof Error ? e.message : "Không thể tải kế hoạch liên quan.");
        }
      } finally {
        setPlanLoaded(true);
      }
    });
  }, [request, planLoaded]);

  useEffect(() => {
    if (!request) return;
    let active = true;
    void apiGet<StallConfiguration[]>(`/transport-requests/${request.requestId}/stalls`)
      .then((configurations) => {
        if (active) {
          setStallConfigurations(configurations);
          setStallConfigurationError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setStallConfigurationError(cause instanceof Error ? cause.message : "Không thể tải cấu hình chuồng.");
      });
    return () => { active = false; };
  }, [request?.requestId]);

  useEffect(() => {
    if (!request || !["CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST"].includes(user?.roleId ?? "")) return;
    let active = true;
    void Promise.resolve().then(async () => {
      setPricingLoading(true);
      setPricingError("");
      try {
        const [quote, catalog] = await Promise.all([
          apiGet<PricingQuote>(`/transport-requests/${request.requestId}/quote`),
          apiGet<PricingCatalogItem[]>("/pricing/catalog"),
        ]);
        if (active) {
          setPricingQuote(quote);
          setPricingCatalog(catalog);
          setPricingPackageCode(quote.packageCode ?? "");
          setPricingServiceCodes(quote.selectedServiceCodes);
        }
      } catch (cause: unknown) {
        if (active) setPricingError(cause instanceof Error ? cause.message : "Không thể tải báo giá.");
      } finally {
        if (active) setPricingLoading(false);
      }
    });
    return () => { active = false; };
  }, [request?.requestId, user?.roleId]);

  const loadDocs = useCallback(async () => {
    if (!request) return;
    setDocsError("");
    try {
      const documents = await Promise.all(
        request.horses.map((horse) =>
          apiGet<HorseDocument[]>(`/horses/${horse.horseId}/documents`)
        )
      );
      setDocsData(documents.flat().filter((document) => document.requestId === request.requestId));
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : "Không thể tải hồ sơ tài liệu.");
    }
  }, [request]);

  const loadInspections = useCallback(async () => {
    setInspectionsError("");
    try {
      setInspections(await apiGet<InspectionRecord[]>(`/inspections/request/${params.id}`));
    } catch (e) {
      setInspectionsError(e instanceof Error ? e.message : "Không thể tải hồ sơ kiểm định.");
    }
  }, [params.id]);

  useEffect(() => {
    if (activeTab === "documents" && docsData === null) void Promise.resolve().then(loadDocs);
    if (activeTab === "inspections" && inspections === null) void Promise.resolve().then(loadInspections);
  }, [activeTab, docsData, inspections, loadDocs, loadInspections]);

  const handleApproval = async () => {
    if (!reviewAction) return;
    if ((reviewAction === "reject" || reviewAction === "specialist-reject") && !approvalNote.trim()) {
      toast({ title: "Vui lòng nhập lý do từ chối", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      let body: unknown = undefined;
      if (reviewAction === "approve") {
        body = { previewFingerprint: pricingQuote?.fingerprint };
      } else if (reviewAction === "reject" || reviewAction === "specialist-reject") {
        body = { reason: approvalNote.trim() };
      }
      const updated = await apiPatch<TransportRequest>(
        `/transport-requests/${params.id}/${reviewAction}`,
        body
      );
      if (!updated.requestId || !updated.status) {
        throw new Error("Không nhận được trạng thái mới sau khi cập nhật.");
      }
      setRequest(updated);
      if (reviewAction === "approve") {
        try {
          setPricingQuote(await apiGet<PricingQuote>(`/transport-requests/${updated.requestId}/quote`));
        } catch (quoteError: unknown) {
          setPricingError(quoteError instanceof Error ? quoteError.message : "Không thể tải báo giá đã xác nhận.");
        }
      }
      toast({
        title: reviewAction === "approve"
          ? "Đã phê duyệt cấp 1 (Logistics Manager)"
          : reviewAction === "specialist-approve"
            ? "Đã phê duyệt cấp 2 (Transport Specialist) - Hoàn tất"
            : "Đã từ chối yêu cầu vận chuyển",
      });
      setApprovalNote("");
      setReviewAction(null);
    } catch (e: unknown) {
      let description = e instanceof Error ? e.message : "Không thể cập nhật trạng thái yêu cầu.";
      if (reviewAction === "approve" && e instanceof ApiError && e.status === 409) {
        try {
          const latestQuote = await apiGet<PricingQuote>(`/transport-requests/${params.id}/quote`);
          setPricingQuote(latestQuote);
          setPricingPackageCode(latestQuote.packageCode ?? "");
          setPricingServiceCodes(latestQuote.selectedServiceCodes);
          setPricingError("Bảng giá đã thay đổi; báo giá mới đã được tải. Hãy kiểm tra lại trước khi xác nhận.");
        } catch (reloadError: unknown) {
          description = `${description} Không thể tải lại báo giá: ${reloadError instanceof Error ? reloadError.message : "lỗi không xác định"}`;
        }
        setReviewAction(null);
      }
      toast({ title: "Lỗi", description, variant: "destructive" });
    }
    finally { setActionLoading(false); }
  };

  const handleCancelRequest = async () => {
    if (!request || !cancellationReason.trim()) return;
    setActionLoading(true);
    try {
      const updated = await apiPatch<TransportRequest>(`/transport-requests/${request.requestId}/cancel`, {
        reason: cancellationReason.trim(),
      });
      setRequest(updated);
      setCancelConfirmOpen(false);
      setCancellationReason("");
      toast({ title: "Đã hủy yêu cầu vận chuyển" });
    } catch (cause) {
      toast({
        title: "Không thể hủy yêu cầu",
        description: cause instanceof Error ? cause.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const triggerFileUpload = (docType: string, horseId: string) => {
    setUploadingDocContext({ docType, horseId });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !uploadingDocContext) return;
    
    const file = e.target.files[0];
    setActionLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", uploadingDocContext.docType);
      formData.append("requestId", request?.requestId ?? params.id);

      await apiPostFormData(`/horses/${uploadingDocContext.horseId}/documents`, formData);
      
      toast({ title: "Đã nộp tài liệu", description: file.name });
      loadDocs();
    } catch (err: unknown) {
      toast({ title: "Lỗi tải lên", description: err instanceof Error ? err.message : "Không thể tải tài liệu lên.", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setUploadingDocContext(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDocumentDownload = async (document: HorseDocument) => {
    setDownloadingDocumentId(document.documentId);
    try {
      await apiDownloadFile(
        `/documents/${document.documentId}/file`,
        document.fileName || `${document.documentType}.file`
      );
    } catch (downloadError: unknown) {
      toast({
        title: "Không thể tải tài liệu",
        description: downloadError instanceof Error ? downloadError.message : "Yêu cầu tải tệp không thành công.",
        variant: "destructive",
      });
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!request) return <ErrorState message="Không tìm thấy đơn" />;


  const reqStatus = request.status.trim().toLowerCase();
  const userRole = user?.roleId || "";
  
  const canApprove = userRole === "LOGISTICS_MANAGER" && ["dang tham dinh", "pending"].includes(reqStatus);
  const canSpecialistApprove = (userRole === "TRANSPORT_SPECIALIST" || userRole === "LOGISTICS_MANAGER") && ["cho chuyen vien kiem tra", "manager approved", "manager_approved"].includes(reqStatus);
  const isCustomer = userRole === "CUSTOMER";
  const listView = (userRole === "LOGISTICS_MANAGER" || userRole === "TRANSPORT_SPECIALIST") ? "approvals" : "requests";
  const totalHorses = request.horses.length;

  return (
    <div className="space-y-6">
      {/* Input File ẩn dùng chung */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      
      <PageHeader
        title={`Đơn ${requestCode(request.requestId)}`}
        description={`Mã: ${request.requestId}`}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {isCustomer && ["dang tham dinh", "pending"].includes(reqStatus) && (
              <Button variant="destructive" size="sm" onClick={() => setCancelConfirmOpen(true)} disabled={actionLoading}>Hủy yêu cầu</Button>
            )}
            <StatusBadge status={transportRequestStatusLabel(request.status)} />
            <Button variant="outline" size="sm" onClick={() => params.returnPlanId ? navigate("plan-detail", { id: params.returnPlanId }) : navigate(listView)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
          </div>
        }
      />

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Khách hàng</p><p className="mt-1 text-sm font-semibold">{request.customerName || user?.name || "Chưa rõ"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tuyến</p><p className="mt-1 text-sm font-semibold leading-tight">{request.origin?.name || "Chưa xác định"}</p><p className="text-xs text-muted-foreground">→ {request.destination?.name || "Chưa xác định"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Khởi hành</p><p className="mt-1 text-sm font-semibold">{formatDate(request.scheduledDepartureDate)}</p><p className="text-xs text-muted-foreground">Đến dự kiến: {formatDate(request.scheduledArrivalDate)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tổng dự kiến</p><p className="mt-1 text-lg font-bold text-primary">{request.estimatedAmount != null ? (request.currency ? formatMoney(request.estimatedAmount, request.currency) : `${request.estimatedAmount} (chưa rõ tiền tệ)`) : "Chưa chốt"}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="gap-1.5"><FileText className="h-4 w-4" /> Tổng quan</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><ScrollText className="h-4 w-4" /> Giấy tờ</TabsTrigger>
          <TabsTrigger value="inspections" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> Kiểm định</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><Clock className="h-4 w-4" /> Thời gian</TabsTrigger>
          {["da phe duyet", "approved"].includes(reqStatus) && <TabsTrigger value="plan" className="gap-1.5"><FileText className="h-4 w-4" /> Kế hoạch</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
              {request.rejectionReason && (
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardHeader><CardTitle className="text-base text-destructive flex items-center gap-2"><XCircle className="h-5 w-5" /> Yêu cầu đã bị từ chối</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm text-destructive">
                    <p className="font-semibold">Lý do từ chối:</p>
                    <p className="rounded-md bg-background/80 p-3 text-foreground">{request.rejectionReason}</p>
                  </CardContent>
                </Card>
              )}
              {request.cancelledAt && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Thông tin hủy yêu cầu</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Người hủy: {request.cancelledBy === request.customerId ? request.customerName || "Khách hàng" : "Không xác định"}</p>
                    <p>Thời gian: {formatDateTime(request.cancelledAt)}</p>
                    <p>Lý do: {request.cancellationReason || "Không có thông tin"}</p>
                  </CardContent>
                </Card>
              )}

              {/* Tiến trình phê duyệt 2 cấp */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Tiến trình phê duyệt 2 cấp</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Cấp 1: Quản lý Logistics</span>
                        {request.approvedAt ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Đã duyệt báo giá</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Chờ duyệt</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium">{request.approvedByName ? `Người duyệt: ${request.approvedByName}` : "Chưa phê duyệt"}</p>
                      {request.approvedAt && <p className="text-xs text-muted-foreground mt-0.5">Thời gian: {formatDateTime(request.approvedAt)}</p>}
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Cấp 2: Chuyên viên vận tải</span>
                        {request.specialistApprovedAt ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Đã duyệt hồ sơ pháp lý</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">
                            {request.approvedAt ? "Đang chờ kiểm tra" : "Chờ cấp 1 hoàn tất"}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium">{request.specialistApprovedByName ? `Chuyên viên: ${request.specialistApprovedByName}` : "Chưa phê duyệt"}</p>
                      {request.specialistApprovedAt && <p className="text-xs text-muted-foreground mt-0.5">Thời gian: {formatDateTime(request.specialistApprovedAt)}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            {["CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST"].includes(userRole) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gói dịch vụ và báo giá</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pricingError && <p role="alert" className="text-sm text-destructive">{pricingError}</p>}
                  {pricingLoading && <p className="text-sm text-muted-foreground">Đang tải thông tin báo giá...</p>}
                  {pricingQuote && (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Gói vận chuyển đã chọn bởi khách hàng</p>
                          <p className="text-base font-semibold text-primary">
                            {pricingCatalog.find((i) => i.code === pricingQuote.packageCode)?.name || pricingQuote.packageCode || "Chưa chọn gói"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {pricingQuote.status === "CONFIRMED" ? "Đã chốt báo giá" : "Đang thẩm định"}
                        </Badge>
                      </div>
                      {pricingQuote.selectedServiceCodes.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Dịch vụ bổ sung đã chọn:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {pricingQuote.selectedServiceCodes.map((code) => (
                              <Badge key={code} variant="secondary" className="text-xs font-normal">
                                {pricingCatalog.find((i) => i.code === code)?.name || code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {pricingQuote?.status === "LEGACY" && (
                    <div className="rounded-md border border-border p-3 text-sm">
                      Báo giá lịch sử: <strong>
                        {pricingQuote.legacyAmount !== null && pricingQuote.legacyCurrency
                          ? formatMoney(pricingQuote.legacyAmount, pricingQuote.legacyCurrency)
                          : "Không có số tiền"}
                      </strong>. Hệ thống giữ nguyên số tiền và tiền tệ gốc; không tự quy đổi.
                    </div>
                  )}
                  {pricingQuote?.status === "DRAFT" && pricingQuote.legacyAmount !== null && (
                    <div className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-bg)]/30 p-3 text-sm">
                      Yêu cầu có số tiền lịch sử {pricingQuote.legacyCurrency
                        ? formatMoney(pricingQuote.legacyAmount, pricingQuote.legacyCurrency)
                        : pricingQuote.legacyAmount}. Giá hiện tại không được tự ghi đè hoặc quy đổi.
                    </div>
                  )}
                  {pricingQuote?.lines.map((line) => (
                    <div key={line.code} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 text-sm last:border-0">
                      <div>
                        <p className="font-medium">{line.name}{line.required ? " · Bắt buộc" : ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.includedInPackage
                            ? "Đã bao gồm trong gói"
                            : line.quantity !== null && line.unitType
                              ? `${line.quantity} ${pricingUnitLabel(line.unitType)} × ${line.unitPriceUsd === null ? "Chưa có" : formatMoney(line.unitPriceUsd, "USD")}`
                              : "Đơn giá hoặc đơn vị tính chưa có"}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {line.includedInPackage
                          ? "Đã bao gồm"
                          : line.lineTotalUsd === null
                            ? "Chưa có"
                            : formatMoney(line.lineTotalUsd, pricingQuote.currency)}
                      </span>
                    </div>
                  ))}
                  {pricingQuote && pricingQuote.status !== "LEGACY" && (
                    <>
                      {pricingQuote.missingItems.length > 0 && (
                        <p className="rounded-md bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-fg)]">
                          Chưa thể xác nhận báo giá. Cần cấu hình giá và đơn vị tính cho: {pricingQuote.missingItems.join(", ")}.
                        </p>
                      )}
                      <div className="flex justify-between border-t border-border pt-3 font-bold">
                        <span>{pricingQuote.status === "CONFIRMED" ? "Báo giá đã chốt" : "Tổng dự kiến"} ({pricingQuote.currency})</span>
                        <span>{pricingQuote.totalAmount === null ? "Chưa có" : formatMoney(pricingQuote.totalAmount, pricingQuote.currency)}</span>
                      </div>
                    </>
                  )}
                  {!pricingLoading && !pricingQuote && !pricingError && (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu báo giá.</p>
                  )}
                </CardContent>
              </Card>
            )}
            {(isCustomer || userRole === "LOGISTICS_MANAGER") && (
              <InvoiceDisplay requestId={request.requestId} />
            )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4" /> Ngựa vận chuyển ({totalHorses} con)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.horses.map((horse) => {
                    return (
                      <button key={horse.horseId} onClick={() => navigate("horse-detail", { id: horse.horseId })} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/40">
                        <div className="flex min-w-0 items-center gap-3">
                          <HorseImage src={horse.imageUrl} name={horse.name} className="h-12 w-12 shrink-0 rounded-md" />
                          <div><p className="text-sm font-medium">{horse.name}</p><p className="text-xs text-muted-foreground">{horse.microchipId || "Không mã"}</p></div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">Mở hồ sơ</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            {(isCustomer || userRole === "LOGISTICS_MANAGER") && (
              <>
                <CompensationClaimsPanel
                  requestId={request.requestId}
                  isManager={userRole === "LOGISTICS_MANAGER"}
                  canSubmit={isCustomer && ((!!plan && transportPlanStatusLabel(plan.status) === "Hoàn thành") || request.status === "COMPLETED")}
                />
                <ServiceFeedbackPanel
                  requestId={request.requestId}
                  canFeedback={isCustomer && ((!!plan && transportPlanStatusLabel(plan.status) === "Hoàn thành") || request.status === "COMPLETED")}
                  isCustomer={isCustomer}
                />
              </>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> Thông tin đơn</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {request.specialRequirements && <div className="border-t border-border pt-3"><p className="text-muted-foreground">Yêu cầu đặc biệt</p><p className="mt-1 font-medium">{request.specialRequirements}</p></div>}
                {!request.specialRequirements && <p className="text-muted-foreground">Không có yêu cầu đặc biệt.</p>}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Cấu hình chuồng</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {stallConfigurationError && <p role="alert" className="text-sm text-destructive">{stallConfigurationError}</p>}
              {stallConfigurations?.length ? stallConfigurations.map((stall) => (
                <div key={stall.horseId} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <span className="font-medium">{stall.horseName || request.horses.find((horse) => horse.horseId === stall.horseId)?.name || "Ngựa"}</span>
                  <span className="text-muted-foreground">{stallSizeLabel(stall.size)} · {stall.lengthMeters} × {stall.widthMeters} m</span>
                </div>
              )) : !stallConfigurationError ? (
                <p className="text-sm text-muted-foreground">Yêu cầu này chưa có cấu hình chuồng.</p>
              ) : null}
            </CardContent>
          </Card>

          {canApprove && (
            <Card className="border-[var(--warning)]/30 bg-[var(--warning-bg)]/20">
              <CardHeader><CardTitle className="text-base">Xử lý yêu cầu vận chuyển (Cấp 1 - Quản lý Logistics)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2"><Label>Lý do từ chối (bắt buộc khi từ chối)</Label><Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Lý do từ chối..." rows={2} /></div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => setReviewAction("approve")} disabled={actionLoading || pricingLoading || !pricingQuote?.canConfirm || !pricingQuote.fingerprint} className="gap-2 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white"><CheckCircle2 className="h-4 w-4" /> Phê duyệt cấp 1 & chốt báo giá</Button>
                  <Button onClick={() => setReviewAction("reject")} disabled={actionLoading || !approvalNote.trim()} variant="outline" className="gap-2 border-[var(--danger)] text-[var(--danger-fg)]"><XCircle className="h-4 w-4" /> Từ chối yêu cầu</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {canSpecialistApprove && (
            <Card className="border-blue-500/30 bg-blue-500/10">
              <CardHeader><CardTitle className="text-base text-blue-700 flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Thẩm định hồ sơ & Phê duyệt cấp 2 (Chuyên viên vận tải)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Yêu cầu đã được Quản lý Logistics chốt báo giá. Chuyên viên kiểm tra hồ sơ kiểm dịch, tính khả thi và bấm phê duyệt để cho phép Điều phối viên lập kế hoạch lộ trình.
                </p>
                <div className="space-y-2"><Label>Lý do từ chối (bắt buộc khi từ chối)</Label><Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Nhập lý do nếu hồ sơ hoặc tuyến không đạt yêu cầu..." rows={2} /></div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => setReviewAction("specialist-approve")} disabled={actionLoading} className="gap-2 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white"><CheckCircle2 className="h-4 w-4" /> Chuyên viên phê duyệt hoàn tất</Button>
                  <Button onClick={() => setReviewAction("specialist-reject")} disabled={actionLoading || !approvalNote.trim()} variant="outline" className="gap-2 border-[var(--danger)] text-[var(--danger-fg)]"><XCircle className="h-4 w-4" /> Chuyên viên từ chối</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4" /> Hồ sơ tài liệu gắn với yêu cầu</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {docsError && <p role="alert" className="text-sm text-destructive">{docsError}</p>}
              {docsData === null && !docsError && <p className="text-sm text-muted-foreground">Đang tải hồ sơ tài liệu...</p>}
              {docsData?.length === 0 && !docsError && <p className="text-sm text-muted-foreground">Chưa có tài liệu gắn với yêu cầu này.</p>}
              {docsData?.map((document) => (
                <div key={document.documentId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{document.fileName || document.documentType}</p>
                    <p className="text-xs text-muted-foreground">{document.horseName} · {document.documentType} · {formatDateTime(document.uploadedAt)}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{document.expiryDate ? `Hết hạn: ${formatDate(document.expiryDate)}` : "Không có ngày hết hạn"}</p>
                    {document.expired && <p className="text-destructive">Đã hết hạn</p>}
                    {!document.expired && <p>Chưa xác minh</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handleDocumentDownload(document)} disabled={downloadingDocumentId === document.documentId} className="gap-1.5">
                    <Download className="h-4 w-4" /> {downloadingDocumentId === document.documentId ? "Đang tải..." : "Tải tệp"}
                  </Button>
                </div>
              ))}
              {isCustomer && request.horses.map((horse) => (
                <Button key={horse.horseId} size="sm" variant="outline" onClick={() => triggerFileUpload("PASSPORT", horse.horseId)} disabled={actionLoading} className="gap-1">
                  <Upload className="h-3.5 w-3.5" /> Nộp tài liệu cho {horse.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Bản ghi kiểm định</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {inspectionsError && <p role="alert" className="text-sm text-destructive">{inspectionsError}</p>}
              {inspections === null && !inspectionsError && <p className="text-sm text-muted-foreground">Đang tải bản ghi kiểm định...</p>}
              {inspections?.length === 0 && <p className="text-sm text-muted-foreground">Chưa có bản ghi kiểm định cho yêu cầu này.</p>}
              {inspections?.map((inspection) => (
                <div key={inspection.inspectionId} className="rounded-lg border border-border p-3">
                  <button onClick={() => navigate("inspection-detail", { id: inspection.inspectionId })} disabled={userRole !== "TRANSPORT_SPECIALIST"} className="flex w-full flex-wrap items-center justify-between gap-2 text-left disabled:cursor-default">
                    <p className="text-sm font-medium">{inspection.horseName} · {inspection.agencyName}</p>
                    <StatusBadge status={inspectionStatusLabel(inspection.status)} />
                  </button>
                  {inspection.remarks && <p className="mt-1 text-sm text-muted-foreground">{inspection.remarks}</p>}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Danh sách các bản ghi kiểm định liên quan đến yêu cầu này.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          {plan ? (
            <div className="space-y-4">
              <RouteHistoryMap planId={plan.planId} origin={request.origin?.name || "Chưa xác định"} destination={request.destination?.name || "Chưa xác định"} />
              <JourneyTimeline planId={plan.planId} />
            </div>
          ) : (
            <Card><CardContent className="p-5 text-sm text-muted-foreground">
              <div className="space-y-3">
                <p className="font-medium text-foreground">Nhật ký yêu cầu</p>
                <p>Tạo yêu cầu: {formatDateTime(request.createdAt)}</p>
                <p>Cập nhật gần nhất: {formatDateTime(request.updatedAt)}</p>
                {request.approvedAt && <p>Được xử lý lúc: {formatDateTime(request.approvedAt)}{request.approvedByName ? ` bởi ${request.approvedByName}` : ""}</p>}
                <p>Nhật ký tuyến và vị trí sẽ xuất hiện khi yêu cầu có kế hoạch vận chuyển.</p>
              </div>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="plan">
          <Card><CardContent className="space-y-3 p-5">
            {planError && <p role="alert" className="text-sm text-destructive">{planError}</p>}
            {!planLoaded && !planError && <p className="text-sm text-muted-foreground">Đang tải kế hoạch liên quan...</p>}
            {planLoaded && !plan && !planError && <p className="text-sm text-muted-foreground">Chưa có kế hoạch vận chuyển được liên kết với yêu cầu này.</p>}
            {plan && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-medium">Kế hoạch {planCode(plan.planId)}</p><p className="text-sm text-muted-foreground">{formatDateTime(plan.departureTime)} → {formatDateTime(plan.arrivalTime)}</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={transportPlanStatusLabel(plan.status)} /><Button onClick={() => navigate("plan-detail", { id: plan.planId, requestId: request.requestId })}>Mở kế hoạch</Button></div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

      </Tabs>

      <AlertDialog open={reviewAction !== null} onOpenChange={(open) => { if (!open) setReviewAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewAction === "approve"
                ? "Phê duyệt cấp 1 & Chốt báo giá?"
                : reviewAction === "specialist-approve"
                  ? "Chuyên viên phê duyệt cấp 2 (Hoàn tất)?"
                  : "Từ chối yêu cầu vận chuyển?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewAction === "approve"
                ? "Yêu cầu sẽ được Logistics Manager phê duyệt cùng báo giá USD chốt. Trạng thái sẽ chuyển sang 'Chờ chuyên viên kiểm tra' (Cấp 2)."
                : reviewAction === "specialist-approve"
                  ? "Yêu cầu sẽ được phê duyệt hoàn tất (2 cấp). Hệ thống sẽ cho phép Điều phối viên lập kế hoạch lộ trình và điều phối phương tiện."
                  : "Yêu cầu sẽ bị từ chối và lý do sẽ được lưu lại, thông báo trực tiếp đến khách hàng."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleApproval(); }} disabled={actionLoading}>
              {actionLoading ? "Đang xử lý..." : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy yêu cầu vận chuyển?</AlertDialogTitle>
            <AlertDialogDescription>
              Chỉ yêu cầu đang chờ thẩm định mới có thể hủy. Yêu cầu đã được phê duyệt không thể hủy từ màn hình này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="request-cancellation-reason">Lý do hủy</Label>
            <Textarea
              id="request-cancellation-reason"
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              maxLength={500}
              required
              placeholder="Nhập lý do hủy yêu cầu"
              disabled={actionLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Giữ lại</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleCancelRequest(); }} disabled={actionLoading || !cancellationReason.trim()}>
              {actionLoading ? "Đang hủy..." : "Xác nhận hủy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function stallSizeLabel(size: string): string {
  switch (size) {
    case "SMALL": return "Small";
    case "MEDIUM": return "Medium";
    case "LARGE": return "Large";
    case "EXTRA_LARGE": return "Extra Large";
    case "CUSTOM": return "Tùy chỉnh";
    default: return size;
  }
}