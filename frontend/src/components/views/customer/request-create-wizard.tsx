"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiGet, apiPost, apiPostFormData } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { HorseImage } from "@/components/app/horse-image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Package,
  Receipt,
  Send,
  Truck,
  Upload,
  X,
  Info,
  Sparkles,
} from "lucide-react";
import { formatDate, formatMoney, transportRequestStatusLabel } from "@/lib/constants";
import {
  MAX_REQUEST_DOCUMENT_COUNT,
  MAX_REQUEST_DOCUMENT_SIZE,
  MAX_REQUEST_DOCUMENT_TOTAL_SIZE,
  REQUEST_DOCUMENT_EXTENSIONS,
} from "@/lib/request-document-constants";
import { cn } from "@/lib/utils";
import {
  pricingUnitLabel,
  type PricingCatalogItem,
  type PricingQuote,
  type StallPricingConfig,
} from "@/lib/pricing-types";

const STEPS = [
  { num: 1, label: "Chọn ngựa", icon: Heart },
  { num: 2, label: "Tuyến & thời gian", icon: MapPin },
  { num: 3, label: "Gói vận chuyển", icon: Truck },
  { num: 4, label: "Chuồng", icon: Package },
  { num: 5, label: "Dịch vụ", icon: Globe },
  { num: 6, label: "Báo giá", icon: Receipt },
  { num: 7, label: "Xác nhận & gửi", icon: Send },
] as const;

interface HorseOption {
  horseId: string;
  microchipId: string;
  name: string;
  gender: string;
  imageUrl?: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  temperament: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
}

interface LocationOption {
  locationId: string;
  name: string;
  countryCode: string;
}

interface CreatedRequest {
  requestId: string;
  status: string;
  origin: { locationId: string; name: string; countryCode: string | null };
  destination: { locationId: string; name: string; countryCode: string | null };
  scheduledDepartureDate: string;
  scheduledArrivalDate: string;
  specialRequirements: string | null;
  currency: string;
  horses: Array<{ horseId: string; name: string; microchipId: string }>;
}

interface RequestDocumentDraft {
  key: string;
  file: File;
  horseId: string;
  documentType: string;
}

type StallSize = "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";

interface StallDraft {
  size: StallSize;
}

interface PricingSelection {
  packageCode: string;
  serviceCodes: string[];
}

interface ConflictRule {
  conflictsWith: string[];
  conflictNames: string[];
  reason: string;
}

const CONFLICT_RULES: Record<string, ConflictRule> = {
  DEDICATED_STALL: {
    conflictsWith: ["SHARED_STALL"],
    conflictNames: ["Chuồng ghép (Shared Stall)"],
    reason: "Không thể chọn đồng thời Chuồng riêng và Chuồng ghép trong cùng một chuyến vận chuyển",
  },
  SHARED_STALL: {
    conflictsWith: ["DEDICATED_STALL"],
    conflictNames: ["Chuồng riêng (Dedicated Stall)"],
    reason: "Không thể chọn đồng thời Chuồng riêng và Chuồng ghép trong cùng một chuyến vận chuyển",
  },
};

const STALL_RANK: Record<StallSize, number> = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
  EXTRA_LARGE: 4,
};

const STALL_DISPLAY_OPTIONS: Array<{
  value: StallSize;
  name: string;
  defaultDim: string;
  desc: string;
}> = [
  { value: "SMALL", name: "Nhỏ (Small)", defaultDim: "2,30 × 1,00 m", desc: "Dành cho ngựa nhỏ (< 450kg & < 155cm)" },
  { value: "MEDIUM", name: "Tiêu chuẩn (Medium)", defaultDim: "2,80 × 1,20 m", desc: "Dành cho ngựa tiêu chuẩn (450-520kg & 155-165cm)" },
  { value: "LARGE", name: "Lớn (Large)", defaultDim: "3,65 × 3,65 m", desc: "Dành cho ngựa lớn (520-600kg & 165-175cm)" },
  { value: "EXTRA_LARGE", name: "Rất lớn (Extra Large)", defaultDim: "4,25 × 3,65 m", desc: "Dành cho ngựa rất lớn (> 600kg hoặc > 175cm)" },
];

function getRecommendedStallSize(weightKg?: number | null, heightCm?: number | null): {
  recommendedSize: StallSize | null;
  reason: string;
} {
  const hasWeight = weightKg != null && weightKg > 0;
  const hasHeight = heightCm != null && heightCm > 0;

  if (!hasWeight && !hasHeight) {
    return {
      recommendedSize: null,
      reason: "Hồ sơ ngựa chưa có thông số cân nặng và chiều cao. Bạn có thể chọn kích thước phù hợp (khuyến nghị từ Medium trở lên) hoặc cập nhật hồ sơ ngựa.",
    };
  }

  const w = weightKg ?? 0;
  const h = heightCm ?? 0;

  if ((hasWeight && w > 600) || (hasHeight && h > 175)) {
    return {
      recommendedSize: "EXTRA_LARGE",
      reason: `Thể trạng rất lớn (${hasWeight ? `${w}kg` : ""}${hasWeight && hasHeight ? " · " : ""}${hasHeight ? `${h}cm` : ""}): Đề xuất kích thước Rất lớn (Extra Large).`,
    };
  }

  if ((hasWeight && w > 520) || (hasHeight && h > 165)) {
    return {
      recommendedSize: "LARGE",
      reason: `Thể trạng lớn (${hasWeight ? `${w}kg` : ""}${hasWeight && hasHeight ? " · " : ""}${hasHeight ? `${h}cm` : ""}): Đề xuất kích thước Lớn (Large).`,
    };
  }

  if ((hasWeight && w >= 450) || (hasHeight && h >= 155)) {
    return {
      recommendedSize: "MEDIUM",
      reason: `Thể trạng tiêu chuẩn (${hasWeight ? `${w}kg` : ""}${hasWeight && hasHeight ? " · " : ""}${hasHeight ? `${h}cm` : ""}): Đề xuất kích thước Tiêu chuẩn (Medium).`,
    };
  }

  return {
    recommendedSize: "SMALL",
    reason: `Thể trạng nhỏ (< 450kg & < 155cm): Đề xuất kích thước Nhỏ (Small).`,
  };
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

export function RequestCreateWizard() {
  const { navigate } = useAppStore();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState("");
  const [horses, setHorses] = useState<HorseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [stallPricingConfig, setStallPricingConfig] = useState<StallPricingConfig | null>(null);
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>([]);
  const [stallConfigurations, setStallConfigurations] = useState<Record<string, StallDraft>>({});
  const [originLocationId, setOriginLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [scheduledDepartureDate, setScheduledDepartureDate] = useState("");
  const [scheduledArrivalDate, setScheduledArrivalDate] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [currency] = useState("USD");
  const [pricingCatalog, setPricingCatalog] = useState<PricingCatalogItem[]>([]);
  const [packageCode, setPackageCode] = useState("");
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<string[]>([]);
  const [quotePreview, setQuotePreview] = useState<PricingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [requestDocuments, setRequestDocuments] = useState<RequestDocumentDraft[]>([]);
  const [uploadedDocumentKeys, setUploadedDocumentKeys] = useState<Set<string>>(new Set());
  const [uncertainDocumentKeys, setUncertainDocumentKeys] = useState<Set<string>>(new Set());
  const [createdRequest, setCreatedRequest] = useState<CreatedRequest | null>(null);
  const [submissionUncertain, setSubmissionUncertain] = useState(false);
  const [draggingDocuments, setDraggingDocuments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextDocumentKey = useRef(0);
  const submittingRef = useRef(false);

  const loadChoices = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [horseRecords, locationRecords, pricingItems] = await Promise.all([
        apiGet<HorseOption[]>("/horses/my-horses"),
        apiGet<LocationOption[]>("/locations"),
        apiGet<PricingCatalogItem[]>("/pricing/catalog"),
      ]);
      setHorses(horseRecords);
      setLocations(locationRecords);
      setPricingCatalog(pricingItems);

      try {
        const stallConfig = await apiGet<StallPricingConfig>("/pricing/stalls");
        setStallPricingConfig(stallConfig);
      } catch (stallErr) {
        console.warn("Could not load stall pricing, fallback to default dimensions", stallErr);
      }
    } catch (error: unknown) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadChoices);
  }, [loadChoices]);

  const packageItems = pricingCatalog.filter((item) => item.category === "PACKAGE");
  const serviceItems = pricingCatalog.filter((item) => item.category === "SERVICE");
  const selectedPackage = packageItems.find((item) => item.code === packageCode);

  // Load quote preview when package is chosen and horses are selected (for steps >= 4)
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!packageCode || selectedHorseIds.length === 0 || step < 4) {
        if (active) {
          setQuotePreview(null);
          setQuoteError("");
          setQuoteLoading(false);
        }
        return;
      }
      setQuoteLoading(true);
      setQuoteError("");
      try {
        const stallSizes = selectedHorseIds.map((id) => stallConfigurations[id]?.size || "MEDIUM");
        const sanitizedServiceCodes = selectedServiceCodes.filter(
          (code) => !selectedPackage?.includedServiceCodes.includes(code)
        );
        const quote = await apiPost<PricingQuote>("/pricing/quote-preview", {
          packageCode,
          serviceCodes: sanitizedServiceCodes,
          horseCount: selectedHorseIds.length,
          stallSizes,
        });
        if (active) setQuotePreview(quote);
      } catch (error: unknown) {
        if (active) setQuoteError(errorMessage(error));
      } finally {
        if (active) setQuoteLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [step, packageCode, selectedServiceCodes, selectedHorseIds, stallConfigurations, selectedPackage]);

  const selectedHorses = horses.filter((horse) => selectedHorseIds.includes(horse.horseId));
  const selectedOrigin = locations.find((location) => location.locationId === originLocationId);
  const selectedDestination = locations.find((location) => location.locationId === destinationLocationId);
  const formLocked = Boolean(createdRequest || submissionUncertain);

  const toggleHorse = (horseId: string) => {
    setStepError("");
    if (selectedHorseIds.includes(horseId)) {
      const remaining = selectedHorseIds.filter((id) => id !== horseId);
      setSelectedHorseIds(remaining);
      setStallConfigurations((configurations) => {
        const next = { ...configurations };
        delete next[horseId];
        return next;
      });
      setRequestDocuments((documents) =>
        documents.map((document) =>
          document.horseId === horseId ? { ...document, horseId: remaining[0] ?? "" } : document,
        ),
      );
      return;
    }

    const horse = horses.find((h) => h.horseId === horseId);
    const rec = getRecommendedStallSize(horse?.weightKg, horse?.heightCm);
    const initialSize: StallSize = rec.recommendedSize ?? "MEDIUM";

    setSelectedHorseIds((ids) => [...ids, horseId]);
    setStallConfigurations((configurations) => ({
      ...configurations,
      [horseId]: configurations[horseId] ?? { size: initialSize },
    }));
    setRequestDocuments((documents) =>
      documents.map((document) => (document.horseId ? document : { ...document, horseId })),
    );
  };

  const addRequestDocuments = (incomingFiles: FileList | File[]) => {
    if (formLocked || submitting) return;
    const accepted: RequestDocumentDraft[] = [];
    const rejected: string[] = [];
    const files = Array.from(incomingFiles);
    let totalSize = requestDocuments.reduce((total, item) => total + item.file.size, 0);

    for (const file of files) {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!REQUEST_DOCUMENT_EXTENSIONS.includes(extension as (typeof REQUEST_DOCUMENT_EXTENSIONS)[number])) {
        rejected.push(`${file.name}: định dạng không được hỗ trợ`);
      } else if (file.size <= 0 || file.size > MAX_REQUEST_DOCUMENT_SIZE) {
        rejected.push(`${file.name}: dung lượng tối đa 10MB`);
      } else if (
        [...requestDocuments, ...accepted].some(
          (item) =>
            item.file.name === file.name &&
            item.file.size === file.size &&
            item.file.lastModified === file.lastModified,
        )
      ) {
        rejected.push(`${file.name}: file đã được chọn`);
      } else if (requestDocuments.length + accepted.length >= MAX_REQUEST_DOCUMENT_COUNT) {
        rejected.push(`Chỉ được chọn tối đa ${MAX_REQUEST_DOCUMENT_COUNT} file`);
        break;
      } else if (totalSize + file.size > MAX_REQUEST_DOCUMENT_TOTAL_SIZE) {
        rejected.push("Tổng dung lượng tài liệu không được vượt quá 50MB");
        break;
      } else {
        accepted.push({
          key: `document-${nextDocumentKey.current++}`,
          file,
          horseId: selectedHorseIds[0] ?? "",
          documentType: "",
        });
        totalSize += file.size;
      }
    }

    if (accepted.length) setRequestDocuments((documents) => [...documents, ...accepted]);
    if (rejected.length) {
      toast({
        title: "Một số file không được thêm",
        description: rejected.join(". "),
        variant: "destructive",
      });
    }
  };

  const validateStep = (stepNumber: number): string | null => {
    if (stepNumber === 1 && selectedHorseIds.length === 0) {
      return "Vui lòng chọn ít nhất một hồ sơ ngựa thuộc tài khoản của bạn.";
    }
    if (stepNumber === 2) {
      if (!originLocationId || !destinationLocationId) return "Vui lòng chọn điểm đi và điểm đến.";
      if (originLocationId === destinationLocationId) return "Điểm đi và điểm đến phải khác nhau.";
      if (!scheduledDepartureDate || !scheduledArrivalDate) return "Vui lòng chọn ngày khởi hành và ngày đến dự kiến.";
      if (scheduledDepartureDate < todayUtc()) return "Ngày khởi hành không được ở quá khứ.";
      if (scheduledArrivalDate < scheduledDepartureDate) return "Ngày đến phải cùng hoặc sau ngày khởi hành.";
      const invalidDocument = requestDocuments.find(
        (document) =>
          !document.documentType.trim() ||
          document.documentType.trim().length > 100 ||
          !selectedHorseIds.includes(document.horseId),
      );
      if (invalidDocument) {
        return "Mỗi tài liệu cần có loại hồ sơ (tối đa 100 ký tự) và được gắn với một ngựa đã chọn.";
      }
    }
    if (stepNumber === 3 && !packageCode) {
      return "Vui lòng chọn một gói vận chuyển.";
    }
    if (stepNumber === 4) {
      const missing = selectedHorseIds.some((horseId) => {
        const stall = stallConfigurations[horseId];
        return !stall || !stall.size;
      });
      if (missing) return "Vui lòng chọn kích thước chuồng cho từng con ngựa.";
    }
    if (stepNumber === 5) {
      if (specialRequirements.length > 4000) {
        return "Yêu cầu đặc biệt không được vượt quá 4000 ký tự.";
      }
    }
    return null;
  };

  const goToStep = (nextStep: number) => {
    if (submitting || nextStep < 1 || nextStep > STEPS.length) return;
    if (nextStep > step) {
      if (nextStep > step + 1) return;
      const validationError = validateStep(step);
      if (validationError) {
        setStepError(validationError);
        return;
      }
    }
    setStepError("");
    setStep(nextStep);
  };

  const handleSubmit = async () => {
    if (submittingRef.current || submissionUncertain) return;
    if (createdRequest && uncertainDocumentKeys.size > 0) {
      navigate("request-detail", { id: createdRequest.requestId });
      return;
    }
    for (let s = 1; s <= 5; s++) {
      const err = validateStep(s);
      if (err) {
        setStepError(err);
        setStep(s);
        return;
      }
    }

    submittingRef.current = true;
    setSubmitting(true);
    let persistedRequest = createdRequest;
    try {
      if (!persistedRequest) {
        try {
          persistedRequest = await apiPost<CreatedRequest>("/transport-requests", {
            originLocationId,
            destinationLocationId,
            scheduledDepartureDate,
            scheduledArrivalDate,
            horseIds: selectedHorseIds,
            specialRequirements: specialRequirements.trim() || null,
            currency,
            pricingSelection: {
              packageCode,
              serviceCodes: effectiveSelectedAddons,
            } satisfies PricingSelection,
            stallConfigurations: selectedHorseIds.map((horseId) => ({
              horseId,
              size: stallConfigurations[horseId]?.size || "MEDIUM",
            })),
          });
        } catch (error: unknown) {
          if (!(error instanceof ApiError) || error.status >= 500) {
            setSubmissionUncertain(true);
          }
          throw error;
        }
        if (!persistedRequest?.requestId || !persistedRequest.status) {
          setSubmissionUncertain(true);
          throw new Error("Không nhận được mã và trạng thái yêu cầu sau khi gửi. Không gửi lại để tránh tạo trùng.");
        }
        setCreatedRequest(persistedRequest);
      }

      const completed = new Set(uploadedDocumentKeys);
      for (const document of requestDocuments) {
        if (completed.has(document.key)) continue;
        const formData = new FormData();
        formData.append("file", document.file);
        formData.append("documentType", document.documentType.trim());
        formData.append("requestId", persistedRequest.requestId);
        try {
          await apiPostFormData(`/horses/${document.horseId}/documents`, formData);
        } catch (error: unknown) {
          if (!(error instanceof ApiError) || error.status >= 500) {
            setUncertainDocumentKeys((keys) => new Set(keys).add(document.key));
          }
          throw error;
        }
        completed.add(document.key);
        setUploadedDocumentKeys(new Set(completed));
      }

      toast({
        title: "Đã tạo yêu cầu vận chuyển",
        description: `#${persistedRequest.requestId} · ${transportRequestStatusLabel(persistedRequest.status)}`,
      });
      navigate("request-detail", { id: persistedRequest.requestId });
    } catch (error: unknown) {
      if (persistedRequest?.requestId) {
        toast({
          title: "Yêu cầu đã được tạo; chưa tải đủ tài liệu",
          description: `${errorMessage(error)} Mã yêu cầu: ${persistedRequest.requestId}. Có thể thử tải lại tài liệu còn thiếu mà không tạo yêu cầu mới.`,
          variant: "destructive",
        });
      } else if (submissionUncertain || (!(error instanceof ApiError) || error.status >= 500)) {
        toast({
          title: "Chưa xác định được kết quả tạo yêu cầu",
          description: `${errorMessage(error)} Kiểm tra danh sách yêu cầu trước khi gửi lại để tránh tạo trùng.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tạo yêu cầu thất bại",
          description: errorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };


  const handleSelectPackage = (code: string) => {
    setPackageCode(code);
    setStepError("");
    const pkg = packageItems.find((p) => p.code === code);
    if (pkg) {
      // Bỏ các dịch vụ đã được bao gồm trong gói mới và dịch vụ xung đột với gói
      setSelectedServiceCodes((prev) => {
        let next = prev.filter((c) => !pkg.includedServiceCodes.includes(c));
        for (const incCode of pkg.includedServiceCodes) {
          const rule = CONFLICT_RULES[incCode];
          if (rule) {
            next = next.filter((c) => !rule.conflictsWith.includes(c));
          }
        }
        return next;
      });
    }
  };

  // Danh sách dịch vụ bổ sung thực tế khách hàng chọn (loại bỏ dịch vụ đã có trong gói)
  const effectiveSelectedAddons = useMemo(() => {
    const includedCodes = selectedPackage?.includedServiceCodes ?? [];
    return selectedServiceCodes.filter((code) => !includedCodes.includes(code));
  }, [selectedServiceCodes, selectedPackage]);

  // Tính tổng chi phí các dịch vụ bổ sung đã chọn
  const totalAddonCost = useMemo(() => {
    if (quotePreview?.lines) {
      return quotePreview.lines
        .filter(
          (line) =>
            line.category === "SERVICE" &&
            !line.includedInPackage &&
            !line.code.startsWith("STALL_") &&
            effectiveSelectedAddons.includes(line.code)
        )
        .reduce((sum, line) => sum + (line.lineTotalUsd || 0), 0);
    }
    return effectiveSelectedAddons.reduce((sum, code) => {
      const item = serviceItems.find((s) => s.code === code);
      if (!item || item.priceUsd == null) return sum;
      const qty = item.unitType === "PER_HORSE" ? selectedHorseIds.length : 1;
      return sum + item.priceUsd * qty;
    }, 0);
  }, [quotePreview, effectiveSelectedAddons, serviceItems, selectedHorseIds.length]);

  const toggleService = (serviceCode: string) => {
    if (formLocked || submitting) return;

    // Dịch vụ đã được bao gồm trong gói thì không cho phép click sửa
    const isIncluded = selectedPackage?.includedServiceCodes?.includes(serviceCode);
    if (isIncluded) return;

    // Kiểm tra nếu dịch vụ này xung đột với dịch vụ đã được bao gồm sẵn trong gói
    const rule = CONFLICT_RULES[serviceCode];
    if (rule && rule.conflictsWith.some((code) => selectedPackage?.includedServiceCodes?.includes(code))) {
      toast({
        title: "Dịch vụ không khả dụng",
        description: `Gói vận chuyển đã bao gồm ${rule.conflictNames.join(", ")}. Không thể chọn đồng thời dịch vụ này.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedServiceCodes((currentCodes) => {
      const isCurrentlySelected = currentCodes.includes(serviceCode);
      if (isCurrentlySelected) {
        // Bỏ chọn dịch vụ
        return currentCodes.filter((code) => code !== serviceCode);
      } else {
        // Chọn mới dịch vụ
        let nextCodes = [...currentCodes];
        // Nếu dịch vụ có quy tắc xung đột (vd: Chuồng riêng vs Chuồng ghép)
        if (rule) {
          const removedConflicts = nextCodes.filter((code) => rule.conflictsWith.includes(code));
          if (removedConflicts.length > 0) {
            nextCodes = nextCodes.filter((code) => !rule.conflictsWith.includes(code));
            const removedNames = removedConflicts
              .map((code) => serviceItems.find((s) => s.code === code)?.name || code)
              .join(", ");
            toast({
              title: "Đã cập nhật lựa chọn",
              description: `Đã chọn ${serviceItems.find((s) => s.code === serviceCode)?.name} và tự động bỏ chọn ${removedNames} do xung đột cấu hình.`,
            });
          }
        }
        nextCodes.push(serviceCode);
        return nextCodes;
      }
    });
  };

  const getStallOptionInfo = (size: StallSize) => {
    if (!stallPricingConfig) {
      const opt = STALL_DISPLAY_OPTIONS.find((o) => o.value === size);
      return {
        label: opt?.name ?? size,
        dimensions: opt?.defaultDim ?? "—",
        priceUsd: null,
      };
    }
    const detail =
      size === "SMALL"
        ? stallPricingConfig.small
        : size === "MEDIUM"
          ? stallPricingConfig.medium
          : size === "LARGE"
            ? stallPricingConfig.large
            : stallPricingConfig.extraLarge;
    return {
      label: detail?.label ?? size,
      dimensions: detail?.dimensionsFormatted ?? "—",
      priceUsd: detail?.priceUsd ?? null,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tạo yêu cầu vận chuyển"
          description="Không thể tải dữ liệu cần thiết từ backend."
          icon={<Truck className="h-5 w-5" />}
        />
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" onClick={() => void loadChoices()}>
              Thử tải lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo yêu cầu vận chuyển"
        description="Hoàn tất 7 bước để gửi yêu cầu vận chuyển ngựa đua chuyên nghiệp"
        icon={<Truck className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("requests")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
        }
      />

      {/* STEPPER: 7 STEPS */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-equideli">
        {STEPS.map((item, index) => {
          const active = step === item.num;
          const done = step > item.num;
          const Icon = item.icon;
          return (
            <div key={item.num} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => goToStep(item.num)}
                disabled={submitting || item.num > step + 1}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : done
                      ? "bg-[var(--success-bg)] text-[var(--success-fg)]"
                      : "bg-muted text-muted-foreground",
                  item.num <= step + 1 && "cursor-pointer hover:opacity-80",
                  item.num > step + 1 && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-primary-foreground/20"
                      : done
                        ? "bg-[var(--success)]/20"
                        : "bg-muted-foreground/20",
                  )}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.num}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={cn("h-0.5 w-4", done ? "bg-[var(--success)]" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {createdRequest && (
        <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success-bg)]/30 p-3 text-sm">
          Đã tạo yêu cầu <strong>{createdRequest.requestId}</strong> ·{" "}
          {transportRequestStatusLabel(createdRequest.status)}. Tài liệu tải lên thành công sẽ không bị gửi lặp khi thử lại.
        </div>
      )}
      {submissionUncertain && !createdRequest && (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)]/30 p-3 text-sm">
          Chưa xác định được backend đã ghi yêu cầu hay chưa. Không gửi lại từ đây; hãy kiểm tra danh sách yêu cầu trước.
          <Button variant="link" className="h-auto p-1" onClick={() => navigate("requests")}>
            Mở danh sách yêu cầu
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-5 p-6">
          {/* STEP 1: CHỌN NGỰA */}
          {step === 1 && (
            <section className="space-y-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Heart className="h-4 w-4 text-primary" /> Bước 1: Chọn ngựa vận chuyển
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chỉ những hồ sơ ngựa thuộc quyền quản lý của bạn mới được chọn để vận chuyển.
                </p>
              </div>
              {horses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-center">
                  <p className="text-sm font-medium">Tài khoản chưa có hồ sơ ngựa</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tạo hồ sơ ngựa trước khi gửi yêu cầu vận chuyển.</p>
                  <Button variant="outline" className="mt-3" onClick={() => navigate("horses")}>
                    Mở hồ sơ ngựa
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {horses.map((horse) => {
                    const checked = selectedHorseIds.includes(horse.horseId);
                    return (
                      <label
                        key={horse.horseId}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all",
                          checked ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-primary/40",
                          formLocked && "cursor-not-allowed opacity-70",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleHorse(horse.horseId)}
                          disabled={formLocked || submitting}
                        />
                        <HorseImage
                          src={horse.imageUrl}
                          name={horse.name}
                          className="h-14 w-14 shrink-0 rounded-md object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{horse.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {horse.microchipId || "Chưa có microchip"}
                            </Badge>
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {horse.gender || "Chưa rõ giới tính"} · Thể trạng:{" "}
                            {horse.weightKg != null ? `${horse.weightKg} kg` : "Chưa có cân nặng"} /{" "}
                            {horse.heightCm != null ? `${horse.heightCm} cm` : "Chưa có chiều cao"}
                          </span>
                          {horse.temperament && (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              Tính khí: {horse.temperament}
                            </span>
                          )}
                          {horse.medicalHistory && (
                            <span className="mt-0.5 block text-xs text-muted-foreground truncate">
                              Tiền sử: {horse.medicalHistory}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedHorses.length > 0 && (
                <p className="rounded-lg bg-primary/5 p-3 text-sm font-medium">
                  ✓ Đã chọn {selectedHorses.length} hồ sơ ngựa cho chuyến vận chuyển.
                </p>
              )}
            </section>
          )}

          {/* STEP 2: TUYẾN & THỜI GIAN */}
          {step === 2 && (
            <section className="space-y-5">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <MapPin className="h-4 w-4 text-primary" /> Bước 2: Tuyến vận chuyển & thời gian
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vui lòng điền đầy đủ các thông tin có dấu (*) để hệ thống lên phương án vận chuyển chính xác.
                </p>
              </div>
              {locations.length === 0 && (
                <p
                  role="alert"
                  className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-bg)]/30 p-3 text-sm"
                >
                  Chưa có địa điểm vận chuyển khả dụng. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wizard-origin">Điểm đi *</Label>
                  <select
                    id="wizard-origin"
                    required
                    value={originLocationId}
                    onChange={(event) => {
                      setOriginLocationId(event.target.value);
                      setStepError("");
                    }}
                    disabled={formLocked || submitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— Chọn điểm đi —</option>
                    {locations.map((location) => (
                      <option key={location.locationId} value={location.locationId}>
                        {location.name} ({location.countryCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-destination">Điểm đến *</Label>
                  <select
                    id="wizard-destination"
                    required
                    value={destinationLocationId}
                    onChange={(event) => {
                      setDestinationLocationId(event.target.value);
                      setStepError("");
                    }}
                    disabled={formLocked || submitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— Chọn điểm đến —</option>
                    {locations.map((location) => (
                      <option key={location.locationId} value={location.locationId}>
                        {location.name} ({location.countryCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-departure">Ngày khởi hành *</Label>
                  <Input
                    id="wizard-departure"
                    type="date"
                    min={todayUtc()}
                    required
                    value={scheduledDepartureDate}
                    onChange={(event) => {
                      setScheduledDepartureDate(event.target.value);
                      setStepError("");
                    }}
                    disabled={formLocked || submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-arrival">Ngày đến dự kiến *</Label>
                  <Input
                    id="wizard-arrival"
                    type="date"
                    min={scheduledDepartureDate || todayUtc()}
                    required
                    value={scheduledArrivalDate}
                    onChange={(event) => {
                      setScheduledArrivalDate(event.target.value);
                      setStepError("");
                    }}
                    disabled={formLocked || submitting}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="wizard-currency">Loại tiền của yêu cầu</Label>
                  <Input id="wizard-currency" value={currency} readOnly className="sm:max-w-xs" />
                  <p className="text-xs text-muted-foreground">Tất cả báo giá và hóa đơn mới được lập bằng USD.</p>
                </div>
              </div>

              {/* HỒ SƠ ĐÍNH KÈM */}
              <section className="space-y-3 rounded-xl border border-border p-4" aria-labelledby="wizard-documents-title">
                <div>
                  <h4 id="wizard-documents-title" className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-primary" /> Hồ sơ đính kèm
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, DOC, DOCX, JPG, PNG · tối đa 10MB/file · tối đa {MAX_REQUEST_DOCUMENT_COUNT} file; tổng tối đa 50MB.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={REQUEST_DOCUMENT_EXTENSIONS.join(",")}
                  className="sr-only"
                  aria-label="Chọn giấy tờ đính kèm"
                  disabled={submitting || submissionUncertain || Boolean(createdRequest)}
                  onChange={(event) => {
                    if (event.target.files) addRequestDocuments(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={submitting || submissionUncertain}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDraggingDocuments(true);
                  }}
                  onDragLeave={() => setDraggingDocuments(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDraggingDocuments(false);
                    addRequestDocuments(event.dataTransfer.files);
                  }}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
                    draggingDocuments ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    (submitting || submissionUncertain || createdRequest) && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Kéo thả file vào đây hoặc bấm để chọn</span>
                  <span className="text-xs text-muted-foreground">Tệp đính kèm sẽ được lưu trữ cùng hồ sơ yêu cầu.</span>
                </button>
                {requestDocuments.length > 0 && (
                  <ul className="space-y-3" aria-label="Danh sách giấy tờ đã chọn">
                    {requestDocuments.map((document) => {
                      const uploaded = uploadedDocumentKeys.has(document.key);
                      const uncertain = uncertainDocumentKeys.has(document.key);
                      return (
                        <li key={document.key} className="space-y-2 rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            {uploaded ? (
                              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{document.file.name}</span>
                            <span
                              className={cn(
                                "text-xs",
                                uncertain ? "text-[var(--warning-fg)]" : "text-muted-foreground",
                              )}
                            >
                              {uploaded
                                ? "Đã tải lên"
                                : uncertain
                                  ? "Chưa xác định kết quả tải lên"
                                  : `${Math.max(1, Math.round(document.file.size / 1024))} KB`}
                            </span>
                            {!uploaded && !submitting && !submissionUncertain && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Gỡ ${document.file.name}`}
                                onClick={() =>
                                  setRequestDocuments((items) => items.filter((item) => item.key !== document.key))
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label htmlFor={`doc-type-${document.key}`}>Loại hồ sơ *</Label>
                              <Input
                                id={`doc-type-${document.key}`}
                                maxLength={100}
                                value={document.documentType}
                                disabled={uploaded || submitting || submissionUncertain}
                                placeholder="Ví dụ: Hồ sơ sức khỏe"
                                onChange={(event) =>
                                  setRequestDocuments((items) =>
                                    items.map((item) =>
                                      item.key === document.key ? { ...item, documentType: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`doc-horse-${document.key}`}>Hồ sơ ngựa *</Label>
                              <select
                                id={`doc-horse-${document.key}`}
                                value={document.horseId}
                                disabled={uploaded || submitting || submissionUncertain}
                                onChange={(event) =>
                                  setRequestDocuments((items) =>
                                    items.map((item) =>
                                      item.key === document.key ? { ...item, horseId: event.target.value } : item,
                                    ),
                                  )
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              >
                                <option value="">— Chọn ngựa —</option>
                                {selectedHorses.map((horse) => (
                                  <option key={horse.horseId} value={horse.horseId}>
                                    {horse.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </section>
          )}

          {/* STEP 3: GÓI VẬN CHUYỂN */}
          {step === 3 && (
            <section className="space-y-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Truck className="h-4 w-4 text-primary" /> Bước 3: Chọn gói vận chuyển
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chọn gói vận chuyển phù hợp với nhu cầu. Giá do Logistics Manager cấu hình và hiển thị bằng USD.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {packageItems.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    aria-pressed={packageCode === item.code}
                    onClick={() => handleSelectPackage(item.code)}
                    disabled={formLocked || submitting}
                    className={cn(
                      "rounded-xl text-left transition-colors",
                      packageCode === item.code ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50",
                    )}
                  >
                    <Card className="h-full">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          {packageCode === item.code && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                        </div>
                        <p className="min-h-10 text-sm text-muted-foreground">
                          {item.benefits || "Quyền lợi chưa được cấu hình."}
                        </p>
                        <p className="font-semibold text-primary">
                          {item.priceUsd === null ? "Chưa có" : formatMoney(item.priceUsd, "USD")}
                          {" / "}
                          {pricingUnitLabel(item.unitType)}
                        </p>
                        {item.includedServiceCodes.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Bao gồm:{" "}
                            {item.includedServiceCodes
                              .map((code) => serviceItems.find((service) => service.code === code)?.name || code)
                              .join(", ")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* STEP 4: KÍCH THƯỚC CHUỒNG (Tự động đề xuất theo thể trạng ngựa) */}
          {step === 4 && (
            <section className="space-y-5">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Package className="h-4 w-4 text-primary" /> Bước 4: Kích thước chuồng theo từng ngựa
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hệ thống tự động đề xuất kích thước tối thiểu dựa trên cân nặng và chiều cao của từng con ngựa. Bạn có thể chọn kích thước lớn hơn để ngựa có không gian thoải mái hơn.
                </p>
              </div>

              <div className="space-y-4">
                {selectedHorses.map((horse) => {
                  const currentStall = stallConfigurations[horse.horseId] ?? { size: "MEDIUM" };
                  const rec = getRecommendedStallSize(horse.weightKg, horse.heightCm);
                  const minRank = rec.recommendedSize ? STALL_RANK[rec.recommendedSize] : 1;

                  return (
                    <Card key={horse.horseId} className="border-border">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-3">
                            <HorseImage
                              src={horse.imageUrl}
                              name={horse.name}
                              className="h-10 w-10 shrink-0 rounded-md object-cover"
                            />
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{horse.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Cân nặng: <strong>{horse.weightKg != null ? `${horse.weightKg} kg` : "Chưa có"}</strong> ·{" "}
                                Chiều cao: <strong>{horse.heightCm != null ? `${horse.heightCm} cm` : "Chưa có"}</strong>
                              </p>
                            </div>
                          </div>
                          {rec.recommendedSize ? (
                            <Badge variant="secondary" className="w-fit text-xs font-semibold gap-1 bg-primary/10 text-primary border-primary/20">
                              ✓ Đề xuất tối thiểu: {getStallOptionInfo(rec.recommendedSize).label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="w-fit text-xs font-normal gap-1 text-[var(--warning-fg)] border-[var(--warning-fg)]/30">
                              <AlertTriangle className="h-3 w-3" /> Chưa đủ thông số thể trạng
                            </Badge>
                          )}
                        </div>

                        {rec.reason && (
                          <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-md">
                            {rec.reason}
                          </p>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Chọn kích thước chuồng cho {horse.name} *
                          </Label>
                          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                            {STALL_DISPLAY_OPTIONS.map((option) => {
                              const rank = STALL_RANK[option.value];
                              const isSmallerThanRecommended = rec.recommendedSize != null && rank < minRank;
                              const isSelected = currentStall.size === option.value;
                              const info = getStallOptionInfo(option.value);

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  disabled={formLocked || submitting || isSmallerThanRecommended}
                                  onClick={() => {
                                    setStallConfigurations((current) => ({
                                      ...current,
                                      [horse.horseId]: { size: option.value },
                                    }));
                                  }}
                                  className={cn(
                                    "flex flex-col justify-between rounded-lg border p-3 text-left transition-all",
                                    isSelected
                                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                                      : isSmallerThanRecommended
                                        ? "cursor-not-allowed opacity-40 bg-muted/30 border-border"
                                        : "border-border hover:border-primary/50 hover:bg-muted/20",
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-sm">{info.label}</span>
                                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Kích thước: <strong>{info.dimensions}</strong>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">{option.desc}</p>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary">
                                      {info.priceUsd != null ? formatMoney(info.priceUsd, "USD") : "Chưa có giá"}
                                    </span>
                                    {isSmallerThanRecommended ? (
                                      <span className="text-[10px] text-destructive font-medium">Quá nhỏ</span>
                                    ) : option.value === rec.recommendedSize ? (
                                      <span className="text-[10px] text-primary font-semibold">Khuyến nghị</span>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* STEP 5: DỊCH VỤ & YÊU CẦU ĐẶC BIỆT */}
          {step === 5 && (
            <section className="space-y-6">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Globe className="h-4 w-4 text-primary" /> Bước 5: Dịch vụ bổ sung & Yêu cầu đặc biệt
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chọn các dịch vụ chăm sóc và nhập các yêu cầu riêng cho chuyến vận chuyển.
                </p>
              </div>

              {/* Dịch vụ tùy chọn (Optional Add-ons) */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Dịch vụ tùy chọn (Optional Add-ons)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Có thể chọn một hoặc nhiều dịch vụ độc lập cùng lúc. Dịch vụ đã nằm trong gói sẽ hiển thị &quot;Đã gồm trong gói&quot; và không tính thêm phí.
                    </p>
                  </div>
                  {effectiveSelectedAddons.length > 0 && (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                      Đã chọn {effectiveSelectedAddons.length} dịch vụ bổ sung
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {serviceItems.map((item) => {
                    const isIncluded = selectedPackage?.includedServiceCodes.includes(item.code) ?? false;
                    const isSelected = effectiveSelectedAddons.includes(item.code);
                    const isRequired = item.required;
                    const isChecked = isIncluded || isRequired || isSelected;

                    const conflictRule = CONFLICT_RULES[item.code];
                    const conflictsWithPackage = conflictRule
                      ? conflictRule.conflictsWith.some((code) => selectedPackage?.includedServiceCodes.includes(code))
                      : false;
                    const isConflictedWithSelected = conflictRule
                      ? conflictRule.conflictsWith.some((code) => effectiveSelectedAddons.includes(code))
                      : false;

                    const isDisabled = formLocked || submitting || isRequired || isIncluded || conflictsWithPackage;

                    let statusReason = "";
                    if (isIncluded) {
                      statusReason = "Đã bao gồm sẵn trong gói vận chuyển (không tính thêm phí)";
                    } else if (conflictsWithPackage) {
                      statusReason = `Không khả dụng: Gói vận chuyển đã bao gồm ${conflictRule?.conflictNames.join(", ")}`;
                    } else if (isConflictedWithSelected) {
                      statusReason = `Xung đột với ${conflictRule?.conflictNames.join(", ")} đang chọn (chọn sẽ thay thế)`;
                    }

                    return (
                      <div
                        key={item.code}
                        role="checkbox"
                        aria-checked={isChecked}
                        aria-disabled={isDisabled}
                        tabIndex={isDisabled ? -1 : 0}
                        onClick={() => {
                          if (!isDisabled) toggleService(item.code);
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === " " || e.key === "Enter") && !isDisabled) {
                            e.preventDefault();
                            toggleService(item.code);
                          }
                        }}
                        className={cn(
                          "relative rounded-xl border p-4 transition-all duration-200 select-none flex flex-col justify-between",
                          isDisabled && "cursor-not-allowed opacity-60 bg-muted/20 border-border/50",
                          !isDisabled && "cursor-pointer hover:shadow-md",
                          isIncluded && "border-primary/40 bg-primary/5 cursor-default opacity-90",
                          isSelected && !isIncluded && "border-primary bg-primary/10 ring-2 ring-primary shadow-sm",
                          !isSelected && !isIncluded && !isDisabled && "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                        )}
                      >
                        <div>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => {
                                if (!isDisabled) toggleService(item.code);
                              }}
                              disabled={isDisabled}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Chọn dịch vụ ${item.name}`}
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0 transition-transform",
                                isSelected && "border-primary bg-primary text-primary-foreground"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                                {isIncluded && (
                                  <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-[11px]">
                                    Đã gồm trong gói
                                  </Badge>
                                )}
                                {isSelected && !isIncluded && (
                                  <Badge className="bg-primary text-primary-foreground text-[11px] font-semibold">
                                    Đã chọn
                                  </Badge>
                                )}
                                {isRequired && <Badge variant="secondary" className="text-[11px]">Bắt buộc</Badge>}
                                {conflictsWithPackage && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Không khả dụng
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                {item.benefits || "Quyền lợi chưa được cấu hình."}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-border/40 pt-2 flex flex-wrap items-center justify-between gap-1">
                          <div>
                            {isIncluded ? (
                              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Miễn phí trong gói ($0)
                              </p>
                            ) : (
                              <div className="text-xs">
                                <span className="font-bold text-primary">
                                  {item.priceUsd === null ? "Chưa có" : formatMoney(item.priceUsd, "USD")}
                                </span>
                                <span className="text-muted-foreground font-medium">
                                  {" / "}{pricingUnitLabel(item.unitType)}
                                </span>
                                {item.unitType === "PER_HORSE" && selectedHorseIds.length > 1 && item.priceUsd !== null && (
                                  <span className="text-[11px] text-muted-foreground ml-1">
                                    (= {formatMoney(item.priceUsd * selectedHorseIds.length, "USD")} cho {selectedHorseIds.length} ngựa)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {statusReason && !isIncluded && (
                            <p className={cn(
                              "text-[11px] flex items-center gap-1",
                              conflictsWithPackage ? "text-rose-400" : "text-amber-400/90"
                            )}>
                              {conflictsWithPackage ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <Info className="h-3 w-3 shrink-0" />}
                              {statusReason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bảng tóm tắt Dịch vụ Bổ sung đã chọn */}
                <Card className="border-primary/30 bg-primary/5 overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">
                          Dịch vụ bổ sung đã chọn ({effectiveSelectedAddons.length})
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-1.5">Phí dịch vụ bổ sung:</span>
                        <span className="text-sm font-extrabold text-primary">
                          {formatMoney(totalAddonCost, "USD")}
                        </span>
                      </div>
                    </div>

                    {effectiveSelectedAddons.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Chưa chọn dịch vụ bổ sung nào. Bạn có thể chọn nhiều dịch vụ tùy chọn phù hợp ở trên để chăm sóc tốt nhất cho ngựa.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {effectiveSelectedAddons.map((code) => {
                          const s = serviceItems.find((item) => item.code === code);
                          const line = quotePreview?.lines.find((l) => l.code === code);
                          const itemCost = line?.lineTotalUsd ?? (s?.priceUsd ? s.priceUsd * (s.unitType === "PER_HORSE" ? selectedHorseIds.length : 1) : 0);
                          return (
                            <div
                              key={code}
                              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-card px-2.5 py-1 text-xs shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-medium text-foreground">{s?.name || code}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="font-semibold text-primary">{formatMoney(itemCost, "USD")}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleService(code);
                                }}
                                className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Bỏ chọn dịch vụ"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {quotePreview?.totalAmount != null && (
                      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                        <span className="text-muted-foreground">
                          Tổng tạm tính toàn bộ đơn (Gói + Chuồng + Dịch vụ bổ sung):
                        </span>
                        <span className="font-bold text-foreground">
                          {formatMoney(quotePreview.totalAmount, "USD")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Ô nhập Yêu cầu đặc biệt khác */}
              <div className="space-y-2 rounded-xl border border-border p-4">
                <Label htmlFor="wizard-special-requirements" className="text-sm font-semibold text-foreground">
                  Yêu cầu đặc biệt khác
                </Label>
                <p className="text-xs text-muted-foreground">
                  Nhập các yêu cầu riêng về chăm sóc, điều kiện chuồng trại, chế độ ăn hoặc các lưu ý đặc biệt khác cho nhân viên vận chuyển.
                </p>
                <Textarea
                  id="wizard-special-requirements"
                  maxLength={4000}
                  value={specialRequirements}
                  onChange={(event) => setSpecialRequirements(event.target.value)}
                  disabled={formLocked || submitting}
                  placeholder="Nhập yêu cầu riêng về chăm sóc, chế độ ăn, điều kiện vận chuyển hoặc lưu ý đặc biệt cho ngựa..."
                  rows={4}
                  className="mt-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Thông tin này sẽ được lưu cùng yêu cầu và hiển thị cho Logistics Manager thẩm định.</span>
                  <span>{specialRequirements.length}/4000 ký tự</span>
                </div>
              </div>
            </section>
          )}

          {/* STEP 6: BÁO GIÁ ƯỚC TÍNH */}
          {step === 6 && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Receipt className="h-4 w-4 text-primary" /> Bước 6: Ước tính báo giá
              </h3>
              <p className="text-sm text-muted-foreground">
                Bảng tính tự động bao gồm giá gói vận chuyển, phí kích thước chuồng theo từng ngựa và các dịch vụ bổ sung. Báo giá sẽ được chốt chính thức khi Logistics Manager thẩm định và phê duyệt.
              </p>
              {quoteLoading && (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Đang tính toán bảng giá và phí chuồng...
                </div>
              )}
              {quoteError && <p role="alert" className="text-sm text-destructive">{quoteError}</p>}
              {!packageCode && <p className="text-sm text-muted-foreground">Quay lại bước chọn gói để xem báo giá.</p>}
              {quotePreview && (
                <Card>
                  <CardContent className="space-y-3 p-5">
                    {quotePreview.lines.map((line) => (
                      <div
                        key={line.code}
                        className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {line.name}
                            {line.required ? " · Bắt buộc" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {line.includedInPackage
                              ? "Đã bao gồm trong gói"
                              : line.quantity !== null && line.unitType
                                ? `${line.quantity} ${pricingUnitLabel(line.unitType)} × ${
                                    line.unitPriceUsd === null ? "Chưa có" : formatMoney(line.unitPriceUsd, "USD")
                                  }`
                                : "Đơn giá hoặc đơn vị tính chưa có"}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {line.includedInPackage
                            ? "Đã bao gồm"
                            : line.lineTotalUsd === null
                              ? "Chưa có"
                              : formatMoney(line.lineTotalUsd, "USD")}
                        </p>
                      </div>
                    ))}
                    {quotePreview.missingItems.length > 0 && (
                      <p className="rounded-md bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-fg)]">
                        Chưa thể chốt báo giá; cần cấu hình giá và đơn vị tính cho: {quotePreview.missingItems.join(", ")}.
                      </p>
                    )}
                    <div className="flex justify-between border-t border-border pt-3 font-bold text-base">
                      <span>Tổng cộng ước tính (USD)</span>
                      <span className="text-primary">
                        {quotePreview.totalAmount === null ? "Chưa có" : formatMoney(quotePreview.totalAmount, "USD")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          )}

          {/* STEP 7: XÁC NHẬN & GỬI */}
          {step === 7 && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Send className="h-4 w-4 text-primary" /> Bước 7: Xác nhận và gửi yêu cầu
              </h3>
              {!createdRequest ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card>
                      <CardContent className="p-3.5 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Ngựa vận chuyển ({selectedHorses.length})
                        </p>
                        {selectedHorses.map((horse) => (
                          <p key={horse.horseId} className="text-sm font-semibold">
                            {horse.name}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {horse.microchipId || "Chưa có microchip"}
                            </span>
                          </p>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3.5 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Gói và dịch vụ
                        </p>
                        <div>
                          <p className="text-sm font-semibold">{selectedPackage?.name || "Chưa chọn gói"}</p>
                          {selectedPackage?.includedServiceCodes && selectedPackage.includedServiceCodes.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Bao gồm sẵn:{" "}
                              {selectedPackage.includedServiceCodes
                                .map((code) => serviceItems.find((service) => service.code === code)?.name || code)
                                .join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="border-t border-border pt-2">
                          <p className="text-xs font-medium text-foreground">
                            Dịch vụ bổ sung ({effectiveSelectedAddons.length}):
                          </p>
                          {effectiveSelectedAddons.length > 0 ? (
                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                              {effectiveSelectedAddons.map((code) => {
                                const s = serviceItems.find((item) => item.code === code);
                                const line = quotePreview?.lines.find((l) => l.code === code);
                                const cost = line?.lineTotalUsd ?? (s?.priceUsd ? s.priceUsd * (s.unitType === "PER_HORSE" ? selectedHorseIds.length : 1) : null);
                                return (
                                  <li key={code} className="flex justify-between items-center">
                                    <span>• {s?.name || code}</span>
                                    <span className="font-semibold text-foreground">
                                      {cost != null ? formatMoney(cost, "USD") : "—"}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Không chọn dịch vụ tùy chọn</p>
                          )}
                        </div>

                        <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                          <span>Tổng xem trước:</span>
                          <span className="text-primary">
                            {quotePreview?.totalAmount == null ? "Chưa có" : formatMoney(quotePreview.totalAmount, "USD")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3.5 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tuyến đường</p>
                        <p className="text-sm font-semibold">
                          {selectedOrigin?.name || "—"} → {selectedDestination?.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedOrigin?.countryCode || "—"} → {selectedDestination?.countryCode || "—"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3.5 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Thời gian dự kiến
                        </p>
                        <p className="text-sm">
                          Khởi hành: {scheduledDepartureDate ? formatDate(scheduledDepartureDate) : "—"}
                        </p>
                        <p className="text-sm">Đến nơi: {scheduledArrivalDate ? formatDate(scheduledArrivalDate) : "—"}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3.5 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Cấu hình kích thước chuồng
                        </p>
                        {selectedHorses.map((horse) => {
                          const stall = stallConfigurations[horse.horseId];
                          const info = getStallOptionInfo(stall?.size || "MEDIUM");
                          return (
                            <p key={horse.horseId} className="text-sm">
                              {horse.name}: <strong>{info.label}</strong> ({info.dimensions}){" "}
                              {info.priceUsd != null && (
                                <span className="text-xs text-muted-foreground font-medium">
                                  · {formatMoney(info.priceUsd, "USD")}
                                </span>
                              )}
                            </p>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3.5 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Loại tiền</p>
                        <p className="text-sm font-semibold">{currency}</p>
                        <p className="text-xs text-muted-foreground">Đơn vị tiền tệ chính thức.</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-3.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Yêu cầu đặc biệt khác
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {specialRequirements.trim() || "Không có yêu cầu đặc biệt."}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tài liệu sẽ tải lên sau khi tạo request ({requestDocuments.length})
                      </p>
                      {requestDocuments.length ? (
                        requestDocuments.map((document) => (
                          <p key={document.key} className="mt-1 text-sm">
                            {document.file.name} · {document.documentType || "Chưa phân loại"} ·{" "}
                            {selectedHorses.find((horse) => horse.horseId === document.horseId)?.name || "Chưa chọn ngựa"}
                          </p>
                        ))
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">Không đính kèm tài liệu.</p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    Vui lòng kiểm tra kỹ các thông tin trước khi gửi yêu cầu vận chuyển để hệ thống tiếp nhận thẩm định và báo giá.
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success-bg)]/30 p-4">
                  <p className="font-semibold">Yêu cầu đã được tạo thành công</p>
                  <p className="mt-1 text-sm">Mã yêu cầu: {createdRequest.requestId}</p>
                  <p className="text-sm">Trạng thái: {transportRequestStatusLabel(createdRequest.status)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Đã xác nhận tải {uploadedDocumentKeys.size}/{requestDocuments.length} tài liệu trong wizard.
                    {uncertainDocumentKeys.size > 0 &&
                      " Có tài liệu chưa xác định được kết quả; mở trang chi tiết để kiểm tra trước khi tải lại."}
                  </p>
                </div>
              )}
            </section>
          )}

          {stepError && (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {stepError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* NÚT QUAY LẠI / TIẾP TỤC */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={() => (step > 1 ? goToStep(step - 1) : navigate("requests"))}
          disabled={submitting}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {step > 1 ? "Quay lại" : "Hủy"}
        </Button>
        {step < STEPS.length ? (
          <Button
            onClick={() => goToStep(step + 1)}
            disabled={submitting || (step === 1 && horses.length === 0)}
            className="gap-2"
          >
            Tiếp tục <ArrowRight className="h-4 w-4" />
          </Button>
        ) : createdRequest && uncertainDocumentKeys.size > 0 ? (
          <Button onClick={() => navigate("request-detail", { id: createdRequest.requestId })}>
            Kiểm tra tài liệu trong chi tiết yêu cầu
          </Button>
        ) : createdRequest && uploadedDocumentKeys.size === requestDocuments.length ? (
          <Button onClick={() => navigate("request-detail", { id: createdRequest.requestId })}>
            Mở yêu cầu
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || submissionUncertain}
            className="gap-2 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi...
              </>
            ) : createdRequest ? (
              <>
                <Upload className="h-4 w-4" /> Tải tài liệu còn thiếu
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Xác nhận & gửi yêu cầu
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
