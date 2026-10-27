"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { ErrorState, LoadingState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/constants";
import { pricingUnitLabel, type PricingCatalogItem, type PricingUnit } from "@/lib/pricing-types";
import { DollarSign, Save } from "lucide-react";

interface CatalogDraft {
  unitType: PricingUnit | "";
  priceUsd: string;
  benefits: string;
  required: boolean;
  includedServiceCodes: string[];
}

function toDraft(item: PricingCatalogItem): CatalogDraft {
  return {
    unitType: item.unitType ?? "",
    priceUsd: item.priceUsd === null ? "" : String(item.priceUsd),
    benefits: item.benefits ?? "",
    required: item.required,
    includedServiceCodes: item.includedServiceCodes,
  };
}

export function PricingCatalogView() {
  const { toast } = useToast();
  const [items, setItems] = useState<PricingCatalogItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CatalogDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const catalog = await apiGet<PricingCatalogItem[]>("/pricing/catalog");
      setItems(catalog);
      setDrafts(Object.fromEntries(catalog.map((item) => [item.code, toDraft(item)])));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Không thể tải bảng giá.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const updateDraft = (code: string, update: Partial<CatalogDraft>) => {
    setDrafts((current) => ({
      ...current,
      [code]: { ...current[code], ...update },
    }));
  };

  const save = async (item: PricingCatalogItem) => {
    const draft = drafts[item.code];
    if (!draft) return;
    const parsedPrice = draft.priceUsd.trim() === "" ? null : Number(draft.priceUsd);
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0 || !/^\d{1,10}(\.\d{1,2})?$/.test(draft.priceUsd.trim()))) {
      toast({ title: "Giá không hợp lệ", description: "Nhập giá USD không âm, tối đa 2 chữ số thập phân; nhập 0 để cấu hình miễn phí.", variant: "destructive" });
      return;
    }

    setSavingCode(item.code);
    try {
      const updated = await apiPut<PricingCatalogItem>(`/pricing/catalog/${item.code}`, {
        unitType: draft.unitType || null,
        priceUsd: parsedPrice,
        benefits: draft.benefits.trim() || null,
        required: item.category === "PACKAGE" || draft.required,
        includedServiceCodes: item.category === "PACKAGE" ? draft.includedServiceCodes : [],
      });
      setItems((current) => current.map((candidate) => candidate.code === item.code ? updated : candidate));
      setDrafts((current) => ({ ...current, [item.code]: toDraft(updated) }));
      toast({ title: "Đã lưu cấu hình bảng giá", description: item.name });
    } catch (cause: unknown) {
      toast({
        title: "Không thể lưu bảng giá",
        description: cause instanceof Error ? cause.message : "Yêu cầu cập nhật thất bại.",
        variant: "destructive",
      });
    } finally {
      setSavingCode(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  const services = items.filter((item) => item.category === "SERVICE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng giá dịch vụ"
        description="Cấu hình giá USD, đơn vị tính, quyền lợi và dịch vụ đã bao gồm trong từng gói."
        icon={<DollarSign className="h-5 w-5" />}
      />
      <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)]/30 p-4 text-sm">
        Giá chưa cấu hình được lưu là trống và hiển thị “Chưa có”; nhập 0 để cấu hình miễn phí. Chỉ báo giá được xác nhận mới tạo snapshot, các thay đổi catalog không sửa hóa đơn hoặc báo giá lịch sử.
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const draft = drafts[item.code];
          if (!draft) return null;
          return (
            <Card key={item.code}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge variant={item.category === "PACKAGE" ? "default" : "secondary"}>
                    {item.category === "PACKAGE" ? "Gói · bắt buộc chọn một" : draft.required ? "Bắt buộc" : "Tùy chọn"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.code}</p>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`price-${item.code}`}>Giá (USD)</Label>
                  <Input
                    id={`price-${item.code}`}
                    inputMode="decimal"
                    placeholder="Chưa có"
                    value={draft.priceUsd}
                    onChange={(event) => updateDraft(item.code, { priceUsd: event.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {draft.priceUsd.trim() === ""
                      ? "Chưa có"
                      : Number.isFinite(Number(draft.priceUsd))
                        ? formatMoney(Number(draft.priceUsd), "USD")
                        : "Giá chưa hợp lệ"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`unit-${item.code}`}>Đơn vị tính</Label>
                  <select
                    id={`unit-${item.code}`}
                    value={draft.unitType}
                    onChange={(event) => updateDraft(item.code, { unitType: event.target.value as PricingUnit | "" })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Chưa có</option>
                    <option value="PER_HORSE">Mỗi ngựa</option>
                    <option value="PER_REQUEST">Mỗi yêu cầu</option>
                    <option value="PER_TRIP">Mỗi chuyến</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Hiện tại: {pricingUnitLabel(item.unitType)}</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`benefits-${item.code}`}>Quyền lợi / mô tả</Label>
                  <Textarea
                    id={`benefits-${item.code}`}
                    maxLength={2000}
                    rows={2}
                    value={draft.benefits}
                    onChange={(event) => updateDraft(item.code, { benefits: event.target.value })}
                    placeholder="Chưa cấu hình quyền lợi"
                  />
                </div>
                {item.category === "SERVICE" ? (
                  <label className="flex items-start gap-3 text-sm md:col-span-2">
                    <Checkbox
                      checked={draft.required}
                      onCheckedChange={(checked) => updateDraft(item.code, { required: checked === true })}
                    />
                    <span>Dịch vụ bắt buộc trong báo giá mới</span>
                  </label>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dịch vụ đã nằm trong gói</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {services.map((service) => (
                        <label key={service.code} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={draft.includedServiceCodes.includes(service.code)}
                            onCheckedChange={(checked) => {
                              const next = checked === true
                                ? [...draft.includedServiceCodes, service.code]
                                : draft.includedServiceCodes.filter((code) => code !== service.code);
                              updateDraft(item.code, { includedServiceCodes: next });
                            }}
                          />
                          {service.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    {item.priceConfigured && item.unitConfigured ? "Đã cấu hình giá và đơn vị" : "Chưa đủ giá hoặc đơn vị"}
                  </p>
                  <Button onClick={() => void save(item)} disabled={savingCode !== null} className="gap-2">
                    <Save className="h-4 w-4" />
                    {savingCode === item.code ? "Đang lưu..." : "Lưu"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
