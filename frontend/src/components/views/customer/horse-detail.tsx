"use client";

import { useEffect, useState } from "react";
import { apiDownloadFile, apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HorseImage } from "@/components/app/horse-image";

interface HorseResponse {
  horseId: string;
  name: string;
  microchipId: string;
  gender: string;
  breed?: string | null;
  birthYear?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  recoveryDays?: number | null;
  pedigree: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  temperament: string | null;
  imageUrl?: string | null;
  ownerName: string | null;
  createdAt: string;
}

interface HorseDocument {
  documentId: string;
  documentType: string;
  fileName: string | null;
  uploadedAt: string;
  expired: boolean;
  expiryDate: string | null;
  requestId: string | null;
}

interface HealthLog {
  logId: string;
  stressLevel: number | null;
  heartRate: number | null;
  temperature: number | null;
  appetiteStatus: string | null;
  notes: string | null;
  loggedAt: string;
  loggedByName: string | null;
}

interface RequestSummary {
  requestId: string;
  status: string;
  origin: { name: string };
  destination: { name: string };
  scheduledDepartureDate: string;
  horses: { horseId: string }[];
}
import { Heart, ArrowLeft, Microchip, FileText, ScrollText, Stethoscope, Truck, Download } from "lucide-react";
import { formatDateTime, requestCode, transportRequestStatusLabel } from "@/lib/constants";


const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
};

export function HorseDetail() {
  const { params, navigate, user } = useAppStore();
  const { toast } = useToast();
  const [horse, setHorse] = useState<HorseResponse | null>(null);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [requestHistory, setRequestHistory] = useState<RequestSummary[]>([]);
  const [panelErrors, setPanelErrors] = useState<Record<string, string>>({});
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setError("");
      setPanelErrors({});
      try {
        setLoading(true);
        setHorse(null);
        setDocuments([]);
        setHealthLogs([]);
        setRequestHistory([]);
        const requestPath = user?.roleId === "CUSTOMER" ? "/transport-requests/my" : "/transport-requests";
        const results = await Promise.allSettled([
          apiGet<HorseResponse>(`/horses/${params.id}`),
          apiGet<HorseDocument[]>(`/horses/${params.id}/documents`),
          apiGet<HealthLog[]>(`/horses/${params.id}/health-logs`),
          apiGet<RequestSummary[]>(requestPath),
        ]);
        const [horseResult, documentsResult, healthResult, requestsResult] = results;
        if (horseResult.status === "rejected") throw horseResult.reason;
        const horseData = horseResult.value;
        setHorse(horseData);
        if (documentsResult.status === "fulfilled") setDocuments(documentsResult.value);
        else setPanelErrors((current) => ({ ...current, documents: documentsResult.reason instanceof Error ? documentsResult.reason.message : "Không thể tải tài liệu." }));
        if (healthResult.status === "fulfilled") setHealthLogs(healthResult.value);
        else setPanelErrors((current) => ({ ...current, health: healthResult.reason instanceof Error ? healthResult.reason.message : "Không thể tải lịch sử sức khỏe." }));
        if (requestsResult.status === "fulfilled") {
          setRequestHistory(requestsResult.value.filter((request) => request.horses.some((item) => item.horseId === horseData.horseId)));
        } else {
          setPanelErrors((current) => ({ ...current, requests: requestsResult.reason instanceof Error ? requestsResult.reason.message : "Không thể tải lịch sử yêu cầu." }));
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Không thể tải thông tin chi tiết của ngựa.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, user?.roleId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!horse) return <ErrorState message="Không tìm thấy ngựa" />;

  const downloadDocument = async (document: HorseDocument) => {
    setDownloadingDocumentId(document.documentId);
    try {
      await apiDownloadFile(`/documents/${document.documentId}/file`, document.fileName || document.documentType);
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

  const info = [
    { icon: Microchip, label: "Mã Microchip", value: horse.microchipId || "—" },
    { icon: Heart, label: "Giới tính", value: horse.gender || "—" },
    { icon: Stethoscope, label: "Giống ngựa", value: horse.breed || "Chưa cập nhật" },
    { icon: Stethoscope, label: "Năm sinh", value: horse.birthYear ? `${horse.birthYear} (${new Date().getFullYear() - horse.birthYear} tuổi)` : "Chưa cập nhật" },
    { icon: Stethoscope, label: "Cân nặng", value: horse.weightKg != null ? `${horse.weightKg} kg` : "Chưa cập nhật" },
    { icon: Stethoscope, label: "Chiều cao", value: horse.heightCm != null ? `${horse.heightCm} cm` : "Chưa cập nhật" },
    { icon: Stethoscope, label: "Hồi phục dự kiến", value: horse.recoveryDays != null ? `${horse.recoveryDays} ngày` : "Chưa cập nhật" },
    { icon: Stethoscope, label: "Tính khí", value: horse.temperament || "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={horse.name}
        description={`${horse.microchipId || "Không có mã"}${horse.pedigree ? ` · Gia phả: ${horse.pedigree}` : " · Gia phả: Chưa cập nhật"}`}
        icon={<Heart className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("horses")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Thông tin chung</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <HorseImage src={horse.imageUrl} name={horse.name} className="mb-4 aspect-[4/3] w-full rounded-md" />
            {info.map((i) => (
              <div key={i.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground"><i.icon className="h-4 w-4" /> {i.label}</span>
                <span className="text-sm font-medium">{i.value}</span>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Chủ sở hữu</p>
              <p className="text-sm font-medium">{horse.ownerName || "Chưa có thông tin"}</p>
              <p className="mt-2 text-xs text-muted-foreground">Tạo hồ sơ: {formatDateTime(horse.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Phả hệ & Y tế</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phả hệ</p>
              <p className="mt-1 text-sm">{horse.pedigree || "Chưa cập nhật"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tiền sử bệnh</p>
              <p className="mt-1 text-sm">{horse.medicalHistory || "Chưa cập nhật"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dị ứng</p>
              <p className="mt-1 text-sm">{horse.allergies || "Chưa cập nhật"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Tài liệu & Giấy tờ</CardTitle>
        </CardHeader>
        <CardContent>
        {panelErrors.documents && <p role="alert" className="mb-3 text-sm text-destructive">{panelErrors.documents}</p>}
        {documents.length === 0 && !panelErrors.documents ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Chưa có tài liệu" description="Tài liệu (Hộ chiếu, sổ tiêm phòng) sẽ được thêm khi làm thủ tục." className="py-8" />
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.documentId} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><ScrollText className="h-4 w-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-medium">{doc.documentType}</p>
                      <p className="text-xs text-muted-foreground">{doc.fileName || "Tệp tải lên"} · {formatDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={doc.expired ? "Đã hết hạn" : "Chưa xác minh"} />
                    <p className="mt-1 text-xs text-muted-foreground">{doc.expiryDate ? `Hạn ${formatDate(doc.expiryDate)}` : "Không có ngày hết hạn"}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void downloadDocument(doc)} disabled={downloadingDocumentId === doc.documentId} className="gap-1.5">
                    <Download className="h-4 w-4" /> {downloadingDocumentId === doc.documentId ? "Đang tải..." : "Tải tệp"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Nhật ký sức khỏe</CardTitle></CardHeader>
        <CardContent className="space-y-3">
        {panelErrors.health && <p role="alert" className="text-sm text-destructive">{panelErrors.health}</p>}
        {healthLogs.length === 0 && !panelErrors.health ? <EmptyState title="Chưa có bản ghi sức khỏe" /> : healthLogs.map((log) => (
          <div key={log.logId} className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{formatDateTime(log.loggedAt)} · {log.loggedByName || "Người ghi không rõ"}</p>
            <p className="mt-1 text-sm">Nhịp tim: {log.heartRate ?? "—"} · Nhiệt độ: {log.temperature ?? "—"} °C · Mức độ căng thẳng: {log.stressLevel ?? "—"}</p>
            <p className="text-sm text-muted-foreground">Ăn uống: {log.appetiteStatus || "—"}{log.notes ? ` · ${log.notes}` : ""}</p>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Hiển thị chỉ số và ghi chú do người dùng ghi nhận; không phải chẩn đoán y tế.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Yêu cầu vận chuyển liên quan</CardTitle></CardHeader>
        <CardContent className="space-y-2">
        {panelErrors.requests && <p role="alert" className="text-sm text-destructive">{panelErrors.requests}</p>}
        {requestHistory.length === 0 && !panelErrors.requests ? <EmptyState title="Chưa có yêu cầu liên quan" /> : requestHistory.map((request) => (
          <button key={request.requestId} onClick={() => navigate("request-detail", { id: request.requestId })} className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:border-primary/40">
            <div><p className="text-sm font-medium">{requestCode(request.requestId)} · {request.origin?.name || "Chưa xác định"} → {request.destination?.name || "Chưa xác định"}</p><p className="text-xs text-muted-foreground">Khởi hành {formatDate(request.scheduledDepartureDate)}</p></div>
            <StatusBadge status={transportRequestStatusLabel(request.status)} />
          </button>
        ))}
        </CardContent>
      </Card>
    </div>
  );
}