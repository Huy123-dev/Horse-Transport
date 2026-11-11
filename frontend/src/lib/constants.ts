/**
 * ============================================================================
 * TỆP HẰNG SỐ VÀ HÀM TIỆN ÍCH NGHIỆP VỤ DÙNG CHUNG (constants.ts)
 * ============================================================================
 * Tệp này tập trung toàn bộ:
 * 1. Danh mục vai trò người dùng (Roles) và nhãn hiển thị tiếng Việt.
 * 2. Hàm rút gọn mã định danh UUID thành mã nghiệp vụ dễ đọc (YC-..., KH-..., HD-...).
 * 3. Hàm chuyển đổi trạng thái từ mã tiếng Anh của Backend sang nhãn tiếng Việt chuẩn.
 * 4. Hàm chuẩn hóa trạng thái thanh toán (UNPAID, PARTIALLY_PAID, PAID, OVERDUE)
 *    và xác định màu sắc hiển thị (statusTone) theo đúng ý nghĩa nghiệp vụ.
 * 5. Hàm định dạng tiền tệ (USD, VND, JPY, EUR) và ngày giờ theo chuẩn Việt Nam.
 */

// Danh sách mã vai trò người dùng trong hệ thống EQUIDELI (khớp với cơ sở dữ liệu)
export const ROLES = {
  CUSTOMER: "CUSTOMER",
  LOGISTICS_MANAGER: "LOGISTICS_MANAGER",
  TRANSPORT_SPECIALIST: "TRANSPORT_SPECIALIST",
  FLEET_COORDINATOR: "FLEET_COORDINATOR",
  DRIVER: "DRIVER",
  ESCORT: "ESCORT",
  DRIVER_ESCORT: "DRIVER_ESCORT",
} as const;

// Bảng ánh xạ từ mã vai trò sang tên chức vụ tiếng Việt hiển thị trên giao diện
export const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  LOGISTICS_MANAGER: "Quản lý Logistics",
  TRANSPORT_SPECIALIST: "Chuyên viên vận tải & hồ sơ",
  FLEET_COORDINATOR: "Điều phối viên Đội xe & Lộ trình",
  DRIVER: "Tài xế",
  ESCORT: "Nhân viên đi kèm",
  DRIVER_ESCORT: "Tài xế & Nhân viên đi kèm",
};

// Tên biểu tượng (Lucide Icon) đại diện cho từng vai trò
export const ROLE_ICONS: Record<string, string> = {
  CUSTOMER: "User",
  LOGISTICS_MANAGER: "ShieldCheck",
  TRANSPORT_SPECIALIST: "FileCheck2",
  FLEET_COORDINATOR: "Route",
  DRIVER: "Truck",
  ESCORT: "HeartPulse",
  DRIVER_ESCORT: "Truck",
};

/**
 * Kiểm tra xem vai trò hiện tại có thuộc nhóm nhân sự vận hành hiện trường
 * (Tài xế hoặc Nhân viên đi kèm chăm sóc ngựa) hay không.
 */
export function isCrewRole(roleId: string | null | undefined): boolean {
  return (
    roleId === ROLES.DRIVER ||
    roleId === ROLES.ESCORT ||
    roleId === ROLES.DRIVER_ESCORT
  );
}

/**
 * Các hàm rút gọn mã UUID (36 ký tự) thành mã nghiệp vụ ngắn gọn (8 ký tự cuối viết hoa)
 * giúp người dùng dễ đọc, dễ tra cứu và trao đổi khi vận hành:
 * - YC-XXXXXXXX: Mã yêu cầu vận chuyển (Yêu cầu)
 * - KH-XXXXXXXX: Mã kế hoạch vận chuyển (Kế hoạch)
 * - HD-XXXXXXXX: Mã hóa đơn dịch vụ (Hóa đơn)
 * - KD-XXXXXXXX: Mã hồ sơ kiểm định / thú y (Kiểm định)
 */
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

// Danh mục trạng thái của Yêu cầu vận chuyển (Transport Request)
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

/**
 * Chuyển đổi mã trạng thái yêu cầu vận chuyển từ Backend (tiếng Anh hoặc không dấu)
 * sang nhãn tiếng Việt chuẩn để hiển thị thống nhất trên các bảng và huy hiệu.
 */
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

/**
 * Chuyển đổi mã trạng thái Kế hoạch / Chuyến vận chuyển (Transport Plan)
 * sang nhãn tiếng Việt chuẩn.
 */
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

/**
 * Phân tích và định dạng thông tin lộ trình vận chuyển (routeDetails).
 * Hỗ trợ cả chuỗi văn bản thuần túy lẫn chuỗi JSON lưu danh sách điểm dừng (stops/route)
 * để nối thành chuỗi dễ đọc có mũi tên "Điểm đi ➔ Điểm đến".
 */
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
      // Bỏ qua lỗi parse JSON và tiếp tục xử lý như chuỗi thông thường
    }
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(Boolean).join(" ➔ ");
      }
    } catch {
      // Bỏ qua lỗi parse JSON
    }
  }

  const cleaned = trimmed.replaceAll("->", "➔").replaceAll("→", "➔");
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    return "Lộ trình vận chuyển";
  }
  return cleaned;
}

/**
 * Chuyển đổi mã trạng thái phương tiện vận chuyển (Transport Asset) sang tiếng Việt.
 */
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

/**
 * Chuyển đổi mã trạng thái hồ sơ kiểm định / thú y (Inspection) sang tiếng Việt.
 */
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

/**
 * Chuyển đổi mã trạng thái sự cố hành trình (Incident) sang tiếng Việt.
 */
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

// Trạng thái thẩm định tài liệu đính kèm
export const DOC_STATUS = {
  PENDING: "Chờ nộp",
  SUBMITTED: "Đã nộp",
  REVIEWING: "Đang kiểm tra",
  NEED_MORE: "Cần bổ sung",
  APPROVED: "Đã chấp thuận",
  EXPIRED: "Hết hạn",
} as const;

// Trạng thái kiểm định
export const INSPECTION_STATUS = {
  PENDING: "Chờ kiểm tra",
  REVIEWING: "Đang kiểm tra",
  NEED_MORE: "Cần bổ sung",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Từ chối",
} as const;

// Trạng thái kế hoạch vận chuyển
export const PLAN_STATUS = {
  PLANNING: "Đang lập kế hoạch",
  READY: "Sẵn sàng",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  PAUSED: "Tạm dừng",
} as const;

// Trạng thái sự cố
export const INCIDENT_STATUS = {
  NEW: "Mới",
  HANDLING: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  COST_APPROVED: "Đã phê duyệt chi phí",
} as const;

// Danh mục loại điểm dừng trên hành trình vận chuyển ngựa
export const STOP_TYPES: Record<string, string> = {
  ORIGIN: "Điểm xuất phát",
  TRANSIT: "Trung chuyển",
  CUSTOMS: "Thông quan",
  QUARANTINE: "Kiểm dịch",
  REST: "Nghỉ dưỡng",
  REFUEL: "Tiếp nhiên liệu",
  DESTINATION: "Điểm đến",
};

/**
 * ============================================================================
 * NGHIỆP VỤ TRẠNG THÁI THANH TOÁN HÓA ĐƠN (PAYMENT STATUS LOGIC)
 * ============================================================================
 * Lưu ý nghiệp vụ quan trọng:
 * - Hệ thống EQUIDELI chỉ quản lý hóa đơn, lưu trữ chứng từ và theo dõi trạng thái.
 * - Các giao dịch thanh toán được thực hiện ngoại tuyến (chuyển khoản ngân hàng hoặc trực tiếp).
 *
 * Ý nghĩa của các mã trạng thái thanh toán:
 * - UNPAID ("Chưa thanh toán"): Hóa đơn đã phát hành nhưng khách hàng chưa thanh toán khoản nào
 *   và vẫn còn trong thời hạn thanh toán.
 * - PARTIALLY_PAID ("Thanh toán một phần"): Khách hàng đã trả trước một phần giá trị hóa đơn
 *   (0 < paidAmount < amount) và phần còn lại chưa quá hạn.
 * - PAID ("Đã thanh toán"): Khách hàng đã hoàn tất thanh toán toàn bộ giá trị hóa đơn.
 * - OVERDUE ("Quá hạn thanh toán"): Hóa đơn chưa được thanh toán đủ (UNPAID hoặc PARTIALLY_PAID)
 *   nhưng đã vượt quá ngày hạn thanh toán (dueDate < ngày hiện tại).
 * - REFUNDED ("Đã hoàn tiền"): Hóa đơn đã được hoàn trả lại tiền theo thỏa thuận.
 */
export type PaymentStatusCode = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "REFUNDED";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusCode, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

/**
 * Chuẩn hóa chuỗi trạng thái thanh toán từ Backend (hoặc dữ liệu lịch sử tiếng Việt)
 * về một trong 5 mã chuẩn: PAID, REFUNDED, OVERDUE, PARTIALLY_PAID, UNPAID.
 *
 * Nếu hóa đơn chưa thanh toán đủ (UNPAID hoặc PARTIALLY_PAID) và có truyền vào `dueDate`,
 * hàm sẽ tự động so sánh với ngày hiện tại (00:00:00) để nhận diện trạng thái `OVERDUE` (Quá hạn).
 */
export function normalizePaymentStatus(
  status: string | null | undefined,
  dueDate?: string | null
): PaymentStatusCode {
  const s = (status || "").trim().toUpperCase();

  // 1. Trường hợp đã thanh toán đủ hoặc đã hoàn tiền thì không bị tính quá hạn
  if (s === "PAID" || s === "ĐÃ THANH TOÁN" || s === "DA THANH TOAN" || s === "COMPLETED") {
    return "PAID";
  }
  if (s === "REFUNDED" || s === "ĐÃ HOÀN TIỀN" || s === "DA HOAN TIEN") {
    return "REFUNDED";
  }

  // 2. Trường hợp Backend đã đánh dấu sẵn là quá hạn
  if (
    s === "OVERDUE" ||
    s === "QUÁ HẠN" ||
    s === "QUÁ HẠN THANH TOÁN" ||
    s === "QUA HAN" ||
    s === "QUA HAN THANH TOAN"
  ) {
    return "OVERDUE";
  }

  // Hàm phụ kiểm tra xem ngày hạn thanh toán (dueDate) đã trôi qua so với hôm nay chưa
  const isPastDueDate = (): boolean => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(due.getTime()) && due < today;
  };

  // 3. Trường hợp đã thanh toán một phần: nếu đã quá hạn chót thì chuyển sang OVERDUE
  if (
    s === "PARTIALLY_PAID" ||
    s === "PARTIAL" ||
    s === "PARTIALLY PAID" ||
    s === "THANH TOÁN MỘT PHẦN" ||
    s === "ĐÃ THANH TOÁN MỘT PHẦN" ||
    s === "THANH TOAN MOT PHAN" ||
    s === "DA THANH TOAN MOT PHAN"
  ) {
    if (isPastDueDate()) return "OVERDUE";
    return "PARTIALLY_PAID";
  }

  // 4. Mặc định là chưa thanh toán: kiểm tra thêm hạn thanh toán nếu có
  if (isPastDueDate()) return "OVERDUE";
  return "UNPAID";
}

/**
 * Chuyển mã trạng thái thanh toán từ Backend thành nhãn tiếng Việt chuẩn hóa:
 * - UNPAID -> "Chưa thanh toán"
 * - PARTIALLY_PAID -> "Thanh toán một phần"
 * - PAID -> "Đã thanh toán"
 * - OVERDUE -> "Quá hạn thanh toán"
 */
export function paymentStatusLabel(
  status: string | null | undefined,
  dueDate?: string | null
): string {
  const code = normalizePaymentStatus(status, dueDate);
  return PAYMENT_STATUS_LABELS[code] || "Chưa thanh toán";
}

/**
 * Xác định tông màu hiển thị (success, warning, danger, info, neutral) cho huy hiệu StatusBadge.
 *
 * Nguyên tắc ưu tiên kiểm tra rất quan trọng:
 * 1. Kiểm tra nhóm `danger` (Đỏ san hô #F0786B) trước tiên để làm nổi bật ngay các hóa đơn
 *    "Quá hạn thanh toán", đơn bị "Từ chối", "Đã hủy" hoặc tài khoản "Bị hạn chế".
 * 2. Kiểm tra nhóm `warning` (Vàng hổ phách #F2BD65) TRƯỚC nhóm `success` để chuỗi
 *    "Thanh toán một phần" hoặc "Chưa thanh toán" khớp đúng màu cảnh báo vàng,
 *    tránh bị khớp nhầm với từ khóa con "đã thanh toán" của nhóm `success`.
 * 3. Kiểm tra nhóm `success` (Xanh lá #81C995) cho các trạng thái hoàn tất tích cực
 *    như "Đã thanh toán", "Đã phê duyệt", "Hoàn thành", "Sẵn sàng".
 * 4. Kiểm tra nhóm `info` (Xanh dương sáng #91BCEB) cho các tiến trình đang xử lý.
 */
export function statusTone(
  status: string | null | undefined
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (!status || typeof status !== "string") return "neutral";
  const s = status.trim().toLowerCase();

  // 1. Nhóm Danger / Error (Đỏ san hô #F0786B): Quá hạn, Từ chối, Đã hủy, Sự cố, Bị hạn chế
  if (
    [
      "quá hạn",
      "qua han",
      "overdue",
      "từ chối",
      "tu choi",
      "rejected",
      "đã hủy",
      "da huy",
      "cancelled",
      "canceled",
      "hết hạn",
      "expired",
      "sos",
      "khẩn cấp",
      "nghiêm trọng",
      "thất bại",
      "failed",
      "bị hạn chế",
      "restricted",
      "không đáp ứng deadline",
    ].some((k) => s.includes(k))
  ) {
    return "danger";
  }

  // 2. Nhóm Warning (Vàng hổ phách #F2BD65): Thanh toán một phần, Chưa thanh toán, Chờ duyệt, Tạm dừng
  if (
    [
      "thanh toán một phần",
      "thanh toan mot phan",
      "partially_paid",
      "partially paid",
      "chưa thanh toán",
      "chua thanh toan",
      "unpaid",
      "trả lại",
      "cần bổ sung",
      "yeu cau bo sung",
      "needs_info",
      "tạm dừng",
      "tam dung",
      "paused",
      "bảo trì",
      "bao tri",
      "maintenance",
      "chờ phê duyệt",
      "chờ duyệt",
      "chờ xác nhận",
      "chờ kiểm tra",
      "chờ nộp",
      "cho xu ly",
      "pending",
      "có nguy cơ trễ",
      "hơi kích động",
      "hơi kém",
    ].some((k) => s.includes(k))
  ) {
    return "warning";
  }

  // 3. Nhóm Success (Xanh lá #81C995): Đã thanh toán, Đã phê duyệt, Hoàn thành, Sẵn sàng
  if (
    [
      "đã phê duyệt",
      "da phe duyet",
      "approved",
      "đã chấp thuận",
      "hoàn thành",
      "hoan thanh",
      "completed",
      "sẵn sàng",
      "san sang",
      "ready",
      "khả dụng",
      "available",
      "đã giải quyết",
      "da giai quyet",
      "resolved",
      "đã thanh toán",
      "da thanh toan",
      "paid",
      "đã xác nhận",
      "đang hoạt động",
      "active",
      "tốt",
      "đúng kế hoạch",
    ].some((k) => s.includes(k))
  ) {
    return "success";
  }

  // 4. Nhóm Information (Xanh dương sáng #91BCEB): Đang thực hiện, Đang thẩm định, Đã gửi
  if (
    [
      "đang thẩm định",
      "dang tham dinh",
      "under_review",
      "đang kiểm tra",
      "dang xu ly",
      "đang lập kế hoạch",
      "dang lap ke hoach",
      "planning",
      "đang thực hiện",
      "in_progress",
      "in progress",
      "đang vận chuyển",
      "in_transit",
      "đang xử lý",
      "đang vận hành",
      "in_use",
      "mới",
      "new",
      "đã gửi",
      "submitted",
      "đã nộp",
      "đã hoàn tiền",
      "refunded",
      "chưa đến",
    ].some((k) => s.includes(k))
  ) {
    return "info";
  }

  return "neutral";
}

// Bảng ký hiệu tiền tệ quốc tế hỗ trợ trong hệ thống
export const CURRENCIES: Record<string, string> = {
  USD: "$",
  JPY: "¥",
  VND: "₫",
  EUR: "€",
};

/**
 * Định dạng số tiền kèm ký hiệu tiền tệ tương ứng (mặc định là USD).
 * Ví dụ: formatMoney(8250, "USD") -> "$8,250.00"
 */
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

// Định dạng số USD ngắn gọn không kèm ký hiệu (dùng trong bảng số liệu)
export function formatUSD(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUSDCompact(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `USD ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// Đánh giá tiến độ thời gian dự kiến đến (ETA) so với hạn chót giao ngựa (Deadline)
export type DeadlineStatus =
  | "Đúng kế hoạch"
  | "Có nguy cơ trễ"
  | "Không đáp ứng deadline"
  | "Chưa đủ dữ liệu đánh giá";

export function evaluateDeadline(
  eta: Date | string | null | undefined,
  deadline: Date | string | null | undefined,
  hasTimezone: boolean
): { status: DeadlineStatus; delayHours: number | null; description: string } {
  if (!eta || !deadline) {
    return {
      status: "Chưa đủ dữ liệu đánh giá",
      delayHours: null,
      description: "Thiếu thời gian dự kiến đến (ETA) hoặc hạn chót (Deadline) để đánh giá",
    };
  }
  if (!hasTimezone) {
    return {
      status: "Chưa đủ dữ liệu đánh giá",
      delayHours: null,
      description: "Thiếu múi giờ hạn chót — không thể đánh giá chính xác",
    };
  }

  const etaDate = typeof eta === "string" ? new Date(eta) : eta;
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const diffMs = etaDate.getTime() - deadlineDate.getTime();
  const delayHours = Math.round(diffMs / (1000 * 60 * 60));

  if (delayHours <= 0) {
    return {
      status: "Đúng kế hoạch",
      delayHours: 0,
      description: `Thời gian dự kiến đến (${formatDateTime(etaDate)}) không muộn hơn hạn chót (${formatDateTime(deadlineDate)})`,
    };
  }
  if (delayHours <= 24) {
    return {
      status: "Có nguy cơ trễ",
      delayHours,
      description: `Thời gian dự kiến đến muộn hơn hạn chót ${delayHours} giờ — có thể xử lý theo phương án thay thế`,
    };
  }
  return {
    status: "Không đáp ứng deadline",
    delayHours,
    description: `Thời gian dự kiến đến muộn hơn hạn chót ${delayHours} giờ — cần thay đổi phương án hoặc điều chỉnh lịch trình`,
  };
}

/**
 * Định dạng ngày tháng theo chuẩn Việt Nam (dd/mm/yyyy).
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Định dạng ngày giờ đầy đủ theo chuẩn Việt Nam (hh:mm dd/mm/yyyy).
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
