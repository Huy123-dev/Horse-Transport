"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search, MapPin, Calendar, Heart, ChevronRight, Download } from "lucide-react";
import { formatDate, formatMoney, requestCode, transportRequestStatusLabel } from "@/lib/constants";
import { exportToCSV } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";
import { ListStatsBar } from "@/components/app/list-stats-bar";

export type RequestStatusGroup = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export function getRequestStatusGroup(status: string | null | undefined): RequestStatusGroup {
  if (!status) return "PENDING";
  const s = status.trim().toLowerCase();
  if (["da phe duyet", "đã phê duyệt", "approved"].some((k) => s.includes(k))) return "APPROVED";
  if (["dang tham dinh", "đang thẩm định", "pending", "under_review", "chờ duyệt"].some((k) => s.includes(k))) return "PENDING";
  if (["tu choi", "từ chối", "rejected"].some((k) => s.includes(k))) return "REJECTED";
  if (["da huy", "đã hủy", "cancelled", "canceled"].some((k) => s.includes(k))) return "CANCELLED";
  return "PENDING";
}

const FILTER_TABS: { key: RequestStatusGroup; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Đang chờ duyệt" },
  { key: "APPROVED", label: "Đã phê duyệt" },
  { key: "REJECTED", label: "Từ chối" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const translateStatus = (status: string) => {
  return status === "Tất cả" ? status : transportRequestStatusLabel(status);
};

interface TransportRequest {
  requestId: string;
  origin: { name: string; countryCode: string | null };
  destination: { name: string; countryCode: string | null };
  scheduledDepartureDate: string | null;
  scheduledArrivalDate: string | null;
  status: string;
  estimatedAmount: number | null;
  currency: string;
  specialRequirements: string | null;
  horses: { horseId: string; name: string; microchipId: string }[] | null;
  createdAt: string;
  updatedAt: string;
}

export function RequestList() {
  const { navigate } = useAppStore();
  const { toast } = useToast();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatusGroup>("ALL");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setRequests(await apiGet<TransportRequest[]>("/transport-requests/my"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không thể tải danh sách yêu cầu.");
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter((r) => getRequestStatusGroup(r.status) === "PENDING").length,
    APPROVED: requests.filter((r) => getRequestStatusGroup(r.status) === "APPROVED").length,
    REJECTED: requests.filter((r) => getRequestStatusGroup(r.status) === "REJECTED").length,
    CANCELLED: requests.filter((r) => getRequestStatusGroup(r.status) === "CANCELLED").length,
  };

  const filtered = requests.filter((r) => {
    const matchSearch = !search ||
      r.requestId.toLowerCase().includes(search.toLowerCase()) ||
      (r.origin?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.destination?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || getRequestStatusGroup(r.status) === statusFilter;
    
    return matchSearch && matchStatus;
  });

  const handleExportCSV = () => {
    const headers = [
      "Request code",
      "Request ID",
      "Origin",
      "Origin country/region",
      "Destination",
      "Destination country/region",
      "Scheduled departure date (ISO 8601)",
      "Scheduled arrival date (ISO 8601)",
      "Horse count",
      "Horses (name and microchip)",
      "Estimated amount",
      "Currency",
      "Status",
      "Special requirements",
      "Created at (UTC)",
      "Updated at (UTC)",
    ];
    const rows = filtered.map((r) => [
        requestCode(r.requestId),
        r.requestId,
        r.origin?.name ?? "",
        r.origin?.countryCode ?? "",
        r.destination?.name ?? "",
        r.destination?.countryCode ?? "",
        r.scheduledDepartureDate ?? "",
        r.scheduledArrivalDate ?? "",
        r.horses?.length ?? 0,
        (r.horses ?? []).map((horse) => `${horse.name}${horse.microchipId ? ` (${horse.microchipId})` : ""}`).join("; "),
        r.estimatedAmount ?? "",
        r.currency,
        translateStatus(r.status),
        r.specialRequirements ?? "",
        r.createdAt,
        r.updatedAt,
      ]);
    exportToCSV(`equideli-yeu-cau-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast({ title: "Đã xuất CSV", description: `${rows.length} yêu cầu đã được tải xuống.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu vận chuyển"
        description="Tạo và theo dõi đơn vận chuyển ngựa đua"
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0} className="gap-1.5"><Download className="h-4 w-4" /> <span className="hidden sm:inline">Xuất CSV</span></Button>
            <Button onClick={() => navigate("request-create")} className="gap-2"><Plus className="h-4 w-4" /> Tạo yêu cầu</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Tìm kiếm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      </div>

      {/* Stats overview */}
      <ListStatsBar
        total={requests.length}
        filtered={filtered.length}
        stats={[
          { label: "Đang chờ duyệt", value: counts.PENDING, tone: "warning" },
          { label: "Đã phê duyệt", value: counts.APPROVED, tone: "success" },
          { label: "Từ chối", value: counts.REJECTED, tone: "danger" },
          { label: "Đã hủy", value: counts.CANCELLED, tone: "neutral" },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState illustration="empty-list" title="Không tìm thấy đơn nào" description="Bạn chưa có yêu cầu vận chuyển nào ở trạng thái này." action={<Button size="sm" onClick={() => navigate("request-create")} className="gap-1"><Plus className="h-4 w-4" /> Tạo yêu cầu ngay</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const rId = r.requestId;
            return (
              <button key={rId} onClick={() => navigate("request-detail", { id: rId })} className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-6 w-6" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">Đơn {requestCode(rId)}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.origin?.name || "Chưa xác định"} → {r.destination?.name || "Chưa xác định"}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(r.scheduledDepartureDate)}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{r.horses?.length ?? 0} ngựa</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={transportRequestStatusLabel(r.status)} />
                  {r.estimatedAmount != null && <span className="text-xs font-semibold text-foreground">{formatMoney(r.estimatedAmount, r.currency)}</span>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}