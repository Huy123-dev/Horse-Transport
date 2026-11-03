// Shared business constants for EQUIDELI

export const ROLES = {
  CUSTOMER: "CUSTOMER",
  LOGISTICS_MANAGER: "LOGISTICS_MANAGER",
  TRANSPORT_SPECIALIST: "TRANSPORT_SPECIALIST",
  FLEET_COORDINATOR: "FLEET_COORDINATOR",
  DRIVER: "DRIVER",
  ESCORT: "ESCORT",
  DRIVER_ESCORT: "DRIVER_ESCORT",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  LOGISTICS_MANAGER: "Quản lý Logistics",
  TRANSPORT_SPECIALIST: "Chuyên viên vận tải & hồ sơ",
  FLEET_COORDINATOR: "Điều phối viên Đội xe & Lộ trình",
  DRIVER: "Tài xế",
  ESCORT: "Nhân viên đi kèm",
  DRIVER_ESCORT: "Tài xế & Nhân viên đi kèm",
};

export const ROLE_ICONS: Record<string, string> = {
  CUSTOMER: "User",
  LOGISTICS_MANAGER: "ShieldCheck",
  TRANSPORT_SPECIALIST: "FileCheck2",
  FLEET_COORDINATOR: "Route",
  DRIVER: "Truck",
  ESCORT: "HeartPulse",
  DRIVER_ESCORT: "Truck",
};

export function isCrewRole(roleId: string | null | undefined): boolean {
  return roleId === ROLES.DRIVER || roleId === ROLES.ESCORT || roleId === ROLES.DRIVER_ESCORT;
}

export const requestCode = (id: string | null | undefined): string => {
  if (!id || typeof id !== "string") return "YC-CHƯA GÁN";
  const cleaned = id.replaceAll("-", "").trim();
  if (!cleaned) return "YC-CHƯA GÁN";
  return `YC-${cleaned.slice(-8).toUpperCase()}`;
};
export const planCode = (id: string | null | undefined): string => {
  if (!id || typeof id !== "string") return "KH-CHƯA GÁN";
  const cleaned = id.replaceAll("-", "").trim();
  if (!cleaned) return "KH-CHƯA GÁN";
  return `KH-${cleaned.slice(-8).toUpperCase()}`;
};
export const invoiceCode = (id: string | null | undefined): string => {
  if (!id || typeof id !== "string") return "HD-CHƯA GÁN";
  const cleaned = id.replaceAll("-", "").trim();
  if (!cleaned) return "HD-CHƯA GÁN";
  return `HD-${cleaned.slice(-8).toUpperCase()}`;
};

export const inspectionCode = (id: string | null | undefined): string => {
  if (!id || typeof id !== "string") return "KD-CHƯA GÁN";
  const cleaned = id.replaceAll("-", "").trim();
  if (!cleaned) return "KD-CHƯA GÁN";
  return `KD-${cleaned.slice(-8).toUpperCase()}`;
};

// Transport request statuses
export const REQUEST_STATUS = {
  DRAFT: "Nháp",
  SUBMITTED: "Đã gửi",
  UNDER_REVIEW: "Đang thẩm định",
  RETURNED: "Trả lại bổ sung",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
} as const;

export const REQUEST_STATUS_FLOW = [
  "Nháp",
  "Đã gửi",
  "Đang thẩm định",
  "Trả lại bổ sung",
  "Đã phê duyệt",
  "Từ chối",
  "Đã hủy",
] as const;

export function transportRequestStatusLabel(status: string | null | undefined): string {
  if (!status || typeof status !== "string") return "Chưa xác định";
  switch (status.trim().toLowerCase()) {
    case "dang tham dinh":
    case "pending":
      return "Đang thẩm định";
    case "draft":
    case "nhap":
      return "Nháp";
    case "submitted":
    case "da gui":
      return "Đã gửi";
    case "under_review":
      return "Đang thẩm định";
    case "returned":
    case "tra lai bo sung":
    case "needs_info":
      return "Trả lại bổ sung";
    case "da phe duyet":
    case "approved":
      return "Đã phê duyệt";
    case "tu choi":
    case "rejected":
      return "Từ chối";
    case "da huy":
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

export function transportPlanStatusLabel(status: string | null | undefined): string {
  if (!status || typeof status !== "string") return "Chưa xác định";
  switch (status.trim().toLowerCase()) {
    case "dang lap ke hoach":
    case "planning":
      return "Đang lập kế hoạch";
    case "san sang":
    case "ready":
      return "Sẵn sàng";
    case "dang thuc hien":
    case "in progress":
    case "in_progress":
      return "Đang thực hiện";
    case "paused":
    case "tam dung":
      return "Tạm dừng";
    case "hoan thanh":
    case "completed":
      return "Hoàn thành";
    case "da huy":
    case "cancelled":
    case "canceled":
      return "Đã hủy";
    default:
      return status;
  }
}

export function formatRouteDetails(routeDetails: string | null | undefined): string {
  if (!routeDetails || typeof routeDetails !== "string") return "Chưa có thông tin tuyến";
  const trimmed = routeDetails.trim();
  if (!trimmed) return "Chưa có thông tin tuyến";

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.route) && parsed.route.length > 0) {
        return parsed.route.filter(Boolean).join(" ➔ ");
      }
      if (Array.isArray(parsed.stops) && parsed.stops.length > 0) {
        return parsed.stops.filter(Boolean).join(" ➔ ");
      }
      if (parsed.origin && parsed.destination) {
        return `${parsed.origin} ➔ ${parsed.destination}`;
      }
      if (parsed.fixture) {
        return "Lộ trình nội địa";
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(Boolean).join(" ➔ ");
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }

  const cleaned = trimmed.replaceAll("->", "➔").replaceAll("→", "➔");
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    return "Lộ trình vận chuyển";
  }
  return cleaned;
}

export function assetStatusLabel(status: string | null | undefined): string {
  if (!status || typeof status !== "string") return "Chưa xác định";
  switch (status.trim().toLowerCase()) {
    case "san sang su dung":
    case "available":
      return "Sẵn sàng";
    case "dang van hanh":
    case "in_use":
    case "in use":
      return "Đang vận hành";
    case "bao tri":
    case "maintenance":
      return "Bảo trì";
    default:
      return status;
  }
}

export function inspectionStatusLabel(status: string | null | undefined): string {
  if (!status || typeof status !== "string") return "Chưa xác định";
  switch (status.trim().toLowerCase()) {
    case "cho xu ly":
    case "pending":
      return "Chờ kiểm tra";
    case "dang xu ly":
    case "processing":
      return "Đang kiểm tra";
    case "yeu cau bo sung ho so":
    case "needs_info":
      return "Cần bổ sung";
    case "da phe duyet":
    case "approved":
      return "Đã phê duyệt";
    case "tu choi":
    case "rejected":
      return "Từ chối";
    default:
      return status;
  }
}

export function incidentStatusLabel(status: string | null | undefined): string {
  if (!status || typeof status !== "string") return "Chưa xác định";
  switch (status.trim().toLowerCase()) {
    case "new":
    case "moi":
      return "Mới";
    case "handling":
    case "in_progress":
    case "dang xu ly":
      return "Đang xử lý";
    case "resolved":
    case "da giai quyet":
      return "Đã giải quyết";
    case "cost_approved":
    case "da phe duyet chi phi":
      return "Đã phê duyệt chi phí";
    default:
      return status;
  }
}

// Document review statuses
export const DOC_STATUS = {
  PENDING: "Chờ nộp",
  SUBMITTED: "Đã nộp",
  REVIEWING: "Đang kiểm tra",
  NEED_MORE: "Cần bổ sung",
  APPROVED: "Đã chấp thuận",
  EXPIRED: "Hết hạn",
} as const;

// Inspection statuses
export const INSPECTION_STATUS = {
  PENDING: "Chờ kiểm tra",
  REVIEWING: "Đang kiểm tra",
  NEED_MORE: "Cần bổ sung",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Từ chối",
} as const;

// Plan statuses
export const PLAN_STATUS = {
  PLANNING: "Đang lập kế hoạch",
  READY: "Sẵn sàng",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  PAUSED: "Tạm dừng",
} as const;

// Incident statuses
export const INCIDENT_STATUS = {
  NEW: "Mới",
  HANDLING: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  COST_APPROVED: "Đã phê duyệt chi phí",
} as const;

// Stop types
export const STOP_TYPES: Record<string, string> = {
  ORIGIN: "Điểm xuất phát",
  TRANSIT: "Trung chuyển",
  CUSTOMS: "Thông quan",
  QUARANTINE: "Kiểm dịch",
  REST: "Nghỉ dưỡng",
  REFUEL: "Tiếp nhiên liệu",
  DESTINATION: "Điểm đến",
};

// Status color mapping for badges
export function statusTone(status: string | null | undefined): "success" | "warning" | "danger" | "info" | "neutral" {
  if (!status || typeof status !== "string") return "neutral";
  const s = status.toLowerCase();
  if (["đã phê duyệt", "da phe duyet", "approved", "đã chấp thuận", "hoàn thành", "completed", "sẵn sàng", "ready", "đã giải quyết", "đã thanh toán", "paid", "đã xác nhận", "tốt"].some((k) => s.includes(k))) return "success";
  if (["đang thẩm định", "dang tham dinh", "pending", "đang kiểm tra", "dang xu ly", "đang lập kế hoạch", "dang lap ke hoach", "planning", "đang thực hiện", "in_progress", "đang xử lý", "đang vận hành", "chờ nộp", "chờ kiểm tra", "cho xu ly", "chờ xác nhận", "mới", "đã gửi", "đã nộp", "hơi kém", "chưa đến"].some((k) => s.includes(k))) return "info";
  if (["trả lại", "cần bổ sung", "yeu cau bo sung", "needs_info", "tạm dừng", "paused", "chưa thanh toán", "unpaid", "hơi kích động", "hơi kém"].some((k) => s.includes(k))) return "warning";
  if (["từ chối", "tu choi", "rejected", "đã hủy", "da huy", "cancelled", "hết hạn", "expired", "sos"].some((k) => s.includes(k))) return "danger";
  return "neutral";
}

export const CURRENCIES: Record<string, string> = {
  USD: "$",
  JPY: "¥",
  VND: "₫",
  EUR: "€",
};

export function formatMoney(amount: number | null | undefined, currency: string = "USD"): string {
  if (amount == null) return "—";
  const num = Number(amount);
  if (isNaN(num)) return "—";

  const upperCurr = (currency || "USD").toUpperCase();
  if (upperCurr === "USD") {
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (upperCurr === "JPY") {
    return `¥${num.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
  }
  if (upperCurr === "VND") {
    return `${num.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫`;
  }
  if (upperCurr === "EUR") {
    return `€${num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const symbol = CURRENCIES[upperCurr] || `${upperCurr} `;
  return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Compact USD format for tables (e.g., "8,250.00")
export function formatUSD(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUSDCompact(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `USD ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// Deadline evaluation — compares ETA with deadline
export type DeadlineStatus = "Đúng kế hoạch" | "Có nguy cơ trễ" | "Không đáp ứng deadline" | "Chưa đủ dữ liệu đánh giá";

export function evaluateDeadline(
  eta: Date | string | null | undefined,
  deadline: Date | string | null | undefined,
  hasTimezone: boolean
): { status: DeadlineStatus; delayHours: number | null; description: string } {
  if (!eta || !deadline) {
    return { status: "Chưa đủ dữ liệu đánh giá", delayHours: null, description: "Thiếu ETA hoặc deadline để đánh giá" };
  }
  if (!hasTimezone) {
    return { status: "Chưa đủ dữ liệu đánh giá", delayHours: null, description: "Thiếu múi giờ deadline — không thể đánh giá chính xác" };
  }

  const etaDate = typeof eta === "string" ? new Date(eta) : eta;
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const diffMs = etaDate.getTime() - deadlineDate.getTime();
  const delayHours = Math.round(diffMs / (1000 * 60 * 60));

  if (delayHours <= 0) {
    return { status: "Đúng kế hoạch", delayHours: 0, description: `ETA (${formatDateTime(etaDate)}) không muộn hơn deadline (${formatDateTime(deadlineDate)})` };
  }
  if (delayHours <= 24) {
    return { status: "Có nguy cơ trễ", delayHours, description: `ETA muộn hơn deadline ${delayHours} giờ — có thể xử lý theo phương án thay thế` };
  }
  return { status: "Không đáp ứng deadline", delayHours, description: `ETA muộn hơn deadline ${delayHours} giờ — cần thay đổi phương án hoặc điều chỉnh lịch trình` };
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
