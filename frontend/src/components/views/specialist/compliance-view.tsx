"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Plus, CheckCircle2, AlertTriangle, FlaskConical, Calendar } from "lucide-react";
import { formatDate, requestCode } from "@/lib/constants";

export function ComplianceView() {
  const { navigate } = useAppStore();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [complianceMap, setComplianceMap] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      try {
        const d = await apiGet("/transport-requests");
        const active = d.requests.filter((r: any) => ["Đã phê duyệt", "Đang thẩm định", "Đã gửi"].includes(r.status));
        setRequests(active);

        const compResults = await Promise.all(
          active.map((r: any) => apiGet(`/transport-requests/${r.requestId}/compliance`).catch(() => null))
        );
        const map: Record<string, any> = {};
        active.forEach((r: any, i: number) => { if (compResults[i]) map[r.requestId] = compResults[i]; });
        setComplianceMap(map);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Kiểm dịch & Thông quan" description="Theo dõi trạng thái kiểm dịch, thông quan và đặt chỗ cơ sở" icon={<ShieldCheck className="h-5 w-5" />} />
      {requests.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Không có đơn cần kiểm dịch" />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const comp = complianceMap[r.requestId];
            return (
              <Card key={r.requestId}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FlaskConical className="h-5 w-5" /></div>
                      <div>
                        <button onClick={() => navigate("inspection-detail", { id: r.requestId })} className="text-left">
                          <p className="text-sm font-semibold hover:underline">{r.competitionName || `Đơn ${requestCode(r.requestId)}`}</p>
                        </button>
                        <p className="text-xs text-muted-foreground">{r.origin?.name} → {r.destination?.name}</p>
                      </div>
                    </div>
                    {comp && <StatusBadge status={comp.allPassed ? "Sẵn sàng" : "Chưa đạt"} />}
                  </div>
                  {comp && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {comp.checks.map((c: any) => (
                        <div key={c.key} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                          {c.passed ? <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> : <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />}
                          <div><p className="text-xs font-medium leading-tight">{c.label}</p><p className="text-[10px] text-muted-foreground">{c.detail}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
