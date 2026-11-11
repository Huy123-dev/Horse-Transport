/**
 * ============================================================================
 * EQUIDELI — BỘ XUẤT TỆP PDF HÓA ĐƠN CHUẨN A4 QUỐC TẾ (invoice-pdf.ts)
 * ============================================================================
 * Tệp tiện ích này tạo một tài liệu A4 Portrait độc lập (Standalone A4 Document)
 * để xuất sang tệp PDF hoặc in ấn trực tiếp:
 * 1. Tách biệt hoàn toàn khỏi thanh điều hướng (Sidebar), Header tối màu và
 *    các nút bấm quản trị của ứng dụng web.
 * 2. Nhúng phông chữ tiếng Việt chuẩn `Be Vietnam Pro` hỗ trợ 100% dấu tiếng Việt
 *    (Đ, Ư, Ơ, Ă, Â, Ê, Ô...).
 * 3. Sử dụng logo chính thức `/equideli-logo.png` với tỷ lệ chuẩn.
 * 4. Tự động lặp lại tiêu đề bảng (`thead { display: table-header-group }`)
 *    nếu danh sách hạng mục kéo dài qua nhiều trang A4 và chống cắt ngang khối
 *    tổng kết tài chính / chữ ký (`break-inside: avoid`).
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
import type { InvoiceRecord } from "@/components/views/shared/invoice-list";
import { resolveInvoiceStatusLabel } from "@/components/views/shared/invoice-list";

/** Khử các ký tự HTML đặc biệt để đảm bảo an toàn khi dựng tài liệu A4 */
function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Xây dựng mã HTML hoàn chỉnh chuẩn trang giấy A4 dọc (210mm x 297mm)
 * cho hóa đơn vận chuyển ngựa quốc tế EQUIDELI.
 */
export function buildEquideliInvoiceA4Html(invoice: InvoiceRecord): string {
  const originUrl = typeof window !== "undefined" ? window.location.origin : "";
  const logoUrl = `${originUrl}/equideli-logo.png`;

  const formattedInvoiceNo =
    invoice.invoiceNumber && invoice.invoiceNumber.trim().length > 0
      ? invoice.invoiceNumber.trim()
      : invoiceCode(invoice.invoiceId);
  const formattedRequestNo = requestCode(invoice.requestId);
  const statusLabel = resolveInvoiceStatusLabel(invoice);

  const badgeColors =
    statusLabel === "Đã thanh toán"
      ? { bg: "#E8F5EC", text: "#1B5E32", border: "#81C995", en: "PAID IN FULL" }
      : statusLabel === "Thanh toán một phần"
      ? { bg: "#FEF6E6", text: "#8A5600", border: "#F2BD65", en: "PARTIALLY PAID" }
      : statusLabel === "Quá hạn thanh toán"
      ? { bg: "#FDECEB", text: "#9E2A1C", border: "#F0786B", en: "OVERDUE" }
      : { bg: "#FBF3E4", text: "#7A4F10", border: "#D6A15D", en: "UNPAID" };

  const totalAmount = Number(invoice.amount) || 0;
  const normalizedStatus = normalizePaymentStatus(invoice.paymentStatus, invoice.dueDate);
  const isPaid = normalizedStatus === "PAID";
  const paidAmount = invoice.paidAmount != null ? Number(invoice.paidAmount) : isPaid ? totalAmount : 0;
  const remainingAmount =
    invoice.remainingAmount != null
      ? Number(invoice.remainingAmount)
      : Math.max(0, totalAmount - paidAmount);

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

  const dueDateDisplay = invoice.dueDate ? formatDate(invoice.dueDate) : "14 ngày kể từ ngày phát hành";
  const preparerName = invoice.preparedByName || invoice.lastUpdatedByName || "Ban Quản lý Logistics EQUIDELI";
  const latestNote =
    invoice.paymentHistory && invoice.paymentHistory.length > 0
      ? invoice.paymentHistory[0].notes
      : null;

  const horsesHtml =
    transport?.horses && transport.horses.length > 0
      ? `
      <table class="sub-table" style="margin-top: 10px;">
        <thead>
          <tr>
            <th style="width: 44px;">STT</th>
            <th>Tên ngựa (Horse Name)</th>
            <th>Mã định danh (Horse ID)</th>
            <th>Số Microchip (Microchip ID)</th>
            <th>Giống ngựa (Breed)</th>
            <th>Thông tin bổ sung</th>
          </tr>
        </thead>
        <tbody>
          ${transport.horses
            .map(
              (h, i) => `
            <tr>
              <td class="mono muted">${String(i + 1).padStart(2, "0")}</td>
              <td><strong>${escapeHtml(h.name)}</strong></td>
              <td class="mono">${escapeHtml(h.horseId.slice(0, 8).toUpperCase())}</td>
              <td class="mono" style="color: #713F2C; font-weight: 700;">${escapeHtml(h.microchipId || "—")}</td>
              <td>${escapeHtml(h.breed || "Ngựa đua thuần chủng")}</td>
              <td class="muted">${escapeHtml([h.gender, h.birthYear ? `Năm sinh: ${h.birthYear}` : null].filter(Boolean).join(" · ") || "Đạt chuẩn kiểm dịch")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `
      : "";

  const itemsRowsHtml = lineItems
    .map(
      (item, idx) => `
      <tr class="${idx % 2 === 1 ? "row-alt" : ""}">
        <td class="text-center mono muted">${String(item.lineNo || idx + 1).padStart(2, "0")}</td>
        <td>
          <div style="font-weight: 700; color: #1F1612;">${escapeHtml(item.description)}</div>
          <div style="font-size: 10px; color: #82766D; margin-top: 2px;">
            ${item.category ? `Phân loại: ${escapeHtml(item.category)}` : ""}
            ${item.itemCode ? ` · [${escapeHtml(item.itemCode)}]` : ""}
            ${item.includedInPackage ? ` · <strong style="color: #1B5E32;">Đã bao gồm trong gói chính</strong>` : ""}
          </div>
        </td>
        <td class="text-center mono"><strong>${escapeHtml(item.quantity)}</strong></td>
        <td class="text-center">${escapeHtml(item.unit)}</td>
        <td class="text-right mono">${escapeHtml(formatMoney(item.unitPrice, invoice.currency))}</td>
        <td class="text-right mono"><strong>${
          item.includedInPackage && Number(item.amount) === 0
            ? "Đã bao gồm ($0.00)"
            : escapeHtml(formatMoney(item.amount, invoice.currency))
        }</strong></td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(formattedInvoiceNo)}_EQUIDELI_Invoice</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #FFFFFF;
      color: #1F1612;
      font-family: "Be Vietnam Pro", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11.5px;
      line-height: 1.48;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1F1612;
      color: #F5EDE3;
      padding: 10px 20px;
      border-bottom: 2px solid #D6A15D;
    }
    .toolbar-btn {
      background: #D6A15D;
      color: #171311;
      border: none;
      border-radius: 6px;
      padding: 7px 14px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
    }
    .page-sheet {
      max-width: 210mm;
      margin: 0 auto;
      background: #FFFFFF;
      padding: 16px 20px;
    }
    .top-bar {
      height: 8px;
      background: linear-gradient(90deg, #1F1612 0%, #713F2C 55%, #D6A15D 100%);
      margin-bottom: 14px;
      border-radius: 3px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #D6A15D;
      padding-bottom: 14px;
      margin-bottom: 14px;
      gap: 16px;
    }
    .brand-left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .logo-box {
      width: 58px;
      height: 58px;
      background: #1F1612;
      border: 1px solid #D6A15D;
      border-radius: 10px;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #1F1612;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .brand-tagline {
      font-size: 10px;
      font-weight: 700;
      color: #713F2C;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin: 2px 0 5px 0;
    }
    .brand-contact {
      font-size: 10.5px;
      color: #5A4E46;
      margin: 0;
    }
    .doc-right {
      text-align: right;
    }
    .doc-title {
      font-size: 21px;
      font-weight: 800;
      color: #1F1612;
      margin: 0;
    }
    .doc-subtitle {
      font-size: 10px;
      font-weight: 700;
      color: #82766D;
      letter-spacing: 0.18em;
      margin: 1px 0 6px 0;
    }
    .inv-number-box {
      display: inline-block;
      background: #FAF6F0;
      border: 1px solid #E6DACB;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 11px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: ${badgeColors.bg};
      color: ${badgeColors.text};
      border: 1px solid ${badgeColors.border};
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      background: #FAF6F0;
      border: 1px solid #E6DACB;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .meta-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #82766D;
    }
    .meta-value {
      font-size: 11px;
      font-weight: 700;
      color: #1F1612;
      margin-top: 2px;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .box {
      border: 1px solid #E6DACB;
      border-radius: 8px;
      padding: 10px 12px;
      background: #FFFFFF;
    }
    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #EFE6DC;
      padding-bottom: 5px;
      margin-bottom: 7px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #713F2C;
    }
    .transport-box {
      border: 1px solid #E6DACB;
      border-radius: 8px;
      padding: 10px 12px;
      background: #FAF6F0;
      margin-bottom: 14px;
    }
    .transport-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .transport-card {
      background: #FFFFFF;
      border: 1px solid #E6DACB;
      border-radius: 6px;
      padding: 7px 9px;
    }
    table.main-table, table.sub-table {
      width: 100%;
      border-collapse: collapse;
    }
    table.main-table thead {
      display: table-header-group;
    }
    table.main-table th {
      background: #1F1612;
      color: #F5EDE3;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 10px;
      border: 1px solid #1F1612;
    }
    table.main-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #E6DACB;
      vertical-align: top;
    }
    table.sub-table th {
      background: #F5EDE3;
      color: #5A4E46;
      font-size: 9.5px;
      text-transform: uppercase;
      padding: 5px 8px;
      border-bottom: 1px solid #E6DACB;
      text-align: left;
    }
    table.sub-table td {
      background: #FFFFFF;
      padding: 5px 8px;
      border-bottom: 1px solid #EFE6DC;
      font-size: 10.5px;
    }
    .row-alt {
      background: #FAF6F0;
    }
    .summary-section {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 14px;
      margin-top: 14px;
      margin-bottom: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .total-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1F1612;
      color: #F5EDE3;
      padding: 8px 11px;
      border-radius: 6px;
      margin: 7px 0;
      font-weight: 800;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      border-top: 2px solid #D6A15D;
      padding-top: 7px;
      margin-top: 6px;
      font-size: 12.5px;
      font-weight: 800;
    }
    .terms-box {
      border: 1px solid #D6A15D;
      background: #FAF6F0;
      border-radius: 8px;
      padding: 9px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: center;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #E6DACB;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sig-space {
      height: 44px;
    }
    .sig-line {
      border-top: 1px dashed #B5A18F;
      padding-top: 5px;
    }
    .footer-bar {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #D6A15D;
      margin-top: 14px;
      padding-top: 8px;
      font-size: 10px;
      color: #82766D;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .muted {
      color: #82766D;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    @media print {
      .no-print { display: none !important; }
      .page-sheet { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div>
      <strong>EQUIDELI — Bản xuất PDF Hóa đơn Quốc tế (A4 Portrait)</strong>
      <span style="margin-left: 10px; font-size: 11px; color: #D8C8B8;">Số hóa đơn: ${escapeHtml(formattedInvoiceNo)}</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="toolbar-btn" onclick="window.print()">In / Lưu thành PDF (A4)</button>
    </div>
  </div>

  <div class="page-sheet">
    <div class="top-bar"></div>

    <!-- SECTION A: HEADER -->
    <div class="header">
      <div class="brand-left">
        <div class="logo-box">
          <img src="${escapeHtml(logoUrl)}" alt="EQUIDELI" />
        </div>
        <div>
          <h1 class="brand-title">EQUIDELI</h1>
          <p class="brand-tagline">CROSS-BORDER RACEHORSE TRANSPORT</p>
          <p class="brand-contact">Khu Logistics Hàng không & Nội địa, Củ Chi, TP. Hồ Chí Minh, Việt Nam</p>
          <p class="brand-contact">Email: contact@equideli.com · Điện thoại: +84 28 000 0000</p>
        </div>
      </div>
      <div class="doc-right">
        <h2 class="doc-title">HÓA ĐƠN DỊCH VỤ</h2>
        <p class="doc-subtitle">SERVICE INVOICE</p>
        <div class="inv-number-box mono">Số HĐ: ${escapeHtml(formattedInvoiceNo)}</div>
        <div>
          <span class="status-badge">${escapeHtml(statusLabel)} (${escapeHtml(badgeColors.en)})</span>
        </div>
      </div>
    </div>

    <!-- SECTION B: INVOICE INFORMATION -->
    <div class="meta-grid">
      <div>
        <div class="meta-label">Số hóa đơn / No.</div>
        <div class="meta-value mono">${escapeHtml(formattedInvoiceNo)}</div>
      </div>
      <div>
        <div class="meta-label">Ngày phát hành</div>
        <div class="meta-value">${escapeHtml(formatDate(invoice.issuedAt))}</div>
      </div>
      <div>
        <div class="meta-label">Hạn thanh toán</div>
        <div class="meta-value" style="color: #713F2C;">${escapeHtml(dueDateDisplay)}</div>
      </div>
      <div>
        <div class="meta-label">Mã đơn vận chuyển</div>
        <div class="meta-value mono">${escapeHtml(formattedRequestNo)}</div>
      </div>
      <div>
        <div class="meta-label">Tiền tệ</div>
        <div class="meta-value mono">${escapeHtml(invoice.currency || "USD")}</div>
      </div>
      <div>
        <div class="meta-label">Trạng thái</div>
        <div class="meta-value" style="color: ${badgeColors.text};">${escapeHtml(statusLabel)}</div>
      </div>
    </div>

    <!-- SECTION C & D: SELLER & CUSTOMER INFORMATION -->
    <div class="two-col">
      <div class="box">
        <div class="box-header">
          <span>Đơn vị cung cấp dịch vụ (Seller)</span>
          <span class="muted">Carrier / Issuer</span>
        </div>
        <div style="font-weight: 700; font-size: 12px; margin-bottom: 3px;">EQUIDELI — Cross-Border Racehorse Transport</div>
        <div><span class="muted">Địa chỉ:</span> Khu Logistics Hàng không & Nội địa, Củ Chi, TP. Hồ Chí Minh, Việt Nam</div>
        <div><span class="muted">Email:</span> contact@equideli.com</div>
        <div><span class="muted">Điện thoại:</span> +84 28 000 0000</div>
        <div><span class="muted">Bộ phận:</span> Phòng Quản lý Logistics & Chứng từ Quốc tế</div>
      </div>

      <div class="box">
        <div class="box-header">
          <span>Thông tin khách hàng (Bill To)</span>
          <span class="muted">Client / Consignee</span>
        </div>
        <div style="font-weight: 700; font-size: 12px; margin-bottom: 3px;">${escapeHtml(invoice.customerName || "Khách hàng EQUIDELI")}</div>
        ${invoice.customerOrganization ? `<div><span class="muted">Tổ chức / Đơn vị:</span> <strong>${escapeHtml(invoice.customerOrganization)}</strong></div>` : ""}
        ${invoice.customerId ? `<div><span class="muted">Mã khách hàng:</span> <span class="mono">${escapeHtml(invoice.customerId)}</span></div>` : ""}
        ${invoice.customerEmail ? `<div><span class="muted">Email:</span> ${escapeHtml(invoice.customerEmail)}</div>` : ""}
        ${invoice.customerPhone ? `<div><span class="muted">Điện thoại:</span> ${escapeHtml(invoice.customerPhone)}</div>` : ""}
        <div><span class="muted">Mã hồ sơ yêu cầu:</span> <span class="mono">${escapeHtml(invoice.requestId)}</span></div>
      </div>
    </div>

    <!-- SECTION E: TRANSPORT DETAILS -->
    <div class="transport-box">
      <div class="box-header" style="border-bottom-color: #E6DACB;">
        <span>Thông tin vận chuyển & Hồ sơ ngựa đua (Transport & Equine Manifest)</span>
        <span class="mono" style="color: #1F1612;">Đơn: ${escapeHtml(formattedRequestNo)}${transport?.planId ? ` · Kế hoạch: ${escapeHtml(planCode(transport.planId))}` : ""} · Số ngựa: ${escapeHtml(transport?.horseCount && transport.horseCount > 0 ? `${transport.horseCount} cá thể` : "Theo hồ sơ")}</span>
      </div>
      <div class="transport-grid">
        <div class="transport-card">
          <div class="meta-label">Điểm khởi hành (Origin)</div>
          <div class="meta-value">${escapeHtml(transport?.originName || "Theo lộ trình đơn vận chuyển")}</div>
          ${transport?.originCountry ? `<div class="muted" style="font-size: 10px;">Quốc gia: ${escapeHtml(transport.originCountry)}</div>` : ""}
        </div>
        <div class="transport-card">
          <div class="meta-label">Điểm đích (Destination)</div>
          <div class="meta-value">${escapeHtml(transport?.destinationName || "Theo lộ trình đơn vận chuyển")}</div>
          ${transport?.destinationCountry ? `<div class="muted" style="font-size: 10px;">Quốc gia: ${escapeHtml(transport.destinationCountry)}</div>` : ""}
        </div>
        <div class="transport-card">
          <div class="meta-label">Ngày khởi hành</div>
          <div class="meta-value">${escapeHtml(transport?.departureDate ? formatDate(transport.departureDate) : formatDate(invoice.issuedAt))}</div>
          <div class="muted" style="font-size: 10px;">${escapeHtml(transport?.departureDate ? formatDateTime(transport.departureDate) : "Theo kế hoạch")}</div>
        </div>
        <div class="transport-card">
          <div class="meta-label">Hoàn tất bàn giao</div>
          <div class="meta-value" style="color: #1B5E32;">${escapeHtml(transport?.completedAt ? formatDate(transport.completedAt) : transport?.arrivalDate ? formatDate(transport.arrivalDate) : formatDate(invoice.issuedAt))}</div>
          <div class="muted" style="font-size: 10px;">${escapeHtml(transport?.recipientName ? `Người nhận: ${transport.recipientName}` : "Đã xác nhận bàn giao")}</div>
        </div>
      </div>
      ${horsesHtml}
    </div>

    <!-- SECTION F: ITEMIZED SERVICE TABLE -->
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #713F2C;">Chi tiết hạng mục dịch vụ (Itemized Services & Charges)</span>
        <span class="muted" style="font-size: 10.5px;">Đơn vị tiền tệ: ${escapeHtml(invoice.currency || "USD")}</span>
      </div>
      <table class="main-table" style="border: 1px solid #D6A15D;">
        <thead>
          <tr>
            <th style="width: 44px;">STT</th>
            <th style="text-align: left;">Mô tả dịch vụ (Service Description)</th>
            <th style="width: 65px;">SL</th>
            <th style="width: 85px;">Đơn vị</th>
            <th style="width: 115px; text-align: right;">Đơn giá (USD)</th>
            <th style="width: 125px; text-align: right;">Thành tiền (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- SECTION G & H: PAYMENT INFORMATION & FINANCIAL SUMMARY -->
    <div class="summary-section">
      <div class="box" style="background: #FAF6F0;">
        <div class="box-header">
          <span>Thông tin thanh toán & Đối soát (Payment Information)</span>
          <span class="muted">Offline Settlement</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
          <div>
            <div class="muted" style="font-size: 10px;">Trạng thái thanh toán:</div>
            <div style="font-weight: 700; color: ${badgeColors.text};">${escapeHtml(statusLabel)}</div>
          </div>
          <div>
            <div class="muted" style="font-size: 10px;">Phương thức thanh toán:</div>
            <div style="font-weight: 700;">${escapeHtml(invoice.paymentMethod || "Chuyển khoản ngân hàng ngoại tuyến")}</div>
          </div>
          <div>
            <div class="muted" style="font-size: 10px;">Hạn thanh toán:</div>
            <div style="font-weight: 700;">${escapeHtml(dueDateDisplay)}</div>
          </div>
          <div>
            <div class="muted" style="font-size: 10px;">Thời điểm hoàn tất:</div>
            <div style="font-weight: 700;">${escapeHtml(invoice.paidAt ? formatDateTime(invoice.paidAt) : "Đang theo dõi đối soát")}</div>
          </div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #D6A15D; border-radius: 6px; padding: 8px 10px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #713F2C; margin-bottom: 3px;">Thông tin tài khoản thụ hưởng ngoại tuyến</div>
          <div><span class="muted">Ngân hàng:</span> <strong>Vietcombank — Chi nhánh TP. Hồ Chí Minh</strong> · <span class="muted">Số TK (USD):</span> <strong class="mono" style="color: #713F2C;">0071 0009 8888 68</strong></div>
          <div><span class="muted">Chủ tài khoản:</span> <strong>CÔNG TY TNHH VẬN TẢI NGỰA EQUIDELI</strong></div>
          <div><span class="muted">Nội dung chuyển khoản:</span> <strong class="mono">EQUIDELI ${escapeHtml(formattedInvoiceNo)} ${escapeHtml(formattedRequestNo)}</strong></div>
        </div>
        ${latestNote ? `<div style="margin-top: 6px; font-size: 10.5px;"><span class="muted">Ghi chú đối soát:</span> ${escapeHtml(latestNote)}</div>` : ""}
      </div>

      <div class="box" style="border-color: #D6A15D; background: #FAF6F0;">
        <div class="box-header">
          <span>Tổng hợp tài chính (Financial Summary)</span>
        </div>
        <div class="summary-row">
          <span class="muted">Tạm tính (Subtotal)</span>
          <strong class="mono">${escapeHtml(formatMoney(subtotal, invoice.currency))}</strong>
        </div>
        <div class="summary-row">
          <span class="muted">Chiết khấu (Discount)</span>
          <strong class="mono">${discountAmount > 0 ? `−${escapeHtml(formatMoney(discountAmount, invoice.currency))}` : escapeHtml(formatMoney(0, invoice.currency))}</strong>
        </div>
        ${
          additionalFees > 0
            ? `<div class="summary-row"><span class="muted">Phụ phí (Additional Fees)</span><strong class="mono">${escapeHtml(formatMoney(additionalFees, invoice.currency))}</strong></div>`
            : ""
        }
        <div class="summary-row">
          <span class="muted">Thuế dịch vụ quốc tế (Tax)</span>
          <strong class="mono">${escapeHtml(formatMoney(taxAmount, invoice.currency))}</strong>
        </div>
        <div class="total-banner">
          <div>
            <div style="font-size: 11px;">TỔNG CỘNG (TOTAL)</div>
            <div style="font-size: 9px; color: #D6A15D; font-weight: 600;">Total Invoice Amount</div>
          </div>
          <div class="mono" style="font-size: 15px; color: #D6A15D;">${escapeHtml(formatMoney(totalAmount, invoice.currency))}</div>
        </div>
        <div class="summary-row" style="color: #1B5E32; font-weight: 700;">
          <span>Đã thanh toán (Confirmed Paid)</span>
          <span class="mono">${escapeHtml(formatMoney(paidAmount, invoice.currency))}</span>
        </div>
        <div class="balance-row">
          <span>CÒN PHẢI THU (BALANCE DUE)</span>
          <span class="mono" style="color: ${remainingAmount > 0 ? "#713F2C" : "#1B5E32"};">${escapeHtml(formatMoney(remainingAmount, invoice.currency))}</span>
        </div>
      </div>
    </div>

    <!-- SECTION I: PAYMENT TERMS AND NOTES -->
    <div class="terms-box">
      <div style="font-weight: 800; text-transform: uppercase; color: #713F2C; font-size: 10px; margin-bottom: 3px;">
        Điều khoản & Lưu ý thanh toán ngoại tuyến (Payment Terms & Regulatory Notice)
      </div>
      <div>
        EQUIDELI chỉ quản lý hóa đơn, lưu trữ chứng từ và theo dõi trạng thái thanh toán. Các giao dịch thanh toán được thực hiện ngoại tuyến theo thỏa thuận giữa khách hàng và đơn vị vận chuyển. Website không tích hợp cổng thanh toán trực tuyến.
      </div>
    </div>

    <!-- SECTION J: SIGNATURE AND FOOTER -->
    <div class="sig-grid">
      <div>
        <div style="font-weight: 800; text-transform: uppercase;">Đại diện đơn vị vận chuyển</div>
        <div class="muted" style="font-size: 10px;">Authorized Representative (EQUIDELI)</div>
        <div class="sig-space"></div>
        <div class="sig-line">
          <strong>Ban Giám đốc Điều hành Vận tải</strong>
          <div class="muted" style="font-size: 9.5px;">Ký tên & xác nhận dịch vụ</div>
        </div>
      </div>
      <div>
        <div style="font-weight: 800; text-transform: uppercase;">Người lập hóa đơn</div>
        <div class="muted" style="font-size: 10px;">Invoice Preparer</div>
        <div class="sig-space"></div>
        <div class="sig-line">
          <strong>${escapeHtml(preparerName)}</strong>
          <div class="muted" style="font-size: 9.5px;">Ngày lập: ${escapeHtml(formatDate(invoice.issuedAt))}</div>
        </div>
      </div>
      <div>
        <div style="font-weight: 800; text-transform: uppercase;">Khách hàng xác nhận</div>
        <div class="muted" style="font-size: 10px;">Customer Confirmation</div>
        <div class="sig-space"></div>
        <div class="sig-line">
          <strong>${escapeHtml(invoice.customerName || transport?.recipientName || "Đại diện khách hàng")}</strong>
          <div class="muted" style="font-size: 9.5px;">Ký xác nhận đối chiếu công nợ</div>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <div><strong>EQUIDELI</strong> · Cross-Border Racehorse Transport · Củ Chi, TP. Hồ Chí Minh · contact@equideli.com · +84 28 000 0000</div>
      <div class="mono"><strong>Mã chứng từ: ${escapeHtml(formattedInvoiceNo)} · Trang 1 / 1</strong></div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Mở cửa sổ tài liệu A4 chuẩn và tự động kích hoạt hộp thoại Xuất PDF / In A4
 * sau khi phông chữ tiếng Việt và Logo thương hiệu đã tải hoàn tất.
 */
export function exportInvoiceToA4Pdf(invoice: InvoiceRecord): boolean {
  if (typeof window === "undefined") return false;
  const html = buildEquideliInvoiceA4Html(invoice);
  const printWindow = window.open("", "_blank", "width=960,height=1100,noopener,noreferrer");

  if (!printWindow) {
    // Dự phòng nếu trình duyệt chặn cửa sổ bật lên (Popup Blocker): in trực tiếp vùng #equideli-a4-invoice-sheet
    window.print();
    return true;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // Bỏ qua nếu người dùng đóng cửa sổ sớm
    }
  };

  if (printWindow.document.readyState === "complete") {
    setTimeout(triggerPrint, 350);
  } else {
    printWindow.addEventListener("load", () => setTimeout(triggerPrint, 350), { once: true });
  }
  return true;
}
