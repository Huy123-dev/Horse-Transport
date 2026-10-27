"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { HorseImage } from "@/components/app/horse-image";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Search, Calendar, ChevronRight } from "lucide-react";
import { formatDate, inspectionCode, inspectionStatusLabel, requestCode } from "@/lib/constants";

interface InspectionRecord {
  inspectionId: string;
  requestId: string;
  horseId: string;
  horseName: string;
  horseImageUrl: string | null;
  agencyName: string;
  status: string;
  remarks: string | null;
  specialistName: string | null;
  updatedAt: string;
}

export function InspectionList() {
  const { navigate } = useAppStore();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try { setInspections(await apiGet<InspectionRecord[]>("/inspections")); }
      catch (e) { setError(e instanceof Error ? e.message : "Không thể tải hồ sơ kiểm định."); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const filtered = inspections.filter((inspection) =>
    !search ||
    inspection.horseName.toLowerCase().includes(search.toLowerCase()) ||
    inspection.agencyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Hồ sơ kiểm định" description="Theo dõi tiến độ hồ sơ và kết quả kiểm định của các yêu cầu vận chuyển." icon={<ClipboardCheck className="h-5 w-5" />}
        actions={<div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="pl-9" /></div>}
      />
      {filtered.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Không có bản ghi kiểm định" />
      ) : (
        <div className="space-y-3">
          {filtered.map((inspection) => (
            <button key={inspection.inspectionId} onClick={() => navigate("inspection-detail", { id: inspection.inspectionId })} className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
              <HorseImage src={inspection.horseImageUrl} name={inspection.horseName} className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{inspectionCode(inspection.inspectionId)} · {inspection.horseName} · {inspection.agencyName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Yêu cầu {requestCode(inspection.requestId)}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(inspection.updatedAt)}</span>
                  <span>{inspection.specialistName || "Chưa phân công chuyên viên"}</span>
                  {inspection.remarks && <span>{inspection.remarks}</span>}
                </div>
              </div>
              <StatusBadge status={inspectionStatusLabel(inspection.status)} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
