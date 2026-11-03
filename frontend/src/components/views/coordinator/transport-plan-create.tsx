"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { requestCode } from "@/lib/constants";
import { PageHeader } from "@/components/app/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Route } from "lucide-react";

interface ApprovedRequest {
  requestId: string;
  customerName: string;
  origin: { name: string };
  destination: { name: string };
}

interface TransportPlan {
  planId: string;
}

export function TransportPlanCreate() {
  const { navigate } = useAppStore();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApprovedRequest[]>([]);
  const [requestId, setRequestId] = useState("");
  const [routeDetails, setRouteDetails] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRequests(await apiGet<ApprovedRequest[]>("/transport-requests?status=APPROVED"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải yêu cầu đã phê duyệt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestId || !departureTime || !arrivalTime || arrivalTime <= departureTime) {
      toast({ title: "Thông tin kế hoạch không hợp lệ", description: "Chọn yêu cầu và đảm bảo thời gian đến sau thời gian khởi hành.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const plan = await apiPost<TransportPlan>("/transport-plans", {
        requestId,
        routeDetails: routeDetails.trim() || undefined,
        departureTime,
        arrivalTime,
      });
      toast({ title: "Đã tạo kế hoạch vận chuyển." });
      navigate("plan-detail", { id: plan.planId });
    } catch (e) {
      toast({ title: "Không thể tạo kế hoạch", description: e instanceof Error ? e.message : "Yêu cầu không thành công.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo kế hoạch vận chuyển"
        description="Lập kế hoạch vận chuyển, thiết lập lộ trình và thời gian dự kiến cho đơn hàng."
        icon={<Route className="h-5 w-5" />}
        actions={<Button variant="outline" onClick={() => navigate("plans")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Quay lại</Button>}
      />
      {requests.length === 0 ? (
        <EmptyState title="Không có yêu cầu đã phê duyệt" description="Chỉ có thể tạo kế hoạch cho yêu cầu đã được phê duyệt." />
      ) : (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-request">Yêu cầu vận chuyển *</Label>
                <select id="plan-request" value={requestId} onChange={(event) => setRequestId(event.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Chọn yêu cầu đã phê duyệt</option>
                  {requests.map((request) => (
                    <option key={request.requestId} value={request.requestId}>
                      {request.customerName} · {request.origin?.name || "Chưa xác định"} → {request.destination?.name || "Chưa xác định"} · {requestCode(request.requestId)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-route">Mô tả lộ trình</Label>
                <Input id="plan-route" value={routeDetails} onChange={(event) => setRouteDetails(event.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-departure">Thời gian khởi hành *</Label>
                  <Input id="plan-departure" type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-arrival">Thời gian đến *</Label>
                  <Input id="plan-arrival" type="datetime-local" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>{saving ? "Đang tạo..." : "Tạo kế hoạch"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
