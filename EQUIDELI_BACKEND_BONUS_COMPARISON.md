# BÁO CÁO SO SÁNH CHI TIẾT GIỮA BACKEND THAM CHIẾU (C:\Backend_bonus) VÀ BACKEND DỰ ÁN (C:\Equideli\backend)

*Ngày thực hiện audit: 27/10/2026*  
*Môi trường: Spring Boot 3.3.5 / Java 21 / SQL Server / React TypeScript*

---

## 1. Tóm tắt điều hành (Executive Summary)

Quá trình kiểm tra và đối chiếu mã nguồn giữa **Backend tham chiếu (`C:\Backend_bonus`)** và **Backend dự án đích (`C:\Equideli\backend`)** cho thấy:
- **`C:\Backend_bonus`** (131 tệp): Là phiên bản backend cơ bản ban đầu, triển khai các nghiệp vụ CRUD nền tảng của hệ thống vận tải. Chưa có hệ thống kiểm thử tự động (`src/test` hoàn toàn trống), chưa có tệp migration cơ sở dữ liệu, sử dụng role `ADMIN` thô và chưa hỗ trợ các nghiệp vụ chuyên biệt của đồ án.
- **`C:\Equideli\backend`** (233 tệp): Là phiên bản mở rộng toàn diện và hoàn thiện của đồ án sinh viên. Dự án đã được nâng cấp với:
  - 6 tệp Migration SQL Server đồng bộ thực tế.
  - Bộ kiểm thử tự động JUnit 5 / Mockito (100% tests PASS).
  - Nghiệp vụ phân quyền chuẩn (loại bỏ `ADMIN`, sử dụng `LOGISTICS_MANAGER`, phân định nhiệm vụ `staffType = DRIVER / ESCORT`).
  - Đầy đủ các phân hệ đặc thù: Quản lý bảng giá & snapshot chi phí dịch vụ (`pricing`), Cấu hình chuồng Stall đạt chuẩn quốc tế (`stalls`), Hồ sơ thể trạng ngựa đua thực tế (`breed, birth_year, weight_kg, height_cm, recovery_days`), Khiếu nại bồi thường thiệt hại (`compensation_claims`), Đánh giá dịch vụ khách hàng 5 sao (`service_feedbacks`), Khôi phục mật khẩu qua email (`password-reset`), Lịch trình chi tiết (`journey-timeline`).

**Quyết định tích hợp chiến lược**:
1. Giữ nguyên toàn bộ cấu trúc và các module hoàn thiện của `C:\Equideli\backend` (không ghi đè hàng loạt).
2. Tích hợp có chọn lọc 2 cải tiến có giá trị cao từ `C:\Backend_bonus`:
   - Tích hợp DTO [`TransportRequestApproveRequest.java`](file:///C:/Equideli/backend/src/main/java/com/equiflow/dto/TransportRequestApproveRequest.java) và nâng cấp API `PATCH /api/transport-requests/{id}/approve` để hỗ trợ linh hoạt cả duyệt có snapshot báo giá (`previewFingerprint`) lẫn duyệt có báo giá trực tiếp (`estimatedAmount`).
   - Tích hợp truy vấn đếm phân công tối ưu `countCrewAssignments` vào 4 repository hiện trường (`DeliveryRepository`, `IncidentRepository`, `TrackingLogRepository`, `HealthLogRepository`).

---

## 2. Thống kê số lượng tệp tin (File Diff Statistics)

| Nhóm phân loại | Số lượng | Tỷ lệ | Ghi chú |
| :--- | :---: | :---: | :--- |
| **Tổng số tệp trong `C:\Backend_bonus`** | **131** | 100% | Chỉ đọc, không thay đổi |
| **Tổng số tệp trong `C:\Equideli\backend`** | **233** | 178% | Chứa thêm migrations, test suite, sub-modules |
| **Tệp giống nhau hoàn toàn (Identical)** | **63** | 48.1% | Khớp 100% từng byte logic sau chuẩn hóa LF |
| **Tệp có khác biệt nội dung (Modified)** | **67** | 51.1% | Equideli mở rộng bảo mật, DTO và nghiệp vụ |
| **Tệp chỉ có trong `C:\Backend_bonus` (New in Bonus)** | **1** | 0.8% | `TransportRequestApproveRequest.java` |
| **Tệp chỉ có trong `C:\Equideli\backend` (Exclusive to Equideli)** | **103** | — | Pricing, Claims, Feedback, Stalls, Migrations, Tests... |

---

## 3. Khác biệt chi tiết theo từng Module

### 3.1. Phân hệ Phê duyệt yêu cầu vận chuyển (`TransportRequest`)
* **Trong `C:\Backend_bonus`**:
  * Có DTO `TransportRequestApproveRequest.java` chứa trường `estimatedAmount`.
  * API `approve` trong controller nhận `@RequestBody(required = false) TransportRequestApproveRequest req` và lưu trực tiếp `r.setEstimatedAmount(estimatedAmount)`.
* **Trong `C:\Equideli\backend`**:
  * Yêu cầu phê duyệt kết hợp với hệ thống Pricing Snapshot (`PricingDto.ApproveRequest` chứa `previewFingerprint`).
* **Đánh giá & Giải pháp tích hợp**:
  * Tích hợp `TransportRequestApproveRequest.java` vào Equideli, mở rộng record hỗ trợ cả `estimatedAmount` và `previewFingerprint`.
  * Nâng cấp `TransportRequestController` và `TransportRequestService` để nếu có `previewFingerprint` thì chốt snapshot báo giá, nếu có `estimatedAmount` thì cập nhật giá trực tiếp, nếu không truyền body thì giữ nguyên giá ước tính ban đầu. Điều này giúp API cực kỳ linh hoạt cho cả Web frontend lẫn kịch bản kiểm thử API nhanh.

### 3.2. Truy vấn phân công nhân sự hiện trường (`Crew Assignment Scoping`)
* **Trong `C:\Backend_bonus`**:
  * Bổ sung query tối ưu tại tầng DB trong 4 Repository:
    ```java
    @Query("""
        select count(a) from TransportAssignment a
        where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)
    """)
    long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
    ```
* **Trong `C:\Equideli\backend`**:
  * Sử dụng `CrewAssignmentAccessService` để kiểm tra phân công.
* **Đánh giá & Giải pháp tích hợp**:
  * Bổ sung query `countCrewAssignments` vào 4 repository của Equideli (`DeliveryRepository`, `IncidentRepository`, `TrackingLogRepository`, `HealthLogRepository`) để tối ưu hóa việc kiểm tra quyền thao tác của nhân viên hiện trường trực tiếp trên cơ sở dữ liệu.

### 3.3. Phân hệ Bảo mật, Phân quyền & Quản lý Tài khoản (`Security & Users`)
* **Khác biệt**:
  * `Backend_bonus`: Vẫn duy trì role `ADMIN`, chưa hỗ trợ phân định nhiệm vụ `staffType` (`DRIVER` / `ESCORT`), dùng `BCryptPasswordEncoder` mặc định không có cơ chế dung lỗi mật khẩu test.
  * `Equideli`: Tuân thủ nghiêm ngặt mô hình không có `ADMIN`, sử dụng role quản trị viên `LOGISTICS_MANAGER`, hỗ trợ `staffType` linh hoạt cho tài xế và nhân viên đi kèm. Triển khai `DemoAccountPasswordInitializer` và `HybridPasswordEncoder` đảm bảo đăng nhập mượt mà 100% với mật khẩu demo `equideli123`.
* **Quyết định**: **Giữ nguyên 100% cấu hình bảo mật của `Equideli`**.

### 3.4. Phân hệ Hồ sơ ngựa (`Horse Profile`)
* **Khác biệt**:
  * `Backend_bonus`: Chỉ có các thông tin cơ bản: tên, microchip, giới tính, tính khí, phả hệ.
  * `Equideli`: Đã mở khóa và lưu trữ thực tế xuống SQL Server các chỉ số thể trạng quan trọng: `breed`, `birth_year`, `weight_kg`, `height_cm`, `recovery_days` và `imageUrl`.
* **Quyết định**: **Giữ nguyên 100% triển khai của `Equideli`**.

### 3.5. Phân hệ Hóa đơn & Tiền tệ (`Invoices & Currency`)
* **Khác biệt**:
  * `Backend_bonus`: Lưu trữ tiền tệ mặc định là JPY (1.8M và 2.5M Yên). `InvoiceDto.Response` chỉ trả về `invoiceId`, `requestId`, `amount`, `currency`, `pdfUrl`, `paymentStatus`, `paymentMethod`, `issuedAt`, `paidAt` (thiếu thông tin khách hàng, làm UI phải hiển thị UUID thô).
  * `Equideli`: Chuẩn hóa USD toàn hệ thống ($4,500.00 và $5,800.00 USD), `InvoiceDto.Response` join bảng trả về `customerId` và `customerName`, bổ sung endpoint `MarkPaidRequest`.
* **Quyết định**: **Giữ nguyên 100% triển khai của `Equideli`**.

### 3.6. Các phân hệ độc quyền chỉ có tại `C:\Equideli\backend` (103 tệp)
1. **Module Gói dịch vụ & Bảng giá (`pricing`)**: Quản lý thành phần giá, snapshot báo giá, khóa chi phí tại thời điểm chốt đơn, chống cộng trùng option.
2. **Module Cấu hình chuồng (`stalls`)**: Định kích thước S, M, L, XL, Custom theo tiêu chuẩn an toàn vận chuyển.
3. **Module Khiếu nại bồi thường (`compensation_claims`)**: 6 nhóm tình huống, 8 trạng thái xử lý, duyệt số tiền bồi thường thực tế.
4. **Module Đánh giá dịch vụ (`service_feedbacks`)**: Chấm điểm 1 - 5 sao và 4 tiêu chí chi tiết cho chuyến đi hoàn thành.
5. **Module Lịch trình & Timeline (`journey-timeline`)**: Cung cấp API trực quan cho hành trình đa phương tiện.
6. **Module Đặt lại mật khẩu (`password-reset`)**: Quy trình gửi mã xác thực qua email.

---

## 4. Danh sách các thay đổi được chọn tích hợp vào `C:\Equideli\backend`

| STT | Tệp tin đích trong `C:\Equideli\backend` | Nguồn từ `C:\Backend_bonus` | Hành động thực hiện |
| :---: | :--- | :--- | :--- |
| **1** | `src/main/java/com/equiflow/dto/TransportRequestApproveRequest.java` | File duy nhất chỉ có ở Bonus | Tạo mới record DTO hỗ trợ cả `estimatedAmount` và `previewFingerprint`. |
| **2** | `src/main/java/com/equiflow/controller/TransportRequestController.java` | Phương thức `approve` linh hoạt | Cập nhật nhận `TransportRequestApproveRequest`, hỗ trợ duyệt có/không có body. |
| **3** | `src/main/java/com/equiflow/service/TransportRequestService.java` | Phương thức `approve` | Hỗ trợ lưu `estimatedAmount` trực tiếp nếu không qua quy trình snapshot pricing. |
| **4** | `src/main/java/com/equiflow/repository/DeliveryRepository.java` | Query `countCrewAssignments` | Bổ sung query đếm phân công trực tiếp trên DB. |
| **5** | `src/main/java/com/equiflow/repository/IncidentRepository.java` | Query `countCrewAssignments` | Bổ sung query đếm phân công trực tiếp trên DB. |
| **6** | `src/main/java/com/equiflow/repository/TrackingLogRepository.java` | Query `countCrewAssignments` | Bổ sung query đếm phân công trực tiếp trên DB. |
| **7** | `src/main/java/com/equiflow/repository/HealthLogRepository.java` | Query `countCrewAssignments` | Bổ sung query đếm phân công trực tiếp trên DB. |

---

## 5. Xác nhận tính toàn vẹn của thư mục tham chiếu

- **Trạng thái thư mục `C:\Backend_bonus`**: **Tuyệt đối không bị chỉnh sửa, tạo mới, di chuyển hay format bất kỳ tệp tin nào**.
- Toàn bộ quá trình đối chiếu chỉ sử dụng các lệnh đọc bộ nhớ tạm thời (`read_file`, `node` read-only streams).
