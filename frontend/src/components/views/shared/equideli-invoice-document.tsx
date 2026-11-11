"use client";

/**
 * ============================================================================
 * EQUIDELI — MẪU HÓA ĐƠN DỊCH VỤ VẬN CHUYỂN NGỰA ĐUA QUỐC TẾ CHUẨN A4
 * (EQUIDELI PREMIUM INTERNATIONAL HORSE TRANSPORT A4 INVOICE DOCUMENT)
 * ============================================================================
 * Component này thiết kế hóa đơn dịch vụ theo tiêu chuẩn chứng từ thương mại
 * và logistics quốc tế (tham chiếu bố cục Stripe Invoicing, Xero & chứng từ
 * vận tải ngựa chuyên dụng), bao gồm đầy đủ 10 phân khu từ A đến J:
 *
 * - Phân khu A (Header): Logo chính thức `/equideli-logo.png`, tên thương hiệu
 *   EQUIDELI, khẩu hiệu "CROSS-BORDER RACEHORSE TRANSPORT", thông tin liên hệ,
 *   tiêu đề song ngữ "HÓA ĐƠN DỊCH VỤ / SERVICE INVOICE", số hóa đơn và huy hiệu trạng thái.
 * - Phân khu B (Invoice Information): Số hóa đơn, ngày phát hành, hạn thanh toán,
 *   mã đơn vận chuyển, loại tiền tệ (USD) và trạng thái hóa đơn.
 * - Phân khu C (Seller Information): Thông tin đơn vị vận chuyển EQUIDELI.
 * - Phân khu D (Customer Information): Thông tin khách hàng từ cơ sở dữ liệu.
 * - Phân khu E (Transport Details): Tuyến đường đi - đến, ngày khởi hành, ngày
 *   hoàn tất bàn giao, số lượng ngựa và bảng kê từng cá thể ngựa (Tên, Mã ngựa,
 *   Microchip ID, Giống ngựa).
 * - Phân khu F (Itemized Service Table): Bảng chi tiết 6 cột (STT, Mô tả dịch vụ,
 *   Số lượng, Đơn vị, Đơn giá, Thành tiền) lấy từ dữ liệu báo giá/đơn hàng thực tế.
 * - Phân khu G (Financial Summary): Tạm tính, Chiết khấu, Phụ phí, Thuế, Tổng cộng,
 *   Số tiền đã thanh toán và Số dư còn phải thu.
 * - Phân khu H (Payment Information): Trạng thái thanh toán, hạn chót, phương thức
 *   thanh toán ngoại tuyến, hướng dẫn chuyển khoản ngân hàng và ghi chú đối soát.
 * - Phân khu I (Payment Terms & Notice): Tuyên bố nguyên tắc thanh toán ngoại tuyến.
 * - Phân khu J (Signature & Footer): Khu vực ký xác nhận của Đại diện đơn vị vận chuyển,
 *   Người lập hóa đơn, Khách hàng xác nhận và chân trang đánh số "Trang 1 / 1".
 * ============================================================================
 */

import {
  formatDate,
  formatDateTime,
  formatMoney,
  invoiceCode,
  requestCode,
  planCode,
  normalizePaymentStatus,
} from "@/lib/constants";
import type { InvoiceRecord } from "./invoice-list";
import { resolveInvoiceStatusLabel } from "./invoice-list";

interface EquideliInvoiceDocumentProps {
  invoice: InvoiceRecord;
}

/**
 * Định dạng mã số hóa đơn chuẩn quốc tế (ưu tiên `invoiceNumber` từ Backend như `HD-2026-00001`,
 * nếu chưa có thì sử dụng hàm `invoiceCode(invoiceId)`).
 */
export function getFormattedInvoiceNumber(invoice: Pick<InvoiceRecord, "invoiceId" | "invoiceNumber" | "issuedAt">): string {
  if (invoice.invoiceNumber && invoice.invoiceNumber.trim().length > 0) {
    return invoice.invoiceNumber.trim();
  }
  return invoiceCode(invoice.invoiceId);
}

/**
 * Trả về bảng màu hiển thị huy hiệu trạng thái trên nền giấy trắng A4
 * đảm bảo độ tương phản cao cả trên màn hình lẫn khi xuất PDF / in ấn.
 */
function getDocumentStatusBadgeStyle(statusLabel: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  enLabel: string;
} {
  switch (statusLabel) {
    case "Đã thanh toán":
      return {
        bg: "#E8F5EC",
        text: "#1B5E32",
        border: "#81C995",
        dot: "#2E854B",
        enLabel: "PAID IN FULL",
      };
    case "Thanh toán một phần":
      return {
        bg: "#FEF6E6",
        text: "#8A5600",
        border: "#F2BD65",
        dot: "#D68B00",
        enLabel: "PARTIALLY PAID",
      };
    case "Quá hạn thanh toán":
      return {
        bg: "#FDECEB",
        text: "#9E2A1C",
        border: "#F0786B",
        dot: "#D93829",
        enLabel: "OVERDUE",
      };
    default:
      return {
        bg: "#FBF3E4",
        text: "#7A4F10",
        border: "#D6A15D",
        dot: "#B87D2D",
        enLabel: "UNPAID",
      };
  }
}

export function EquideliInvoiceDocument({ invoice }: EquideliInvoiceDocumentProps) {
  const statusLabel = resolveInvoiceStatusLabel(invoice);
  const badgeStyle = getDocumentStatusBadgeStyle(statusLabel);
  const formattedInvoiceNo = getFormattedInvoiceNumber(invoice);
  const formattedRequestNo = requestCode(invoice.requestId);

  // Tính toán các chỉ số tài chính từ bản ghi thực tế
  const totalAmount = Number(invoice.amount) || 0;
  const normalizedStatus = normalizePaymentStatus(invoice.paymentStatus, invoice.dueDate);
  const isPaid = normalizedStatus === "PAID";
  const paidAmount = invoice.paidAmount != null ? Number(invoice.paidAmount) : isPaid ? totalAmount : 0;
  const remainingAmount =
    invoice.remainingAmount != null
      ? Number(invoice.remainingAmount)
      : Math.max(0, totalAmount - paidAmount);

  // Lấy danh sách hạng mục dịch vụ từ Backend; nếu bản ghi lịch sử chưa có mảng lineItems thì dựng 1 dòng chuẩn từ dữ liệu đơn
  const transport = invoice.transportDetails;
  const lineItems =
    invoice.lineItems && invoice.lineItems.length > 0
      ? invoice.lineItems
      : [
          {
            lineNo: 1,
            itemCode: "INTERNATIONAL_HORSE_TRANSPORT",
            description:
              transport?.originName && transport?.destinationName
                ? `Dịch vụ vận chuyển ngựa đua chuyên dụng xuyên biên giới (${transport.originName} → ${transport.destinationName})`
                : `Dịch vụ vận chuyển ngựa đua chuyên dụng xuyên biên giới — Đơn ${formattedRequestNo}`,
            category: "Dịch vụ vận chuyển trọn gói",
            quantity: 1,
            unit: "Chuyến",
            unitPrice: totalAmount,
            amount: totalAmount,
            includedInPackage: false,
          },
        ];

  const subtotal =
    invoice.subtotal != null && Number(invoice.subtotal) > 0
      ? Number(invoice.subtotal)
      : lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const discountAmount = Number(invoice.discountAmount) || 0;
  const additionalFees = Number(invoice.additionalFees) || 0;
  const taxAmount = Number(invoice.taxAmount) || 0;

  // Ghi chú đối soát gần nhất từ lịch sử thanh toán (nếu có)
  const latestNote =
    invoice.paymentHistory && invoice.paymentHistory.length > 0
      ? invoice.paymentHistory[0].notes
      : null;

  const dueDateDisplay = invoice.dueDate ? formatDate(invoice.dueDate) : "14 ngày kể từ ngày phát hành";
  const preparerName = invoice.preparedByName || invoice.lastUpdatedByName || "Ban Quản lý Logistics EQUIDELI";

  return (
    <div
      id="equideli-a4-invoice-sheet"
      className="print-area mx-auto w-full max-w-[210mm] rounded-xl border border-[#D6A15D]/45 bg-[#FFFFFF] text-[#1F1612] shadow-2xl print:max-w-none print:rounded-none print:border-none print:shadow-none"
      style={{
        fontFamily: '"Be Vietnam Pro", "Inter", system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Dải viền thương hiệu trên cùng (Top Brand Accent Bar) */}
      <div className="h-2.5 w-full rounded-t-xl bg-gradient-to-r from-[#1F1612] via-[#713F2C] to-[#D6A15D] print:rounded-none" />

      <div className="space-y-6 p-6 sm:p-10 print:space-y-5 print:p-6">
        {/* ====================================================================
            SECTION A – HEADER (TIÊU ĐỀ HÓA ĐƠN & NHẬN DIỆN THƯƠNG HIỆU EQUIDELI)
            ==================================================================== */}
        <header className="flex flex-col justify-between gap-6 border-b-2 border-[#D6A15D] pb-6 sm:flex-row sm:items-start">
          {/* Cột trái: Logo chính thức, tên thương hiệu & thông tin liên hệ */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#D6A15D]/50 bg-[#1F1612] p-1.5 shadow-sm">
              <img
                src="/equideli-logo.png"
                alt="EQUIDELI Official Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-[#1F1612]">
                  EQUIDELI
                </span>
                <span className="rounded bg-[#F5EDE3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#713F2C] border border-[#D6A15D]/40">
                  International Equine Logistics
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#713F2C]">
                CROSS-BORDER RACEHORSE TRANSPORT
              </p>
              <div className="pt-1 text-xs leading-relaxed text-[#5A4E46]">
                <p>Khu Logistics Hàng không & Nội địa, Củ Chi, TP. Hồ Chí Minh, Việt Nam</p>
                <p>Email: contact@equideli.com · Điện thoại: +84 28 000 0000</p>
              </div>
            </div>
          </div>

          {/* Cột phải: Tiêu đề chứng từ, Số hóa đơn & Huy hiệu trạng thái */}
          <div className="flex flex-col sm:items-end sm:text-right">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1F1612] sm:text-[26px]">
              HÓA ĐƠN DỊCH VỤ
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#82766D]">
              SERVICE INVOICE
            </p>
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-[#E6DACB] bg-[#FAF6F0] px-3 py-1.5">
              <span className="text-[11px] font-medium text-[#82766D]">Số HĐ / No:</span>
              <span className="font-mono text-sm font-extrabold text-[#1F1612]">
                {formattedInvoiceNo}
              </span>
            </div>
            <div className="mt-2.5">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold shadow-2xs"
                style={{
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.text,
                  border: `1px solid ${badgeStyle.border}`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: badgeStyle.dot }}
                />
                <span>{statusLabel}</span>
                <span className="text-[10px] opacity-80">({badgeStyle.enLabel})</span>
              </span>
            </div>
          </div>
        </header>

        {/* ====================================================================
            SECTION B – INVOICE INFORMATION (THANH THÔNG TIN ĐỊNH DANH HÓA ĐƠN)
            ==================================================================== */}
        <section
          aria-label="Thông tin định danh hóa đơn"
          className="grid grid-cols-2 gap-3 rounded-xl border border-[#E6DACB] bg-[#FAF6F0] p-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#82766D]">
              Số hóa đơn / Invoice No.
            </p>
            <p className="mt-0.5 font-mono text-xs font-bold text-[#1F1612]">
              {formattedInvoiceNo}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#82766D]">
              Ngày phát hành / Issue Date
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#1F1612]">
              {formatDate(invoice.issuedAt)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#82766D]">
              Hạn thanh toán / Due Date
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#713F2C]">
              {dueDateDisplay}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#82766D]">
              Mã đơn vận chuyển / Request ID
            </p>
            <p className="mt-0.5 font-mono text-xs font-bold text-[#1F1612]">
              {formattedRequestNo}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#82766D]">
              Tiền tệ / Currency
            </p>
            <p className="mt-0.5 font-mono text-xs font-bold text-[#1F1612]">
              {invoice.currency || "USD"} (Đô la Mỹ)
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#82766D]">
              Trạng thái / Status
            </p>
            <p
              className="mt-0.5 text-xs font-extrabold"
              style={{ color: badgeStyle.text }}
            >
              {statusLabel}
            </p>
          </div>
        </section>

        {/* ====================================================================
            SECTION C & D – SELLER & CUSTOMER INFORMATION (ĐƠN VỊ VẬN CHUYỂN & KHÁCH HÀNG)
            ==================================================================== */}
        <section className="grid gap-4 sm:grid-cols-2">
          {/* SECTION C – SELLER INFORMATION */}
          <div className="rounded-xl border border-[#E6DACB] bg-[#FFFFFF] p-4">
            <div className="mb-2.5 flex items-center justify-between border-b border-[#EFE6DC] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#713F2C]">
                Đơn vị cung cấp dịch vụ (Seller)
              </h2>
              <span className="text-[10px] font-semibold uppercase text-[#82766D]">
                Carrier / Issuer
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-[#2B201A]">
              <p className="text-sm font-bold text-[#1F1612]">
                EQUIDELI — Cross-Border Racehorse Transport
              </p>
              <p>
                <span className="font-semibold text-[#82766D]">Địa chỉ: </span>
                Khu Logistics Hàng không & Nội địa, Củ Chi, TP. Hồ Chí Minh, Việt Nam
              </p>
              <p>
                <span className="font-semibold text-[#82766D]">Email hỗ trợ: </span>
                contact@equideli.com
              </p>
              <p>
                <span className="font-semibold text-[#82766D]">Điện thoại: </span>
                +84 28 000 0000
              </p>
              <p>
                <span className="font-semibold text-[#82766D]">Bộ phận phụ trách: </span>
                Phòng Quản lý Logistics & Chứng từ Quốc tế
              </p>
            </div>
          </div>

          {/* SECTION D – CUSTOMER INFORMATION */}
          <div className="rounded-xl border border-[#E6DACB] bg-[#FFFFFF] p-4">
            <div className="mb-2.5 flex items-center justify-between border-b border-[#EFE6DC] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#713F2C]">
                Thông tin khách hàng (Bill To)
              </h2>
              <span className="text-[10px] font-semibold uppercase text-[#82766D]">
                Client / Consignee
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-[#2B201A]">
              <p className="text-sm font-bold text-[#1F1612]">
                {invoice.customerName || "Khách hàng EQUIDELI"}
              </p>
              {invoice.customerOrganization && (
                <p>
                  <span className="font-semibold text-[#82766D]">Tổ chức / Đơn vị: </span>
                  <span className="font-medium text-[#1F1612]">{invoice.customerOrganization}</span>
                </p>
              )}
              {invoice.customerId && (
                <p>
                  <span className="font-semibold text-[#82766D]">Mã khách hàng (Customer ID): </span>
                  <span className="font-mono text-[11px] font-semibold text-[#1F1612]">
                    {invoice.customerId}
                  </span>
                </p>
              )}
              {invoice.customerEmail && (
                <p>
                  <span className="font-semibold text-[#82766D]">Email liên hệ: </span>
                  <span>{invoice.customerEmail}</span>
                </p>
              )}
              {invoice.customerPhone && (
                <p>
                  <span className="font-semibold text-[#82766D]">Số điện thoại: </span>
                  <span>{invoice.customerPhone}</span>
                </p>
              )}
              <p>
                <span className="font-semibold text-[#82766D]">Mã tham chiếu hồ sơ: </span>
                <span className="font-mono text-[11px]">{invoice.requestId}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION E – TRANSPORT DETAILS (THÔNG TIN HÀNH TRÌNH & NGỰA VẬN CHUYỂN)
            ==================================================================== */}
        <section className="rounded-xl border border-[#E6DACB] bg-[#FAF6F0]/65 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#E6DACB] pb-2">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#713F2C]">
                Thông tin vận chuyển & Hồ sơ ngựa đua (Transport & Equine Manifest)
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A4E46]">
              <span>
                Mã đơn: <strong className="font-mono text-[#1F1612]">{formattedRequestNo}</strong>
              </span>
              {transport?.planId && (
                <span>
                  · Kế hoạch: <strong className="font-mono text-[#1F1612]">{planCode(transport.planId)}</strong>
                </span>
              )}
              <span>
                · Số lượng ngựa:{" "}
                <strong className="text-[#1F1612]">
                  {transport?.horseCount && transport.horseCount > 0
                    ? `${transport.horseCount} cá thể`
                    : "Theo hồ sơ đơn vận chuyển"}
                </strong>
              </span>
            </div>
          </div>

          {/* Lưới thông tin lộ trình và thời gian vận chuyển */}
          <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#E6DACB] bg-[#FFFFFF] p-2.5">
              <p className="text-[10px] font-semibold uppercase text-[#82766D]">
                Điểm khởi hành (Departure)
              </p>
              <p className="mt-0.5 font-bold text-[#1F1612]">
                {transport?.originName || "Theo lộ trình đơn vận chuyển"}
              </p>
              {transport?.originCountry && (
                <p className="text-[11px] text-[#82766D]">Quốc gia / Khu vực: {transport.originCountry}</p>
              )}
            </div>

            <div className="rounded-lg border border-[#E6DACB] bg-[#FFFFFF] p-2.5">
              <p className="text-[10px] font-semibold uppercase text-[#82766D]">
                Điểm đích (Destination)
              </p>
              <p className="mt-0.5 font-bold text-[#1F1612]">
                {transport?.destinationName || "Theo lộ trình đơn vận chuyển"}
              </p>
              {transport?.destinationCountry && (
                <p className="text-[11px] text-[#82766D]">Quốc gia / Khu vực: {transport.destinationCountry}</p>
              )}
            </div>

            <div className="rounded-lg border border-[#E6DACB] bg-[#FFFFFF] p-2.5">
              <p className="text-[10px] font-semibold uppercase text-[#82766D]">
                Ngày khởi hành (Transport Date)
              </p>
              <p className="mt-0.5 font-bold text-[#1F1612]">
                {transport?.departureDate ? formatDate(transport.departureDate) : formatDate(invoice.issuedAt)}
              </p>
              <p className="text-[11px] text-[#82766D]">
                {transport?.departureDate ? formatDateTime(transport.departureDate) : "Theo kế hoạch phê duyệt"}
              </p>
            </div>

            <div className="rounded-lg border border-[#E6DACB] bg-[#FFFFFF] p-2.5">
              <p className="text-[10px] font-semibold uppercase text-[#82766D]">
                Hoàn tất bàn giao (Delivery Date)
              </p>
              <p className="mt-0.5 font-bold text-[#1B5E32]">
                {transport?.completedAt
                  ? formatDate(transport.completedAt)
                  : transport?.arrivalDate
                  ? formatDate(transport.arrivalDate)
                  : formatDate(invoice.issuedAt)}
              </p>
              <p className="text-[11px] text-[#82766D]">
                {transport?.recipientName
                  ? `Người nhận: ${transport.recipientName}`
                  : "Biên bản bàn giao đã xác nhận"}
              </p>
            </div>
          </div>

          {/* Danh sách chi tiết các cá thể ngựa trong chuyến vận chuyển (nếu có trong DB) */}
          {transport?.horses && transport.horses.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-[#E6DACB] bg-[#FFFFFF]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E6DACB] bg-[#F5EDE3]/70 text-[10px] font-bold uppercase tracking-wider text-[#5A4E46]">
                    <th className="px-3 py-2">STT</th>
                    <th className="px-3 py-2">Tên ngựa (Horse Name)</th>
                    <th className="px-3 py-2">Mã định danh (Horse ID)</th>
                    <th className="px-3 py-2">Số Microchip (Microchip ID)</th>
                    <th className="px-3 py-2">Giống ngựa (Breed)</th>
                    <th className="px-3 py-2">Thông tin bổ sung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE6DC]">
                  {transport.horses.map((horse, idx) => (
                    <tr key={horse.horseId} className="text-[#1F1612]">
                      <td className="px-3 py-2 font-mono font-semibold text-[#82766D]">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2 font-bold text-[#1F1612]">{horse.name}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#5A4E46]">
                        {horse.horseId.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] font-semibold text-[#713F2C]">
                        {horse.microchipId || "—"}
                      </td>
                      <td className="px-3 py-2">{horse.breed || "Ngựa đua thuần chủng"}</td>
                      <td className="px-3 py-2 text-[11px] text-[#82766D]">
                        {[horse.gender, horse.birthYear ? `Năm sinh: ${horse.birthYear}` : null]
                          .filter(Boolean)
                          .join(" · ") || "Đạt chuẩn kiểm dịch"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ====================================================================
            SECTION F – ITEMIZED SERVICE TABLE (BẢNG KÊ CHI TIẾT DỊCH VỤ VẬN CHUYỂN)
            ==================================================================== */}
        <section aria-label="Bảng kê chi tiết dịch vụ">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#713F2C]">
              Chi tiết hạng mục dịch vụ (Itemized Services & Charges)
            </h2>
            <span className="text-[11px] font-medium text-[#82766D]">
              Đơn vị tính tiền: {invoice.currency || "USD"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#D6A15D]/60">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#1F1612] text-[11px] font-bold uppercase tracking-wider text-[#F5EDE3]">
                  <th className="w-12 px-3 py-3 text-center">STT</th>
                  <th className="px-4 py-3">Mô tả dịch vụ (Service Description)</th>
                  <th className="w-20 px-3 py-3 text-center">Số lượng</th>
                  <th className="w-24 px-3 py-3 text-center">Đơn vị</th>
                  <th className="w-32 px-3 py-3 text-right">Đơn giá (USD)</th>
                  <th className="w-36 px-4 py-3 text-right">Thành tiền (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DACB] bg-[#FFFFFF]">
                {lineItems.map((item, idx) => (
                  <tr
                    key={`${item.itemCode}-${idx}`}
                    className={idx % 2 === 1 ? "bg-[#FAF6F0]/50" : "bg-[#FFFFFF]"}
                  >
                    <td className="px-3 py-3 text-center font-mono font-semibold text-[#82766D]">
                      {String(item.lineNo || idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#1F1612]">{item.description}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#82766D]">
                        {item.category && <span>Phân loại: {item.category}</span>}
                        {item.itemCode && (
                          <span className="font-mono text-[10px] text-[#82766D]">
                            [{item.itemCode}]
                          </span>
                        )}
                        {item.includedInPackage && (
                          <span className="rounded bg-[#E8F5EC] px-1.5 py-0.2 text-[10px] font-semibold text-[#1B5E32]">
                            Đã bao gồm trong gói chính
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-[#1F1612]">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-3 text-center text-[#5A4E46]">{item.unit}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#2B201A]">
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#1F1612]">
                      {item.includedInPackage && Number(item.amount) === 0
                        ? "Đã bao gồm ($0.00)"
                        : formatMoney(item.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ====================================================================
            SECTION G & H – FINANCIAL SUMMARY & PAYMENT INFORMATION
            ==================================================================== */}
        <section className="grid gap-6 lg:grid-cols-12">
          {/* SECTION H – PAYMENT INFORMATION (7/12 cột bên trái) */}
          <div className="space-y-3 rounded-xl border border-[#E6DACB] bg-[#FAF6F0]/75 p-4 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-[#E6DACB] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#713F2C]">
                Thông tin thanh toán & Đối soát (Payment Information)
              </h2>
              <span className="text-[10px] font-bold uppercase text-[#82766D]">
                Offline Settlement Only
              </span>
            </div>

            <div className="grid gap-2.5 text-xs sm:grid-cols-2">
              <div>
                <p className="text-[11px] text-[#82766D]">Trạng thái thanh toán:</p>
                <p className="font-bold" style={{ color: badgeStyle.text }}>
                  {statusLabel} ({badgeStyle.enLabel})
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#82766D]">Phương thức thanh toán thỏa thuận:</p>
                <p className="font-bold text-[#1F1612]">
                  {invoice.paymentMethod || "Chuyển khoản ngân hàng ngoại tuyến"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#82766D]">Thời hạn thanh toán (Payment Deadline):</p>
                <p className="font-semibold text-[#1F1612]">{dueDateDisplay}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#82766D]">Thời điểm hoàn tất thanh toán:</p>
                <p className="font-semibold text-[#1F1612]">
                  {invoice.paidAt ? formatDateTime(invoice.paidAt) : "Đang theo dõi đối soát"}
                </p>
              </div>
            </div>

            {/* Thông tin tài khoản ngân hàng thụ hưởng dành cho chuyển khoản ngoại tuyến */}
            <div className="rounded-lg border border-[#D6A15D]/50 bg-[#FFFFFF] p-3 text-xs">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#713F2C]">
                Thông tin tài khoản thụ hưởng ngoại tuyến (Bank Transfer Details)
              </p>
              <div className="mt-1.5 grid gap-1 text-[#2B201A] sm:grid-cols-2">
                <p>
                  <span className="text-[#82766D]">Ngân hàng: </span>
                  <strong>Vietcombank — CN TP. Hồ Chí Minh</strong>
                </p>
                <p>
                  <span className="text-[#82766D]">Số tài khoản (USD): </span>
                  <strong className="font-mono text-[#713F2C]">0071 0009 8888 68</strong>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-[#82766D]">Đơn vị thụ hưởng: </span>
                  <strong>CÔNG TY TNHH VẬN TẢI NGỰA EQUIDELI</strong>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-[#82766D]">Nội dung chuyển khoản chuẩn: </span>
                  <code className="rounded bg-[#FAF6F0] px-1.5 py-0.5 font-mono font-bold text-[#1F1612] border border-[#D6A15D]/40">
                    EQUIDELI {formattedInvoiceNo} {formattedRequestNo}
                  </code>
                </p>
              </div>
            </div>

            {latestNote && (
              <p className="text-[11px] text-[#5A4E46]">
                <span className="font-semibold text-[#1F1612]">Ghi chú đối soát gần nhất: </span>
                {latestNote}
              </p>
            )}
          </div>

          {/* SECTION G – FINANCIAL SUMMARY (5/12 cột bên phải) */}
          <div className="flex flex-col justify-between rounded-xl border border-[#D6A15D]/60 bg-[#FAF6F0] p-4 lg:col-span-5">
            <div className="space-y-2.5 text-xs">
              <h2 className="border-b border-[#E6DACB] pb-2 text-xs font-extrabold uppercase tracking-wider text-[#713F2C]">
                Tổng hợp tài chính (Financial Summary)
              </h2>

              <div className="flex items-center justify-between text-[#5A4E46]">
                <span>Tạm tính (Subtotal)</span>
                <span className="font-mono font-semibold text-[#1F1612]">
                  {formatMoney(subtotal, invoice.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#5A4E46]">
                <span>Chiết khấu thương mại (Discount)</span>
                <span className="font-mono font-semibold text-[#1F1612]">
                  {discountAmount > 0 ? `−${formatMoney(discountAmount, invoice.currency)}` : formatMoney(0, invoice.currency)}
                </span>
              </div>

              {additionalFees > 0 && (
                <div className="flex items-center justify-between text-[#5A4E46]">
                  <span>Phụ phí dịch vụ (Additional Fees)</span>
                  <span className="font-mono font-semibold text-[#1F1612]">
                    {formatMoney(additionalFees, invoice.currency)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[#5A4E46]">
                <span>Thuế dịch vụ quốc tế (Tax 0%)</span>
                <span className="font-mono font-semibold text-[#1F1612]">
                  {formatMoney(taxAmount, invoice.currency)}
                </span>
              </div>

              {/* Tổng cộng hóa đơn nổi bật */}
              <div className="my-2 flex items-center justify-between rounded-lg bg-[#1F1612] px-3.5 py-2.5 text-[#F5EDE3]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider">
                    TỔNG CỘNG (TOTAL)
                  </p>
                  <p className="text-[10px] text-[#D6A15D]">Total Invoice Amount</p>
                </div>
                <span className="font-mono text-base font-extrabold text-[#D6A15D]">
                  {formatMoney(totalAmount, invoice.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[#1B5E32]">
                <span className="font-semibold">Đã thanh toán (Confirmed Paid)</span>
                <span className="font-mono font-bold">
                  {formatMoney(paidAmount, invoice.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t-2 border-[#D6A15D] pt-2.5 text-sm font-extrabold">
                <span className="text-[#1F1612]">CÒN PHẢI THU (BALANCE DUE)</span>
                <span
                  className="font-mono text-base"
                  style={{
                    color: remainingAmount > 0 ? (statusLabel === "Quá hạn thanh toán" ? "#9E2A1C" : "#713F2C") : "#1B5E32",
                  }}
                >
                  {formatMoney(remainingAmount, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION I – PAYMENT TERMS AND NOTES (ĐIỀU KHOẢN & LƯU Ý THANH TOÁN)
            ==================================================================== */}
        <section
          aria-label="Điều khoản và lưu ý thanh toán"
          className="rounded-xl border border-[#D6A15D]/50 bg-[#FAF6F0] p-3.5 text-xs leading-relaxed text-[#2B201A]"
        >
          <p className="font-extrabold uppercase tracking-wider text-[#713F2C] text-[11px]">
            Điều khoản & Lưu ý thanh toán ngoại tuyến (Payment Terms & Regulatory Notice)
          </p>
          <p className="mt-1 text-[#2B201A]">
            EQUIDELI chỉ quản lý hóa đơn, lưu trữ chứng từ và theo dõi trạng thái thanh toán. Các giao dịch thanh toán được thực hiện ngoại tuyến theo thỏa thuận giữa khách hàng và đơn vị vận chuyển. Website không tích hợp cổng thanh toán trực tuyến.
          </p>
        </section>

        {/* ====================================================================
            SECTION J – SIGNATURE AND FOOTER (CHỮ KÝ XÁC NHẬN & CHÂN TRANG)
            ==================================================================== */}
        <footer className="pt-2">
          <div className="grid grid-cols-1 gap-6 border-t border-[#E6DACB] pt-5 text-center text-xs sm:grid-cols-3">
            {/* Cột ký 1: Đại diện đơn vị vận chuyển */}
            <div className="flex flex-col justify-between space-y-10">
              <div>
                <p className="font-extrabold uppercase tracking-wider text-[#1F1612]">
                  Đại diện đơn vị vận chuyển
                </p>
                <p className="text-[11px] text-[#82766D]">
                  Authorized Representative (EQUIDELI)
                </p>
              </div>
              <div className="border-t border-dashed border-[#B5A18F] pt-2">
                <p className="font-semibold text-[#1F1612]">Ban Giám đốc Điều hành Vận tải</p>
                <p className="text-[11px] text-[#82766D]">Ký tên & xác nhận dịch vụ</p>
              </div>
            </div>

            {/* Cột ký 2: Người lập hóa đơn */}
            <div className="flex flex-col justify-between space-y-10">
              <div>
                <p className="font-extrabold uppercase tracking-wider text-[#1F1612]">
                  Người lập hóa đơn
                </p>
                <p className="text-[11px] text-[#82766D]">Invoice Preparer</p>
              </div>
              <div className="border-t border-dashed border-[#B5A18F] pt-2">
                <p className="font-semibold text-[#1F1612]">{preparerName}</p>
                <p className="text-[11px] text-[#82766D]">
                  Ngày lập: {formatDate(invoice.issuedAt)}
                </p>
              </div>
            </div>

            {/* Cột ký 3: Khách hàng xác nhận */}
            <div className="flex flex-col justify-between space-y-10">
              <div>
                <p className="font-extrabold uppercase tracking-wider text-[#1F1612]">
                  Khách hàng xác nhận
                </p>
                <p className="text-[11px] text-[#82766D]">Customer Confirmation</p>
              </div>
              <div className="border-t border-dashed border-[#B5A18F] pt-2">
                <p className="font-semibold text-[#1F1612]">
                  {invoice.customerName || transport?.recipientName || "Đại diện khách hàng"}
                </p>
                <p className="text-[11px] text-[#82766D]">Ký xác nhận đối chiếu công nợ</p>
              </div>
            </div>
          </div>

          {/* Chân trang thông tin liên hệ và số trang chứng từ */}
          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-[#D6A15D]/50 pt-3 text-[11px] text-[#82766D] sm:flex-row">
            <p>
              <strong className="text-[#1F1612]">EQUIDELI</strong> · Cross-Border Racehorse Transport ·
              Củ Chi, TP. Hồ Chí Minh · contact@equideli.com · +84 28 000 0000
            </p>
            <p className="font-mono font-semibold text-[#1F1612]">
              Mã chứng từ: {formattedInvoiceNo} · Trang 1 / 1
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
