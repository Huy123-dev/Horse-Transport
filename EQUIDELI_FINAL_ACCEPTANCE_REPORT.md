# BÁO CÁO KIỂM THỬ NGHIỆM THU CUỐI DỰ ÁN EQUIDELI
**Hệ thống Quản lý Vận chuyển Ngựa Đua Xuyên Biên Giới (Cross-Border Racehorse Transport System)**

- **Ngày thực hiện:** 27/10/2026
- **Môi trường kiểm thử:** Development Local (SQL Server 2022, Spring Boot 3.3.5 / Java 21, React 19 / Vite 8)
- **Tài khoản kiểm thử:** Demo accounts (`customer@example.com`, `logistics.manager@example.com`, `driver@example.com`, `escort.vet@example.com` - Mật khẩu: `equideli123`)
- **Người thực hiện:** Antigravity Engineering Team

---

## TỔNG HỢP KẾT QUẢ NGHIỆM THU

| STT | Hạng mục kiểm thử | Trạng thái | Bằng chứng xác nhận |
|:---:|:---|:---:|:---|
| 1 | Khởi động & Kiểm tra Frontend React, Backend Spring Boot & SQL Server | **PASS** | Backend cổng 8080 (Tomcat started 5.4s), Frontend cổng 3000 (HTTP 200), SQL Server HikariPool kết nối thành công |
| 2 | Khách hàng cập nhật hồ sơ ngựa, lưu dữ liệu và tải lại trang | **PASS** | `PUT /api/horses/{id}` cập nhật giống, cân nặng 525kg, chiều cao 165.5cm, hồi phục 8 ngày; `GET /api/horses/{id}` reload khớp 100% |
| 3 | Đối chiếu hóa đơn, số tiền, tiền tệ USD ($) và tổng hợp số liệu | **PASS** | 100% hóa đơn tiền tệ USD; Tên khách hàng hiển thị "Hoang Van Dung" (không phải chuỗi UUID thô); Thống kê reduce Paid ($0.00) / Unpaid ($10,300.00) |
| 4 | Luồng Customer gửi Feedback & Yêu cầu bồi thường → Manager xử lý → Customer xem kết quả | **PASS** | Feedback 5 sao & 4 tiêu chí (201); Claim bồi thường (201); Manager duyệt PARTIALLY_APPROVED ($150 / $300); Customer xem kết quả cập nhật ngay |
| 5 | Đăng nhập Driver/Escort, phân quyền theo nhiệm vụ, lộ trình trực quan & thông báo | **PASS** | StaffType phân biệt rõ DRIVER và ESCORT; Lộ trình HKG ➔ NRT trực quan; Notification điều phối hiển thị đúng quyền |
| 6 | Rà soát API duyệt đơn khi request body rỗng (Bảo vệ snapshot quote) | **PASS** | Bắt buộc `previewFingerprint` khi đơn có cấu hình gói dịch vụ; ném HTTP 409 Conflict nếu body rỗng; Đã xác minh qua Unit test và runtime guard |
| 7 | Kiểm tra 4 Query `countCrewAssignments` trong 4 Repository | **PASS** | Cả 4 query trong `DeliveryRepository`, `IncidentRepository`, `TrackingLogRepository`, `HealthLogRepository` chạy thành công trên SQL Server thực tế qua Integration Test |
| 8 | Chạy lại toàn bộ Build và Test Suite | **PASS** | Backend Gradle Test: **BUILD SUCCESSFUL in 38s** (100% pass 29/29 test classes); Frontend Vite: **BUILD SUCCESSFUL in 1.48s** (0 error) |

---

## CHI TIẾT BẰNG CHỨNG KIỂM THỬ TỪNG HẠNG MỤC

### 1. Khởi động môi trường & kết nối cơ sở dữ liệu
- **Spring Boot Backend:**
  - Khởi động trên cổng `8080`.
  - Log: `Started EquiflowApplication in 5.424 seconds (process running for 5.71)`.
  - Kết nối HikariPool đến SQL Server `localhost:1433/HorseTransportManagementDB`: `Added connection ConnectionID:1 ... Start completed.`
- **React Frontend:**
  - Hoạt động ổn định trên cổng `3000`. Phản hồi HTTP `200 OK`.
- **Đánh giá:** **PASS**.

---

### 2. Luồng Khách hàng sửa hồ sơ ngựa, lưu dữ liệu và tải lại (Reload)
- **Tài khoản thực hiện:** `customer@example.com` (Khách hàng Hoang Van Dung).
- **Mã ngựa kiểm thử:** `d4000000-0000-0000-0000-000000000001` (Sakura Ace).
- **Thực thi:**
  1. Gửi request `PUT /api/horses/d4000000-0000-0000-0000-000000000001`:
     ```json
     {
       "microchipId": "MC-999-EQUI",
       "name": "Sakura Ace",
       "gender": "GELDING",
       "breed": "Thoroughbred Champion",
       "birthYear": 2019,
       "weightKg": 525.00,
       "heightCm": 165.50,
       "recoveryDays": 8,
       "pedigree": "Sire: Northern Dancer / Dam: Windmill",
       "medicalHistory": "Đã kiểm tra thể lực định kỳ 2026, sẵn sàng bay",
       "temperament": "Calm and steady"
     }
     ```
  2. Phản hồi API: HTTP `200 OK`.
  3. Gọi lại `GET /api/horses/d4000000-0000-0000-0000-000000000001` để mô phỏng tải lại trang (reload) từ SQL Server.
- **Kết quả đối chiếu:**
  - `breed`: `"Thoroughbred Champion"` (Khớp 100%).
  - `weightKg`: `525.0` (Khớp 100%).
  - `heightCm`: `165.5` (Khớp 100%).
  - `recoveryDays`: `8` (Khớp 100%).
  - `medicalHistory`: `"Đã kiểm tra thể lực định kỳ 2026, sẵn sàng bay"` (Khớp 100%).
- **Đánh giá:** **PASS**.

---

### 3. Đối chiếu Hóa đơn, Tiền tệ USD và Tính tổng số liệu
- **Tài khoản thực hiện:** `logistics.manager@example.com` và `customer@example.com`.
- **Endpoint:** `GET /api/invoices`.
- **Kết quả kiểm tra thực tế trên database:**
  - Danh sách hóa đơn: 2 hóa đơn mẫu (Hóa đơn vận chuyển ngựa chặng quốc tế).
  - Đơn vị tiền tệ: 100% hóa đơn mang trường `currency: "USD"`. Không còn tồn tại ký hiệu Yên Nhật (`JPY` / `¥`).
  - Tên khách hàng (`customerName`): Đã khắc phục triệt để lỗi hiển thị chuỗi UUID thô. Dữ liệu trả về đúng `"Hoang Van Dung"` thay vì mã `c3000000-0000-0000-0000-000000000005`.
  - Tính tổng tự động qua hàm `reduce`:
    - Tổng đã thanh toán (`PAID`): `$0.00 USD`.
    - Tổng chưa thanh toán (`UNPAID` / `PENDING`): `$10,300.00 USD` (Bao gồm hóa đơn $4,500.00 và $5,800.00).
- **Đánh giá:** **PASS**.

---

### 4. Luồng Feedback và Yêu cầu Bồi thường (End-to-End)
- **Mã yêu cầu vận chuyển:** `f6000000-0000-0000-0000-000000000001` (Chuyến đi NRT ➔ HKG đã hoàn thành và có biên bản bàn giao Delivery `d6f429a7-ed36-4d60-a611-2fa3f5f29200`).
- **Bước 4.1: Customer gửi đánh giá chất lượng dịch vụ (Feedback):**
  - Gửi `POST /api/transport-requests/f6000000-0000-0000-0000-000000000001/feedbacks`:
    ```json
    {
      "rating": 5,
      "transportQuality": 5,
      "horseCare": 5,
      "trackingUpdates": 5,
      "punctuality": 5,
      "comments": "Dịch vụ vận chuyển ngựa quốc tế tuyệt hảo, đội ngũ chăm sóc và bác sĩ thú y rất tận tình!",
      "photoUrl": "https://images.unsplash.com/photo-1534447677768-be436bb09401"
    }
    ```
  - Kết quả: HTTP `201 Created` (Mã phản hồi `68188314-2619-43d9-90b2-c92bd2d83e11`).
  - Gọi `GET /api/transport-requests/f6000000-0000-0000-0000-000000000001/feedback`: HTTP `200 OK`, lưu trữ đầy đủ 5 sao và 4 tiêu chí con.
- **Bước 4.2: Customer gửi yêu cầu bồi thường (Compensation Claim):**
  - Gửi `POST /api/transport-requests/f6000000-0000-0000-0000-000000000001/compensation-claims`:
    ```json
    {
      "category": "HORSE_HEALTH",
      "severity": "LOW",
      "description": "Yêu cầu hỗ trợ chi phí điện giải và thức ăn cao cấp hồi phục sau chuyến bay NRT ➔ HKG",
      "requestedAmount": 300.00,
      "currency": "USD",
      "evidenceUrl": "https://example.com/receipt-electrolytes.pdf"
    }
    ```
  - Kết quả: HTTP `201 Created` (Mã claim: `7a14c870-8f0b-4d49-b119-d793be0ca3ee`, trạng thái ban đầu: `SUBMITTED`).
- **Bước 4.3: Logistics Manager thẩm định & duyệt bồi thường:**
  - Đã thực hiện migration SQL mở rộng CHECK constraint: `20261107_expand_compensation_claim_status_constraint.sql`.
  - Gửi `PATCH /api/compensation-claims/7a14c870-8f0b-4d49-b119-d793be0ca3ee/review`:
    ```json
    {
      "status": "PARTIALLY_APPROVED",
      "decisionNote": "Chấp thuận hỗ trợ 50% chi phí dinh dưỡng theo chính sách vận chuyển quốc tế.",
      "approvedAmount": 150.00
    }
    ```
  - Kết quả: HTTP `200 OK`. Trạng thái chuyển thành `PARTIALLY_APPROVED`, người duyệt: `Tran Thi Hoa`.
- **Bước 4.4: Customer tra cứu và xem kết quả giải quyết:**
  - Gửi `GET /api/transport-requests/f6000000-0000-0000-0000-000000000001/compensation-claims`.
  - Kết quả: Hiển thị đúng số tiền yêu cầu `$300.00`, số tiền duyệt `$150.00 USD`, ghi chú thẩm định rõ ràng.
- **Đánh giá:** **PASS**.

---

### 5. Kiểm tra Role và Dashboard Tài xế (Driver) & Đi kèm (Escort)
- **Đăng nhập và phân biệt vai trò:**
  - `driver@example.com` (Le Van Binh): `roleId: DRIVER_ESCORT`, `staffType: DRIVER`.
  - `escort.vet@example.com` (Pham Van Cuong): `roleId: DRIVER_ESCORT`, `staffType: ESCORT`.
- **Hiển thị lộ trình (Route Parsing):**
  - Tuyến đường JSON thô `{"route":["HKG","NRT"]}` và `{"route":["NRT","HKG"]}` được bóc tách và định dạng hiển thị trực quan thành dạng text mũi tên `HKG ➔ NRT` / `NRT ➔ HKG`.
- **Thông báo điều phối:**
  - `GET /api/notifications` phản hồi HTTP `200 OK` theo đúng quyền hạn của nhân viên hiện trường.
- **Đánh giá:** **PASS**.

---

### 6. Rà soát API Duyệt đơn khi Request Body rỗng (Snapshot Safeguard)
- **Cơ chế an toàn:**
  - Tại [`TransportRequestService.java`](file:///C:/Equideli/backend/src/main/java/com/equiflow/service/TransportRequestService.java#L188-L191), hệ thống kiểm tra `pricingService.hasPricingSelection(id)`.
  - Nếu đơn hàng có cấu hình dịch vụ bảng giá nhưng request body rỗng hoặc thiếu `previewFingerprint`: Backend lập tức từ chối và ném ngoại lệ `ApiException(HttpStatus.CONFLICT, "Yêu cầu vận chuyển này có cấu hình gói dịch vụ; bắt buộc phải xác nhận báo giá kèm previewFingerprint.")`.
  - Đảm bảo tính toán toàn vẹn dữ liệu tài chính, ngăn chặn duyệt đơn sai lệch báo giá.
- **Đánh giá:** **PASS**.

---

### 7. Kiểm tra 4 Query `countCrewAssignments` trong 4 Repository
- **4 Repository đã được bổ sung truy vấn:**
  1. [`DeliveryRepository`](file:///C:/Equideli/backend/src/main/java/com/equiflow/repository/DeliveryRepository.java):
     ```java
     @Query("select count(a) from TransportAssignment a where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)")
     long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
     ```
  2. [`IncidentRepository`](file:///C:/Equideli/backend/src/main/java/com/equiflow/repository/IncidentRepository.java):
     ```java
     @Query("select count(a) from TransportAssignment a where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)")
     long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
     ```
  3. [`TrackingLogRepository`](file:///C:/Equideli/backend/src/main/java/com/equiflow/repository/TrackingLogRepository.java):
     ```java
     @Query("select count(a) from TransportAssignment a where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)")
     long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
     ```
  4. [`HealthLogRepository`](file:///C:/Equideli/backend/src/main/java/com/equiflow/repository/HealthLogRepository.java):
     ```java
     @Query("select count(a) from TransportAssignment a where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)")
     long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
     ```
- **Xác thực tự động qua Integration Test:**
  - File test: [`CrewAssignmentRepositoryQueryTest.java`](file:///C:/Equideli/backend/src/test/java/com/equiflow/repository/CrewAssignmentRepositoryQueryTest.java).
  - Kết quả chạy thực tế: Kết nối trực tiếp SQL Server, biên dịch JPQL thành T-SQL và trả về kết quả chính xác không có lỗi cú pháp hay schema.
- **Đánh giá:** **PASS**.

---

### 8. Kết quả Build và Test Suite tổng thể
- **Backend (Spring Boot):**
  - Chạy lệnh: `gradlew.bat test`.
  - Kết quả: **BUILD SUCCESSFUL in 38s** (Toàn bộ 29 test classes bao gồm security, authorization, repository, service đều passed 100%).
- **Frontend (React / Vite / TypeScript):**
  - Chạy lệnh: `npm run build`.
  - Kết quả: **BUILD SUCCESSFUL in 1.48s** (2,798 modules transformed, 0 error, 0 warning blocker).
- **Đánh giá:** **PASS**.

---

## KẾT LUẬN & KIẾN NGHỊ BÀN GIAO
- Toàn bộ 8 mục kiểm thử nghiệm thu đều đạt tiêu chuẩn **PASS** với đầy đủ chứng cứ dữ liệu thực tế từ cơ sở dữ liệu SQL Server.
- Mã nguồn thư mục tham chiếu `C:\Backend_bonus` được bảo đảm **nguyên vẹn 100%**, không có bất kỳ hành động chỉnh sửa hoặc ghi file vi phạm.
- Hệ thống Equideli đã sẵn sàng để demo, nghiệm thu đồ án đại học với luồng người dùng mượt mà, phân quyền chuẩn và giao diện nhất quán.
