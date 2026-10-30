"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { ErrorState, LoadingState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/constants";
import {
  pricingUnitLabel,
  type PricingCatalogItem,
  type PricingUnit,
  type StallPricingConfig,
} from "@/lib/pricing-types";
import { AlertTriangle, Box, DollarSign, Layers, Package, Save } from "lucide-react";

interface CatalogDraft {
  unitType: PricingUnit | "";
  priceUsd: string;
  benefits: string;
  required: boolean;
  includedServiceCodes: string[];
}

interface StallPricingDraft {
  basePriceSmall: string;
  mediumMultiplier: string;
  largeMultiplier: string;
  extraLargeMultiplier: string;
  smallLengthMeters: string;
  smallWidthMeters: string;
  mediumLengthMeters: string;
  mediumWidthMeters: string;
  largeLengthMeters: string;
  largeWidthMeters: string;
  extraLargeLengthMeters: string;
  extraLargeWidthMeters: string;
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

function isPackageDraftDirty(original: PricingCatalogItem | undefined, draft: CatalogDraft | undefined): boolean {
  if (!original || !draft) return false;
  const originalDraft = toDraft(original);
  return (
    draft.unitType !== originalDraft.unitType ||
    draft.priceUsd.trim() !== originalDraft.priceUsd.trim() ||
    draft.benefits.trim() !== originalDraft.benefits.trim() ||
    draft.required !== originalDraft.required ||
    JSON.stringify([...draft.includedServiceCodes].sort()) !==
      JSON.stringify([...originalDraft.includedServiceCodes].sort())
  );
}

export function PricingCatalogView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("packages");
  const [items, setItems] = useState<PricingCatalogItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CatalogDraft>>({});
  const [stallConfig, setStallConfig] = useState<StallPricingConfig | null>(null);
  const [stallDraft, setStallDraft] = useState<StallPricingDraft>({
    basePriceSmall: "100.00",
    mediumMultiplier: "1.50",
    largeMultiplier: "2.00",
    extraLargeMultiplier: "1.50",
    smallLengthMeters: "2.30",
    smallWidthMeters: "1.00",
    mediumLengthMeters: "2.80",
    mediumWidthMeters: "1.20",
    largeLengthMeters: "3.65",
    largeWidthMeters: "3.65",
    extraLargeLengthMeters: "4.25",
    extraLargeWidthMeters: "3.65",
  });
  const [selectedPackageCode, setSelectedPackageCode] = useState<string>("BASIC_TRANSPORT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [savingStall, setSavingStall] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const catalog = await apiGet<PricingCatalogItem[]>("/pricing/catalog");
      setItems(catalog);
      setDrafts(Object.fromEntries(catalog.map((item) => [item.code, toDraft(item)])));
      const firstPkg = catalog.find((i) => i.category === "PACKAGE");
      if (firstPkg) setSelectedPackageCode(firstPkg.code);

      try {
        const stall = await apiGet<StallPricingConfig>("/pricing/stalls");
        setStallConfig(stall);
        setStallDraft({
          basePriceSmall: stall.basePriceSmall != null ? String(stall.basePriceSmall) : "100.00",
          mediumMultiplier: stall.mediumMultiplier != null ? String(stall.mediumMultiplier) : "1.50",
          largeMultiplier: stall.largeMultiplier != null ? String(stall.largeMultiplier) : "2.00",
          extraLargeMultiplier: stall.extraLargeMultiplier != null ? String(stall.extraLargeMultiplier) : "1.50",
          smallLengthMeters: stall.small?.lengthMeters != null ? String(stall.small.lengthMeters) : "2.30",
          smallWidthMeters: stall.small?.widthMeters != null ? String(stall.small.widthMeters) : "1.00",
          mediumLengthMeters: stall.medium?.lengthMeters != null ? String(stall.medium.lengthMeters) : "2.80",
          mediumWidthMeters: stall.medium?.widthMeters != null ? String(stall.medium.widthMeters) : "1.20",
          largeLengthMeters: stall.large?.lengthMeters != null ? String(stall.large.lengthMeters) : "3.65",
          largeWidthMeters: stall.large?.widthMeters != null ? String(stall.large.widthMeters) : "3.65",
          extraLargeLengthMeters: stall.extraLarge?.lengthMeters != null ? String(stall.extraLarge.lengthMeters) : "4.25",
          extraLargeWidthMeters: stall.extraLarge?.widthMeters != null ? String(stall.extraLarge.widthMeters) : "3.65",
        });
      } catch (stallErr) {
        console.warn("Could not load stall pricing", stallErr);
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu bảng giá.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const updateDraft = (code: string, update: Partial<CatalogDraft>) => {
    setDrafts((current) => ({
      ...current,
      [code]: { ...current[code], ...update },
    }));
  };

  const handlePackageChange = (newCode: string) => {
    if (newCode === selectedPackageCode) return;
    const currentPkg = items.find((i) => i.code === selectedPackageCode);
    const currentDraft = drafts[selectedPackageCode];
    if (isPackageDraftDirty(currentPkg, currentDraft)) {
      const confirmSwitch = window.confirm(
        "Gói hiện tại có thay đổi chưa lưu. Bạn có chắc muốn chuyển sang gói khác mà không lưu thay đổi?",
      );
      if (!confirmSwitch) return;
      if (currentPkg) {
        setDrafts((current) => ({ ...current, [currentPkg.code]: toDraft(currentPkg) }));
      }
    }
    setSelectedPackageCode(newCode);
  };

  const saveCatalogItem = async (item: PricingCatalogItem) => {
    const draft = drafts[item.code];
    if (!draft) return;
    const parsedPrice = draft.priceUsd.trim() === "" ? null : Number(draft.priceUsd);
    if (
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0 || !/^\d{1,10}(\.\d{1,2})?$/.test(draft.priceUsd.trim()))
    ) {
      toast({
        title: "Giá không hợp lệ",
        description: "Nhập giá USD không âm, tối đa 2 chữ số thập phân; nhập 0 để cấu hình miễn phí.",
        variant: "destructive",
      });
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
      setItems((current) => current.map((candidate) => (candidate.code === item.code ? updated : candidate)));
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

  const saveStallPricing = async () => {
    const base = Number(stallDraft.basePriceSmall);
    const medMult = Number(stallDraft.mediumMultiplier);
    const lgMult = Number(stallDraft.largeMultiplier);
    const xlMult = Number(stallDraft.extraLargeMultiplier);

    if (!Number.isFinite(base) || base < 0) {
      toast({ title: "Giá không hợp lệ", description: "Base price chuồng Small phải là số >= 0.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(medMult) || medMult <= 0 || !Number.isFinite(lgMult) || lgMult <= 0 || !Number.isFinite(xlMult) || xlMult <= 0) {
      toast({ title: "Hệ số không hợp lệ", description: "Các hệ số giá phải lớn hơn 0.", variant: "destructive" });
      return;
    }

    setSavingStall(true);
    try {
      const updated = await apiPut<StallPricingConfig>("/pricing/stalls", {
        basePriceSmall: base,
        mediumMultiplier: medMult,
        largeMultiplier: lgMult,
        extraLargeMultiplier: xlMult,
        smallLengthMeters: Number(stallDraft.smallLengthMeters) || 2.3,
        smallWidthMeters: Number(stallDraft.smallWidthMeters) || 1.0,
        mediumLengthMeters: Number(stallDraft.mediumLengthMeters) || 2.8,
        mediumWidthMeters: Number(stallDraft.mediumWidthMeters) || 1.2,
        largeLengthMeters: Number(stallDraft.largeLengthMeters) || 3.65,
        largeWidthMeters: Number(stallDraft.largeWidthMeters) || 3.65,
        extraLargeLengthMeters: Number(stallDraft.extraLargeLengthMeters) || 4.25,
        extraLargeWidthMeters: Number(stallDraft.extraLargeWidthMeters) || 3.65,
        active: true,
      });
      setStallConfig(updated);
      toast({ title: "Đã lưu cấu hình giá kích thước chuồng", description: "Các đơn báo giá mới sẽ áp dụng biểu giá này." });
    } catch (cause: unknown) {
      toast({
        title: "Không thể lưu giá chuồng",
        description: cause instanceof Error ? cause.message : "Cập nhật thất bại.",
        variant: "destructive",
      });
    } finally {
      setSavingStall(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  const packages = items.filter((item) => item.category === "PACKAGE");
  const services = items.filter((item) => item.category === "SERVICE");
  const currentPackage = packages.find((item) => item.code === selectedPackageCode) || packages[0];
  const currentPackageDraft = currentPackage ? drafts[currentPackage.code] : undefined;

  // Live preview calculation for stall pricing
  const baseVal = Number(stallDraft.basePriceSmall) || 0;
  const medMultVal = Number(stallDraft.mediumMultiplier) || 0;
  const lgMultVal = Number(stallDraft.largeMultiplier) || 0;
  const xlMultVal = Number(stallDraft.extraLargeMultiplier) || 0;

  const calcSmall = Math.round(baseVal * 100) / 100;
  const calcMed = Math.round(calcSmall * medMultVal * 100) / 100;
  const calcLg = Math.round(calcMed * lgMultVal * 100) / 100;
  const calcXl = Math.round(calcLg * xlMultVal * 100) / 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng giá & Cấu hình chi phí"
        description="Quản lý giá gói vận chuyển, dịch vụ tùy chọn và giá kích thước chuồng theo hệ số."
        icon={<DollarSign className="h-5 w-5" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="packages" className="gap-2">
            <Layers className="h-4 w-4" /> Giá gói & Dịch vụ
          </TabsTrigger>
          <TabsTrigger value="stalls" className="gap-2">
            <Box className="h-4 w-4" /> Giá kích thước chuồng
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GÓI & DỊCH VỤ */}
        <TabsContent value="packages" className="space-y-6">
          <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)]/30 p-4 text-sm">
            Giá chưa cấu hình được lưu là trống và hiển thị “Chưa có”; nhập 0 để cấu hình miễn phí. Báo giá đã được xác nhận sẽ tạo snapshot riêng, thay đổi catalog không làm thay đổi các đơn lịch sử.
          </div>

          {/* Section: Dropdown chọn gói vận chuyển */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-primary" /> Gói vận chuyển chính
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Chọn một gói từ danh sách bên dưới để xem và chỉnh sửa thông tin chi tiết.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="package-selector" className="whitespace-nowrap text-sm font-medium">
                    Chọn gói cần chỉnh sửa:
                  </Label>
                  <select
                    id="package-selector"
                    value={selectedPackageCode}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="flex h-10 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.code} value={pkg.code}>
                        {pkg.name} ({pkg.priceUsd != null ? `$${pkg.priceUsd}` : "Chưa có giá"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            {currentPackage && currentPackageDraft && (
              <CardContent className="grid gap-4 border-t border-border pt-5 md:grid-cols-2">
                <div className="flex items-center justify-between md:col-span-2">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{currentPackage.name}</h3>
                    <p className="text-xs text-muted-foreground">Mã hệ thống: {currentPackage.code}</p>
                  </div>
                  <Badge variant="default">Gói bắt buộc chọn một</Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`price-${currentPackage.code}`}>Giá gói (USD) *</Label>
                  <Input
                    id={`price-${currentPackage.code}`}
                    inputMode="decimal"
                    placeholder="Chưa có"
                    value={currentPackageDraft.priceUsd}
                    onChange={(event) => updateDraft(currentPackage.code, { priceUsd: event.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {currentPackageDraft.priceUsd.trim() === ""
                      ? "Chưa có"
                      : Number.isFinite(Number(currentPackageDraft.priceUsd))
                        ? formatMoney(Number(currentPackageDraft.priceUsd), "USD")
                        : "Giá chưa hợp lệ"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`unit-${currentPackage.code}`}>Đơn vị tính *</Label>
                  <select
                    id={`unit-${currentPackage.code}`}
                    value={currentPackageDraft.unitType}
                    onChange={(event) =>
                      updateDraft(currentPackage.code, { unitType: event.target.value as PricingUnit | "" })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Chưa có</option>
                    <option value="PER_HORSE">Mỗi ngựa</option>
                    <option value="PER_REQUEST">Mỗi yêu cầu</option>
                    <option value="PER_TRIP">Mỗi chuyến</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Hiện tại: {pricingUnitLabel(currentPackage.unitType)}</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`benefits-${currentPackage.code}`}>Quyền lợi / Mô tả chi tiết</Label>
                  <Textarea
                    id={`benefits-${currentPackage.code}`}
                    maxLength={2000}
                    rows={3}
                    value={currentPackageDraft.benefits}
                    onChange={(event) => updateDraft(currentPackage.code, { benefits: event.target.value })}
                    placeholder="Nhập mô tả quyền lợi của gói..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Dịch vụ đã được bao gồm sẵn trong gói</Label>
                  <p className="text-xs text-muted-foreground">
                    Các dịch vụ được đánh dấu sẽ tự động tính $0 khi khách hàng chọn gói này.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {services.map((service) => (
                      <label key={service.code} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted/50">
                        <Checkbox
                          checked={currentPackageDraft.includedServiceCodes.includes(service.code)}
                          onCheckedChange={(checked) => {
                            const next =
                              checked === true
                                ? [...currentPackageDraft.includedServiceCodes, service.code]
                                : currentPackageDraft.includedServiceCodes.filter((code) => code !== service.code);
                            updateDraft(currentPackage.code, { includedServiceCodes: next });
                          }}
                        />
                        <span>{service.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border pt-4 md:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    {currentPackage.priceConfigured && currentPackage.unitConfigured
                      ? "✓ Đã đầy đủ giá và đơn vị tính"
                      : "⚠ Chưa đủ giá hoặc đơn vị tính"}
                  </p>
                  <Button
                    onClick={() => void saveCatalogItem(currentPackage)}
                    disabled={savingCode !== null}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingCode === currentPackage.code ? "Đang lưu..." : `Lưu ${currentPackage.name}`}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section: Dịch vụ bổ sung */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Dịch vụ bổ sung</h3>
              <p className="text-xs text-muted-foreground">Cấu hình giá và đơn vị tính cho các dịch vụ tùy chọn hoặc bắt buộc.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => {
                const draft = drafts[service.code];
                if (!draft) return null;
                return (
                  <Card key={service.code}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{service.name}</CardTitle>
                        <Badge variant={draft.required ? "default" : "secondary"}>
                          {draft.required ? "Bắt buộc" : "Tùy chọn"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{service.code}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`svc-price-${service.code}`}>Giá (USD)</Label>
                          <Input
                            id={`svc-price-${service.code}`}
                            inputMode="decimal"
                            placeholder="Chưa có"
                            value={draft.priceUsd}
                            onChange={(e) => updateDraft(service.code, { priceUsd: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`svc-unit-${service.code}`}>Đơn vị tính</Label>
                          <select
                            id={`svc-unit-${service.code}`}
                            value={draft.unitType}
                            onChange={(e) => updateDraft(service.code, { unitType: e.target.value as PricingUnit | "" })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Chưa có</option>
                            <option value="PER_HORSE">Mỗi ngựa</option>
                            <option value="PER_REQUEST">Mỗi yêu cầu</option>
                            <option value="PER_TRIP">Mỗi chuyến</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`svc-benefits-${service.code}`}>Quyền lợi / mô tả</Label>
                        <Input
                          id={`svc-benefits-${service.code}`}
                          maxLength={2000}
                          value={draft.benefits}
                          onChange={(e) => updateDraft(service.code, { benefits: e.target.value })}
                          placeholder="Mô tả dịch vụ..."
                        />
                      </div>

                      <label className="flex items-center gap-2 pt-1 text-sm">
                        <Checkbox
                          checked={draft.required}
                          onCheckedChange={(checked) => updateDraft(service.code, { required: checked === true })}
                        />
                        <span>Dịch vụ bắt buộc trong mọi yêu cầu</span>
                      </label>

                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <span className="text-xs text-muted-foreground">
                          {service.priceConfigured && service.unitConfigured ? "✓ Đầy đủ" : "⚠ Thiếu giá/đơn vị"}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => void saveCatalogItem(service)}
                          disabled={savingCode !== null}
                          className="gap-1.5"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingCode === service.code ? "Đang lưu..." : "Lưu"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: GIÁ KÍCH THƯỚC CHUỒNG */}
        <TabsContent value="stalls" className="space-y-6">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-primary">Cơ chế định giá kích thước chuồng theo hệ số (Multiplier Pricing)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Giá chuồng được tính lũy tiến: <strong>Small = Base price</strong>;{" "}
              <strong>Medium = Small × Hệ số Medium</strong>; <strong>Large = Medium × Hệ số Large</strong>;{" "}
              <strong>Extra Large = Large × Hệ số XL</strong>.
              Khi khách hàng gửi yêu cầu, chi phí chuồng được tính tự động và snapshot cố định khi duyệt báo giá.
            </p>
          </div>

          {/* Cards xem trước giá và kích thước vật lý */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Cơ bản</Badge>
                  <span className="text-xs text-muted-foreground">Base</span>
                </div>
                <h4 className="text-base font-bold">Nhỏ (Small)</h4>
                <p className="text-2xl font-extrabold text-primary">{formatMoney(calcSmall, "USD")}</p>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Kích thước: <strong>{stallDraft.smallLengthMeters} × {stallDraft.smallWidthMeters} m</strong>
                </div>
                <p className="text-[11px] text-muted-foreground">Phù hợp: Ngựa &lt; 450kg &amp; &lt; 155cm</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Tiêu chuẩn</Badge>
                  <span className="text-xs text-muted-foreground">× {stallDraft.mediumMultiplier}</span>
                </div>
                <h4 className="text-base font-bold">Tiêu chuẩn (Medium)</h4>
                <p className="text-2xl font-extrabold text-primary">{formatMoney(calcMed, "USD")}</p>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Kích thước: <strong>{stallDraft.mediumLengthMeters} × {stallDraft.mediumWidthMeters} m</strong>
                </div>
                <p className="text-[11px] text-muted-foreground">Phù hợp: Ngựa 450-520kg &amp; 155-165cm</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Rộng rãi</Badge>
                  <span className="text-xs text-muted-foreground">× {stallDraft.largeMultiplier}</span>
                </div>
                <h4 className="text-base font-bold">Lớn (Large)</h4>
                <p className="text-2xl font-extrabold text-primary">{formatMoney(calcLg, "USD")}</p>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Kích thước: <strong>{stallDraft.largeLengthMeters} × {stallDraft.largeWidthMeters} m</strong>
                </div>
                <p className="text-[11px] text-muted-foreground">Phù hợp: Ngựa 520-600kg &amp; 165-175cm</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="default">Khoang VIP</Badge>
                  <span className="text-xs text-muted-foreground">× {stallDraft.extraLargeMultiplier}</span>
                </div>
                <h4 className="text-base font-bold">Rất lớn (Extra Large)</h4>
                <p className="text-2xl font-extrabold text-primary">{formatMoney(calcXl, "USD")}</p>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Kích thước: <strong>{stallDraft.extraLargeLengthMeters} × {stallDraft.extraLargeWidthMeters} m</strong>
                </div>
                <p className="text-[11px] text-muted-foreground">Phù hợp: Ngựa &gt; 600kg hoặc &gt; 175cm</p>
              </CardContent>
            </Card>
          </div>

          {/* Form cấu hình giá và hệ số */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cấu hình giá cơ sở và hệ số nhân</CardTitle>
              <CardDescription>
                Thay đổi giá cơ sở Small và các hệ số lũy tiến. Hệ thống sẽ tự động tính giá cho các kích thước còn lại.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="base-small">Giá cơ sở Small (USD) *</Label>
                  <Input
                    id="base-small"
                    inputMode="decimal"
                    value={stallDraft.basePriceSmall}
                    onChange={(e) => setStallDraft({ ...stallDraft, basePriceSmall: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Giá cho chuồng Small cơ bản</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mult-medium">Hệ số Medium *</Label>
                  <Input
                    id="mult-medium"
                    inputMode="decimal"
                    value={stallDraft.mediumMultiplier}
                    onChange={(e) => setStallDraft({ ...stallDraft, mediumMultiplier: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Nhân với giá Small (hiện tại: ×{stallDraft.mediumMultiplier})</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mult-large">Hệ số Large *</Label>
                  <Input
                    id="mult-large"
                    inputMode="decimal"
                    value={stallDraft.largeMultiplier}
                    onChange={(e) => setStallDraft({ ...stallDraft, largeMultiplier: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Nhân với giá Medium (hiện tại: ×{stallDraft.largeMultiplier})</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mult-xl">Hệ số Extra Large *</Label>
                  <Input
                    id="mult-xl"
                    inputMode="decimal"
                    value={stallDraft.extraLargeMultiplier}
                    onChange={(e) => setStallDraft({ ...stallDraft, extraLargeMultiplier: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Nhân với giá Large (hiện tại: ×{stallDraft.extraLargeMultiplier})</p>
                </div>
              </div>

              {/* Kích thước vật lý */}
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground">Kích thước chuẩn vật lý (Dài × Rộng m)</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="small-l" className="text-xs">Small Dài (m)</Label>
                      <Input id="small-l" value={stallDraft.smallLengthMeters} onChange={(e) => setStallDraft({ ...stallDraft, smallLengthMeters: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="small-w" className="text-xs">Small Rộng (m)</Label>
                      <Input id="small-w" value={stallDraft.smallWidthMeters} onChange={(e) => setStallDraft({ ...stallDraft, smallWidthMeters: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="med-l" className="text-xs">Medium Dài (m)</Label>
                      <Input id="med-l" value={stallDraft.mediumLengthMeters} onChange={(e) => setStallDraft({ ...stallDraft, mediumLengthMeters: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="med-w" className="text-xs">Medium Rộng (m)</Label>
                      <Input id="med-w" value={stallDraft.mediumWidthMeters} onChange={(e) => setStallDraft({ ...stallDraft, mediumWidthMeters: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="large-l" className="text-xs">Large Dài (m)</Label>
                      <Input id="large-l" value={stallDraft.largeLengthMeters} onChange={(e) => setStallDraft({ ...stallDraft, largeLengthMeters: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="large-w" className="text-xs">Large Rộng (m)</Label>
                      <Input id="large-w" value={stallDraft.largeWidthMeters} onChange={(e) => setStallDraft({ ...stallDraft, largeWidthMeters: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="xl-l" className="text-xs">XL Dài (m)</Label>
                      <Input id="xl-l" value={stallDraft.extraLargeLengthMeters} onChange={(e) => setStallDraft({ ...stallDraft, extraLargeLengthMeters: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="xl-w" className="text-xs">XL Rộng (m)</Label>
                      <Input id="xl-w" value={stallDraft.extraLargeWidthMeters} onChange={(e) => setStallDraft({ ...stallDraft, extraLargeWidthMeters: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  Cập nhật lần cuối: {stallConfig?.updatedAt ? new Date(stallConfig.updatedAt).toLocaleString("vi-VN") : "Mặc định"}
                </span>
                <Button onClick={() => void saveStallPricing()} disabled={savingStall} className="gap-2">
                  <Save className="h-4 w-4" />
                  {savingStall ? "Đang lưu..." : "Lưu cấu hình giá chuồng"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
