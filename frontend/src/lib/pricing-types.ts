export type PricingUnit = "PER_HORSE" | "PER_REQUEST" | "PER_TRIP";

export interface PricingCatalogItem {
  code: string;
  name: string;
  category: "PACKAGE" | "SERVICE";
  benefits: string | null;
  priceUsd: number | null;
  unitType: PricingUnit | null;
  required: boolean;
  includedServiceCodes: string[];
  priceConfigured: boolean;
  unitConfigured: boolean;
  updatedAt: string | null;
}

export interface PricingQuoteLine {
  code: string;
  name: string;
  category: "PACKAGE" | "SERVICE";
  benefits: string | null;
  unitType: PricingUnit | null;
  quantity: number | null;
  unitPriceUsd: number | null;
  lineTotalUsd: number | null;
  required: boolean;
  includedInPackage: boolean;
  priceConfigured: boolean;
  unitConfigured: boolean;
}

export interface PricingQuote {
  status: "DRAFT" | "CONFIRMED" | "LEGACY";
  currency: string;
  totalAmount: number | null;
  legacyAmount: number | null;
  legacyCurrency: string | null;
  canConfirm: boolean;
  missingItems: string[];
  lines: PricingQuoteLine[];
  confirmedAt: string | null;
  packageCode: string | null;
  selectedServiceCodes: string[];
  fingerprint: string | null;
}

export function pricingUnitLabel(unit: PricingUnit | null): string {
  switch (unit) {
    case "PER_HORSE": return "ngựa";
    case "PER_REQUEST": return "yêu cầu";
    case "PER_TRIP": return "chuyến";
    default: return "Chưa có";
  }
}
