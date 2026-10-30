"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { requestCode, transportRequestStatusLabel } from "@/lib/constants";
import { PageHeader } from "@/components/app/page-header";
import { HorseImage } from "@/components/app/horse-image";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, Heart, Loader2, MapPin, Plus } from "lucide-react";

interface HorseOption {
  horseId: string;
  name: string;
  microchipId: string;
  gender: string;
  imageUrl?: string | null;
}

interface LocationOption {
  locationId: string;
  name: string;
  countryCode: string;
}

interface PricingCatalogItem {
  code: string;
  name: string;
  category: string;
  unitPriceUsd: number;
}

interface CreatedRequest {
  requestId: string;
  status: string;
}

export function RequestCreate() {
  const { navigate } = useAppStore();
  const { toast } = useToast();
  const [horses, setHorses] = useState<HorseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [pricingPackages, setPricingPackages] = useState<PricingCatalogItem[]>([]);
  const [selectedPackageCode, setSelectedPackageCode] = useState<string>("STANDARD_TRANSPORT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    horseIds: [] as string[],
    originLocationId: "",
    destinationLocationId: "",
    scheduledDepartureDate: "",
    scheduledArrivalDate: "",
    specialRequirements: "",
    currency: "USD",
  });

  useEffect(() => {
    (async () => {
      try {
        const [horseRecords, locationRecords, pricingRecords] = await Promise.all([
          apiGet<HorseOption[]>("/horses/my-horses"),
          apiGet<LocationOption[]>("/locations"),
          apiGet<PricingCatalogItem[]>("/pricing/catalog").catch(() => [] as PricingCatalogItem[]),
        ]);
        setHorses(horseRecords);
        setLocations(locationRecords);
        const pkgs = (pricingRecords || []).filter((p) => p.category === "PACKAGE");
        setPricingPackages(pkgs);
        if (pkgs.length > 0 && !pkgs.some((p) => p.code === selectedPackageCode)) {
          setSelectedPackageCode(pkgs[0].code);
        }
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải hồ sơ ngựa và địa điểm.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleHorse = (horseId: string) => {
    setForm((current) => ({
      ...current,
      horseIds: current.horseIds.includes(horseId)
        ? current.horseIds.filter((id) => id !== horseId)
        : [...current.horseIds, horseId],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.horseIds.length === 0) {
      toast({ title: "Chưa chọn ngựa", description: "Chọn ít nhất một hồ sơ ngựa thuộc tài khoản của bạn.", variant: "destructive" });
      return;
    }
    if (form.originLocationId === form.destinationLocationId) {
      toast({ title: "Tuyến không hợp lệ", description: "Điểm đi và điểm đến phải khác nhau.", variant: "destructive" });
      return;
    }
    if (form.scheduledArrivalDate < form.scheduledDepartureDate) {
      toast({ title: "Ngày đến không hợp lệ", description: "Ngày đến phải cùng hoặc sau ngày khởi hành.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiPost<CreatedRequest>("/transport-requests", {
        originLocationId: form.originLocationId,
        destinationLocationId: form.destinationLocationId,
        scheduledDepartureDate: form.scheduledDepartureDate,
        scheduledArrivalDate: form.scheduledArrivalDate,
        horseIds: form.horseIds,
        specialRequirements: form.specialRequirements.trim() || null,
        currency: form.currency,
        pricingSelection: {
          packageCode: selectedPackageCode || "STANDARD_TRANSPORT",
          serviceCodes: [],
        },
        stallConfigurations: form.horseIds.map((horseId) => ({
          horseId,
          size: "MEDIUM",
        })),
      });
      if (!created.requestId) {
        throw new Error("Response không có requestId theo hợp đồng API.");
      }
      toast({ title: "Đã tạo yêu cầu", description: `${requestCode(created.requestId)} · ${transportRequestStatusLabel(created.status)}` });
      navigate("request-detail", { id: created.requestId });
    } catch (submitError: unknown) {
      toast({
        title: "Tạo yêu cầu thất bại",
        description: submitError instanceof Error ? submitError.message : "Yêu cầu không thành công.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo yêu cầu vận chuyển"
        description="Nhập đầy đủ thông tin để tạo yêu cầu vận chuyển mới."
        icon={<Plus className="h-5 w-5" />}
        actions={<Button variant="outline" size="sm" onClick={() => navigate("requests")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Quay lại</Button>}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Heart className="h-4 w-4" /> Chọn ngựa vận chuyển *</CardTitle></CardHeader>
            <CardContent>
              {horses.length === 0 ? (
                <EmptyState title="Chưa có hồ sơ ngựa" description="Tạo hồ sơ ngựa trước khi gửi yêu cầu." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {horses.map((horse) => {
                    const checked = form.horseIds.includes(horse.horseId);
                    return (
                      <label key={horse.horseId} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleHorse(horse.horseId)} />
                        <HorseImage src={horse.imageUrl} name={horse.name} className="h-12 w-12 shrink-0 rounded-md" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{horse.name}</p>
                          <p className="text-xs text-muted-foreground">{horse.microchipId || "Không có chip"} · {horse.gender || "Chưa khai báo giới tính"}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Tuyến vận chuyển *</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="request-origin">Điểm đi</Label>
                  <select id="request-origin" required value={form.originLocationId} onChange={(event) => setForm({ ...form, originLocationId: event.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— Chọn điểm đi —</option>
                    {locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.name} ({location.countryCode})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-destination">Điểm đến</Label>
                  <select id="request-destination" required value={form.destinationLocationId} onChange={(event) => setForm({ ...form, destinationLocationId: event.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— Chọn điểm đến —</option>
                    {locations.map((location) => <option key={location.locationId} value={location.locationId}>{location.name} ({location.countryCode})</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Thời gian dự kiến *</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="request-departure">Ngày khởi hành</Label>
                  <Input id="request-departure" type="date" required value={form.scheduledDepartureDate} onChange={(event) => setForm({ ...form, scheduledDepartureDate: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-arrival">Ngày đến</Label>
                  <Input id="request-arrival" type="date" required value={form.scheduledArrivalDate} onChange={(event) => setForm({ ...form, scheduledArrivalDate: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-package">Gói vận chuyển *</Label>
                  <select
                    id="request-package"
                    required
                    value={selectedPackageCode}
                    onChange={(event) => setSelectedPackageCode(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {pricingPackages.length === 0 ? (
                      <option value="STANDARD_TRANSPORT">Vận chuyển tiêu chuẩn (STANDARD_TRANSPORT)</option>
                    ) : (
                      pricingPackages.map((pkg) => (
                        <option key={pkg.code} value={pkg.code}>
                          {pkg.name} (${pkg.unitPriceUsd?.toLocaleString()})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-currency">Loại tiền</Label>
                  <Input id="request-currency" value={form.currency} readOnly />
                  <p className="text-xs text-muted-foreground">Báo giá mới được tính bằng USD.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Yêu cầu đặc biệt</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea maxLength={4000} value={form.specialRequirements} onChange={(event) => setForm({ ...form, specialRequirements: event.target.value })} placeholder="Thông tin cần lưu ý về vận chuyển..." rows={3} />
            <p className="text-xs text-muted-foreground">
              API hiện chưa lưu tên giải đấu, deadline riêng, lựa chọn chuồng hoặc checklist tài liệu theo yêu cầu. Tài liệu có thể nộp sau khi tạo, tại trang chi tiết.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => navigate("requests")}>Hủy</Button>
          <Button type="submit" disabled={submitting || horses.length === 0} className="gap-2">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo...</> : <><Plus className="h-4 w-4" /> Gửi yêu cầu</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
