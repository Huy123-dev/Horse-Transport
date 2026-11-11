import {
  formatDate,
  formatDateTime,
  invoiceCode,
  normalizePaymentStatus,
  paymentStatusLabel,
  planCode,
  requestCode,
} from "@/lib/constants";
import type { InvoiceRecord } from "@/components/views/shared/invoice-list";

export const INVOICE_CSV_HEADERS = [
  "Số hóa đơn",
  "Phần trên hóa đơn",
  "Hạng mục",
  "Số lượng",
  "Đơn vị",
  "Đơn giá",
  "Thành tiền",
  "Ghi chú",
];

type InvoiceCsvRow = (string | number | null | undefined)[];

function getInvoiceNumber(invoice: InvoiceRecord): string {
  return invoice.invoiceNumber?.trim() || invoiceCode(invoice.invoiceId);
}

function getStatusLabel(invoice: InvoiceRecord): string {
  const normalized = normalizePaymentStatus(invoice.paymentStatus, invoice.dueDate);
  if (normalized !== "PAID" && normalized !== "REFUNDED" && (invoice.isOverdue || normalized === "OVERDUE")) {
    return "Quá hạn thanh toán";
  }
  return paymentStatusLabel(invoice.paymentStatus, invoice.dueDate);
}

function getEnglishStatus(status: string): string {
  switch (status) {
    case "Đã thanh toán":
      return "PAID IN FULL";
    case "Thanh toán một phần":
      return "PARTIALLY PAID";
    case "Quá hạn thanh toán":
      return "OVERDUE";
    default:
      return "UNPAID";
  }
}

export function getInvoiceCsvRows(invoice: InvoiceRecord): InvoiceCsvRow[] {
  const invoiceNo = getInvoiceNumber(invoice);
  const requestNo = requestCode(invoice.requestId);
  const currency = invoice.currency || "USD";
  const transport = invoice.transportDetails;
  const statusLabel = getStatusLabel(invoice);
  const normalizedStatus = normalizePaymentStatus(invoice.paymentStatus, invoice.dueDate);
  const totalAmount = Number(invoice.amount) || 0;
  const paidAmount = invoice.paidAmount != null
    ? Number(invoice.paidAmount)
    : normalizedStatus === "PAID"
      ? totalAmount
      : 0;
  const remainingAmount = invoice.remainingAmount != null
    ? Number(invoice.remainingAmount)
    : Math.max(0, totalAmount - paidAmount);
  const lineItems = invoice.lineItems?.length
    ? invoice.lineItems
    : [{
        lineNo: 1,
        itemCode: "INTERNATIONAL_HORSE_TRANSPORT",
        description: transport?.originName && transport?.destinationName
          ? `Dịch vụ vận chuyển ngựa đua chuyên dụng xuyên biên giới (${transport.originName} → ${transport.destinationName})`
          : `Dịch vụ vận chuyển ngựa đua chuyên dụng xuyên biên giới — Đơn ${requestNo}`,
        category: "Dịch vụ vận chuyển trọn gói",
        quantity: 1,
        unit: "Chuyến",
        unitPrice: totalAmount,
        amount: totalAmount,
        includedInPackage: false,
      }];
  const subtotal = invoice.subtotal != null && Number(invoice.subtotal) > 0
    ? Number(invoice.subtotal)
    : lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discountAmount = Number(invoice.discountAmount) || 0;
  const additionalFees = Number(invoice.additionalFees) || 0;
  const taxAmount = Number(invoice.taxAmount) || 0;
  const dueDate = invoice.dueDate ? formatDate(invoice.dueDate) : "14 ngày kể từ ngày phát hành";
  const latestNote = invoice.paymentHistory?.[0]?.notes;
  const preparerName = invoice.preparedByName || invoice.lastUpdatedByName || "Ban Quản lý Logistics EQUIDELI";
  const rows: InvoiceCsvRow[] = [];
  const add = (
    section: string,
    item: string,
    value: string | number | null | undefined,
    notes?: string,
  ) => rows.push([invoiceNo, section, item, "", "", "", value, notes ?? ""]);

  add("A — Nhận diện hóa đơn", "Thương hiệu", "EQUIDELI — Cross-Border Racehorse Transport");
  add("A — Nhận diện hóa đơn", "Tiêu đề", "HÓA ĐƠN DỊCH VỤ / SERVICE INVOICE");

  add("B — Thông tin hóa đơn", "Số hóa đơn", invoiceNo);
  add("B — Thông tin hóa đơn", "Ngày phát hành", formatDate(invoice.issuedAt));
  add("B — Thông tin hóa đơn", "Hạn thanh toán", dueDate);
  add("B — Thông tin hóa đơn", "Mã đơn vận chuyển", requestNo);
  add("B — Thông tin hóa đơn", "Tiền tệ", `${currency} (Đô la Mỹ)`);
  add("B — Thông tin hóa đơn", "Trạng thái", statusLabel, getEnglishStatus(statusLabel));

  add("C — Đơn vị cung cấp dịch vụ", "Đơn vị", "EQUIDELI — Cross-Border Racehorse Transport");
  add("C — Đơn vị cung cấp dịch vụ", "Địa chỉ", "Khu Logistics Hàng không & Nội địa, Củ Chi, TP. Hồ Chí Minh, Việt Nam");
  add("C — Đơn vị cung cấp dịch vụ", "Email hỗ trợ", "contact@equideli.com");
  add("C — Đơn vị cung cấp dịch vụ", "Điện thoại", "+84 28 000 0000");
  add("C — Đơn vị cung cấp dịch vụ", "Bộ phận phụ trách", "Phòng Quản lý Logistics & Chứng từ Quốc tế");

  add("D — Thông tin khách hàng", "Khách hàng", invoice.customerName || "Khách hàng EQUIDELI");
  if (invoice.customerOrganization) add("D — Thông tin khách hàng", "Tổ chức / Đơn vị", invoice.customerOrganization);
  if (invoice.customerId) add("D — Thông tin khách hàng", "Mã khách hàng", invoice.customerId);
  if (invoice.customerEmail) add("D — Thông tin khách hàng", "Email liên hệ", invoice.customerEmail);
  if (invoice.customerPhone) add("D — Thông tin khách hàng", "Số điện thoại", invoice.customerPhone);
  add("D — Thông tin khách hàng", "Mã tham chiếu hồ sơ", invoice.requestId);

  add("E — Hành trình & hồ sơ ngựa", "Mã đơn", requestNo);
  if (transport?.planId) add("E — Hành trình & hồ sơ ngựa", "Kế hoạch vận chuyển", planCode(transport.planId));
  add(
    "E — Hành trình & hồ sơ ngựa",
    "Số lượng ngựa",
    transport?.horseCount && transport.horseCount > 0
      ? `${transport.horseCount} cá thể`
      : "Theo hồ sơ đơn vận chuyển",
  );
  add("E — Hành trình & hồ sơ ngựa", "Điểm khởi hành", transport?.originName || "Theo lộ trình đơn vận chuyển", transport?.originCountry || "");
  add("E — Hành trình & hồ sơ ngựa", "Điểm đích", transport?.destinationName || "Theo lộ trình đơn vận chuyển", transport?.destinationCountry || "");
  add(
    "E — Hành trình & hồ sơ ngựa",
    "Ngày khởi hành",
    formatDate(transport?.departureDate || invoice.issuedAt),
    transport?.departureDate ? formatDateTime(transport.departureDate) : "Theo kế hoạch phê duyệt",
  );
  add(
    "E — Hành trình & hồ sơ ngựa",
    "Hoàn tất bàn giao",
    formatDate(transport?.completedAt || transport?.arrivalDate || invoice.issuedAt),
    transport?.recipientName ? `Người nhận: ${transport.recipientName}` : "Biên bản bàn giao đã xác nhận",
  );
  transport?.horses?.forEach((horse, index) => {
    add(
      "E — Hành trình & hồ sơ ngựa",
      `Ngựa ${String(index + 1).padStart(2, "0")} — ${horse.name}`,
      horse.horseId.slice(0, 8).toUpperCase(),
      [
        `Microchip: ${horse.microchipId || "—"}`,
        `Giống: ${horse.breed || "Ngựa đua thuần chủng"}`,
        [horse.gender, horse.birthYear ? `Năm sinh: ${horse.birthYear}` : null].filter(Boolean).join(" · ") || "Đạt chuẩn kiểm dịch",
      ].join(" | "),
    );
  });

  lineItems.forEach((item, index) => {
    rows.push([
      invoiceNo,
      "F — Hạng mục dịch vụ",
      item.description,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.amount,
      [
        `STT: ${String(item.lineNo || index + 1).padStart(2, "0")}`,
        item.category ? `Phân loại: ${item.category}` : "",
        item.itemCode ? `Mã: ${item.itemCode}` : "",
        item.includedInPackage ? "Đã bao gồm trong gói chính" : "",
      ].filter(Boolean).join(" | "),
    ]);
  });

  add("G — Tổng hợp tài chính", "Tạm tính", subtotal, currency);
  add("G — Tổng hợp tài chính", "Chiết khấu thương mại", -discountAmount, currency);
  if (additionalFees > 0) add("G — Tổng hợp tài chính", "Phụ phí dịch vụ", additionalFees, currency);
  add("G — Tổng hợp tài chính", "Thuế dịch vụ quốc tế (Tax 0%)", taxAmount, currency);
  add("G — Tổng hợp tài chính", "TỔNG CỘNG", totalAmount, currency);
  add("G — Tổng hợp tài chính", "Đã thanh toán", paidAmount, currency);
  add("G — Tổng hợp tài chính", "CÒN PHẢI THU", remainingAmount, currency);

  add("H — Thanh toán & đối soát", "Trạng thái thanh toán", `${statusLabel} (${getEnglishStatus(statusLabel)})`);
  add("H — Thanh toán & đối soát", "Phương thức thanh toán", invoice.paymentMethod || "Chuyển khoản ngân hàng ngoại tuyến");
  add("H — Thanh toán & đối soát", "Thời hạn thanh toán", dueDate);
  add("H — Thanh toán & đối soát", "Thời điểm hoàn tất thanh toán", invoice.paidAt ? formatDateTime(invoice.paidAt) : "Đang theo dõi đối soát");
  add("H — Thanh toán & đối soát", "Ngân hàng", "Vietcombank — CN TP. Hồ Chí Minh");
  add("H — Thanh toán & đối soát", "Số tài khoản (USD)", "0071 0009 8888 68");
  add("H — Thanh toán & đối soát", "Đơn vị thụ hưởng", "CÔNG TY TNHH VẬN TẢI NGỰA EQUIDELI");
  add("H — Thanh toán & đối soát", "Nội dung chuyển khoản", `EQUIDELI ${invoiceNo} ${requestNo}`);
  if (latestNote) add("H — Thanh toán & đối soát", "Ghi chú đối soát gần nhất", latestNote);

  add(
    "I — Điều khoản thanh toán",
    "Lưu ý",
    "EQUIDELI chỉ quản lý hóa đơn, lưu trữ chứng từ và theo dõi trạng thái thanh toán. Các giao dịch thanh toán được thực hiện ngoại tuyến theo thỏa thuận giữa khách hàng và đơn vị vận chuyển. Website không tích hợp cổng thanh toán trực tuyến.",
  );
  add("J — Xác nhận & chân trang", "Đại diện đơn vị vận chuyển", "Ban Giám đốc Điều hành Vận tải — Ký tên & xác nhận dịch vụ");
  add("J — Xác nhận & chân trang", "Người lập hóa đơn", preparerName, `Ngày lập: ${formatDate(invoice.issuedAt)}`);
  add("J — Xác nhận & chân trang", "Khách hàng xác nhận", invoice.customerName || transport?.recipientName || "Đại diện khách hàng", "Ký xác nhận đối chiếu công nợ");
  add("J — Xác nhận & chân trang", "Liên hệ", "EQUIDELI · Cross-Border Racehorse Transport · Củ Chi, TP. Hồ Chí Minh · contact@equideli.com · +84 28 000 0000");
  add("J — Xác nhận & chân trang", "Mã chứng từ", invoiceNo, "Trang 1 / 1");

  return rows;
}
