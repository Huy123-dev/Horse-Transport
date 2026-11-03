# EQUIDELI — khảo sát kiến trúc và bản đồ API

### Bảng giá và báo giá vận chuyển

- `GET /api/pricing/catalog` trả danh mục 3 gói vận chuyển và 8 dịch vụ; cấu hình giá, đơn vị tính, quyền lợi, trạng thái bắt buộc và dịch vụ bao gồm được lưu riêng. Catalog chưa cấu hình giá trả `priceUsd: null` (UI hiển thị “Chưa có”); giá `0` là miễn phí được cấu hình tường minh.
- `PUT /api/pricing/catalog/{code}` chỉ dành cho LOGISTICS_MANAGER. Không có giá mặc định hoặc seed; không cấu hình nghĩa là chưa có giá.
- `POST /api/pricing/quote-preview` tính bản xem trước theo số ngựa và lựa chọn: `PER_HORSE` nhân số ngựa, `PER_REQUEST` và `PER_TRIP` tính một đơn vị cho yêu cầu (mỗi yêu cầu chỉ có tối đa một kế hoạch đang hiệu lực). Dòng đã nằm trong gói được biểu diễn là đã bao gồm và không tính phí lần hai.
- `POST /api/transport-requests` lưu `pricingSelection` gồm một `packageCode` và `serviceCodes`. `PUT /api/transport-requests/{id}/pricing-selection` cho phép Customer sở hữu yêu cầu hoặc LOGISTICS_MANAGER thay đổi lựa chọn khi yêu cầu còn chờ thẩm định.
- `GET /api/transport-requests/{id}/quote` trả báo giá xem trước hoặc snapshot đã chốt. `PATCH /api/transport-requests/{id}/approve` nhận `previewFingerprint`; backend tính lại trong transaction và từ chối nếu giá/dòng tính đã thay đổi kể từ lần xem trước. Khi phê duyệt, backend tạo snapshot bất biến và cập nhật `estimatedAmount` theo USD. Không cho phê duyệt nếu còn dòng bắt buộc/được chọn chưa cấu hình.
- Invoice của yêu cầu có snapshot dùng đúng tổng USD đã chốt; không cho ghi đè tổng đó. Báo giá và hóa đơn lịch sử giữ nguyên số tiền/tiền tệ gốc; hệ thống không tự quy đổi.
- Schema mới nằm trong `backend/database/migrations/20261026_add_pricing_catalog_quotes.sql`. Migration chỉ được tạo, chưa chạy; runtime/database chưa được xác minh.

> Tài liệu khảo sát ban đầu; trạng thái runtime bên dưới được cập nhật sau khi đối chiếu mã nguồn và kiểm thử ngày 2026-10-21.

### Timeline hành trình và thống kê Logistics Manager (2026-10-25)

- `GET /api/transport-plans/{id}/timeline` gộp tracking, health logs và incidents; trả timeline mới nhất trước. Chỉ CUSTOMER và LOGISTICS_MANAGER được gọi. Customer ownership được kiểm tra lại trong các service domain trước khi trả nội dung từng loại sự kiện.
- `GET /api/dashboard/stats` chỉ dành cho LOGISTICS_MANAGER; trả tổng transport requests, số plans `Dang thuc hien`, số plans `Hoan thanh`, và doanh thu hóa đơn `Da thanh toan` nhóm theo currency. Không cộng các đơn vị tiền tệ khác nhau và không tự quy đổi tỷ giá.
- Frontend hiển thị timeline trong trang chi tiết plan cho Customer/Logistics Manager và thay KPI Logistics Manager bằng bốn số liệu từ endpoint stats. Typecheck/lint/build và backend tests đã chạy; chưa xác minh các endpoint trên runtime.

### Cập nhật chuyển quyền quản trị sang Logistics Manager

- Backend `SecurityConfig` không còn cấp quyền cho role ADMIN; quyền trước đây có ADMIN được chuyển sang LOGISTICS_MANAGER, gồm users, roles, audit logs và các matcher nghiệp vụ. User management vẫn chỉ trả/cho phép quản lý nhân sự nội bộ, không mở rộng sang CUSTOMER.
- `RoleController` và `AuditLogController` chỉ dành cho LOGISTICS_MANAGER theo security matcher; `RoleService` không trả role ADMIN kể cả trước khi DB script chạy. `UserController` không suy diễn đặc quyền admin; giới hạn nội bộ được áp dụng trực tiếp trong `UserService`.
- Frontend xóa role ADMIN khỏi constants, dashboard/router và điều kiện xem plan detail; Logistics Manager tiếp tục có dashboard, plan detail và quản lý nhân sự.
- [remove_admin_role.sql](../../backend/database/maintenance/remove_admin_role.sql) là script bảo trì thủ công có transaction và preflight. Chưa chạy trên database. Script chuyển ownership horse/request và notifications; request customer ownership sẽ đổi sang tài khoản Logistics Manager. Audit rows được giữ lại nhưng `user_id` đặt NULL. Script rollback nếu còn FK reference khác để không tự chuyển attribution/assignment lịch sử.
- Chưa xác minh DB runtime; cần xác nhận schema thực tế, backup và review row counts trước khi DBA chạy script. User có role ADMIN sẽ được đổi sang LOGISTICS_MANAGER; `admin@example.com` bị xóa chỉ khi không còn tham chiếu FK ngoài phạm vi chuyển đã nêu.

### Cập nhật Driver write/read integration

- `GET /api/transport-plans/{id}` và danh sách plans trả cả `horseIds` lẫn `horses` (horseId, name, microchipId, imageUrl) từ quan hệ `transport_requests` → `transport_request_horses`; không thêm bảng/cột hay migration.
- Driver/Escort có thể đọc `GET /api/transport-plans/{id}/tracking`, `/tracking/latest`, `/delivery` và `GET /api/deliveries/{id}`. Controller truyền role context vào service; `TrackingService`/`DeliveryService` gọi `CrewAssignmentAccessService.assertAssigned` trước khi trả dữ liệu. POST tracking/delivery tiếp tục kiểm tra assignment; POST health log/incident cũng đã có kiểm tra scope.
- Upload chứng từ: `POST /api/files/upload` nhận multipart field `file`, giới hạn 10 MB và chỉ nhận ảnh JPG/JPEG/PNG hoặc PDF; trả `{ "url": "http://<backend-host>/uploads/<key>" }`. CUSTOMER, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST và DRIVER_ESCORT được upload. `GET /uploads/**` public. Các file của endpoint này được lưu trong `uploads/public/`; file hồ sơ ngựa hiện có tiếp tục ở thư mục uploads riêng và chỉ tải qua endpoint có kiểm tra quyền. URL public không yêu cầu JWT; chỉ dùng cho hình ảnh/chứng từ không chứa dữ liệu cần giữ riêng tư. File local cần persistent volume khi triển khai.
- Ảnh hồ sơ ngựa dùng `POST /api/horses/images` (multipart field `file`), chỉ CUSTOMER, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST được upload; backend kiểm tra MIME, phần mở rộng, chữ ký file và giới hạn cấu hình `UPLOAD_MAX_FILE_SIZE_BYTES` (mặc định 10 MiB). Khi lưu hồ sơ, backend chỉ nhận URL ảnh nằm trong vùng `/uploads/` và chuẩn hóa thành đường dẫn tương đối để không lưu host của máy phát triển vào `image_url`. Ảnh được public phục vụ qua `/uploads/**`; không dùng cho tài liệu riêng tư.
- Form Delivery của Driver tải ảnh chữ ký/POD lên trước, sau đó gửi URL thực vào `POST /api/deliveries`. Upload và tạo delivery là hai request riêng; nếu tạo delivery thất bại, file đã upload có thể còn lại trong `uploads/public/` để quản trị viên dọn theo retention policy.
- Các form trong trang chi tiết Driver gửi đúng hợp đồng Spring:
  - `POST /api/health-logs`: `planId`, `horseId`, `stressLevel`, `heartRate`, `temperature`, `appetiteStatus`, `notes`; backend vẫn là nguồn validation cuối.
  - `POST /api/incidents`: `planId`, `category`, `description`, `sos`, tọa độ tùy chọn theo cặp và `additionalCost`. Không gửi các trường legacy `isSos`/`locationName`.
  - `POST /api/tracking`: `planId`, `milestone`, `latitude`, `longitude`.
  - `POST /api/deliveries`: `planId`, `recipientName`, `signatureImageUrl`, `podDocumentUrl`. Signature/POD được upload trước qua API file và URL public trả về được đưa vào payload.
- Delivery lookup xử lý chỉ HTTP 404 là “chưa có biên bản”; các lỗi còn lại (401/403/5xx) được hiển thị, không chuyển thành empty state giả.

### Cập nhật nhiệm vụ Transport Specialist

- Dashboard chuyên viên dùng các GET Spring hiện có: yêu cầu đã duyệt, kế hoạch vận chuyển và inspections. Tạo transport plan vẫn thuộc Fleet Coordinator; specialist chỉ xem yêu cầu chờ plan và mở kế hoạch hiện hữu.
- `TRANSPORT_SPECIALIST` được phép POST/PUT/DELETE route stops trong SecurityConfig. Service hiện có vẫn kiểm tra trạng thái kế hoạch, thứ tự trùng, dữ liệu location và thời gian; frontend thêm điểm dừng với sequence, loại điểm dừng, thời gian dự kiến và ghi chú. Fleet Coordinator giữ nguyên quyền cũ.
- Không có entity, DTO hoặc API phân bổ chuồng riêng cho từng ngựa. Quarantine reservation chỉ biểu diễn cơ sở và khoảng ngày theo request, không tương đương cấu hình stall; UI báo chưa hỗ trợ thay vì ghi dữ liệu suy đoán.
- Driver/Escort write API đã tồn tại và tiếp tục bị giới hạn theo assignment trong service: POST tracking, health logs, incidents, deliveries; incident PATCH cũng xác thực assignment. Không có PUT API cho tracking/health/delivery trong backend hiện tại; không tạo endpoint giả.
  - Kiểm tra source/test: `npm run typecheck`, `npm run lint`, `npm run build` đều thành công; build cảnh báo bundle JS 811.36 kB (>500 kB). `backend\gradlew.bat test` thành công, 18 tests/0 failures, gồm plan horse IDs, route/controller authorization và assignment enforcement của tracking/delivery.
  - Các kết quả này không chứng minh runtime. Chưa gọi endpoint nghiệp vụ, chưa restart backend và chưa gửi POST; backend cần được restart sau khi triển khai code. Không thực hiện thao tác ghi hay thay đổi schema/database trong lượt này.

> **Cập nhật frontend 2026-10-25:** ứng dụng đã chuyển sang Vite + React; `src/app`, 46 Next.js Route Handlers và Prisma source/dependencies đã được gỡ khỏi frontend. Dữ liệu SQLite hiện có trong `db/` được giữ nguyên, không đọc/ghi hay xóa. `src/lib/api-client.ts` gọi trực tiếp Spring Boot bằng `VITE_API_BASE_URL` (mặc định `http://localhost:8080/api`). Build, typecheck và lint thành công. Kiểm thử runtime chỉ dùng GET/OPTIONS không credential: `GET /api/auth/me` trả 401 khi chưa xác thực; từ `http://localhost:3000`, response có `Access-Control-Allow-Origin` đúng và login preflight trả 200, cho phép `authorization`/`content-type`. Origin `127.0.0.1:3000` và preview `127.0.0.1:4173` bị backend từ chối CORS (403); Vite dev host đã được đổi sang `localhost` và khóa cổng 3000 để khớp cấu hình backend. Browser tại `http://localhost:3000` render landing page; chưa thử login, credential, hoặc luồng nghiệp vụ. Production browser/API/auth chưa được xác minh. Build còn cảnh báo bundle JavaScript 784.98 kB. Các dòng trạng thái runtime ngày 2026-10-21/22 và snapshot Next/Prisma phía dưới là lịch sử, không phải kết quả mới.

> **Cập nhật phân quyền Driver/Escort 2026-10-25:** backend hiện lọc GET kế hoạch, điểm dừng, nhật ký sức khỏe và sự cố theo `driver_user_id` hoặc `attendant_user_id` trong `transport_assignments`; ID không được phân công trả 404. Cùng các view Driver đã chuyển sang đọc `/api/transport-plans`, `/stops`, `/health-logs` và `/incidents`. `gradlew.bat test` (15 tests), typecheck, lint và Vite build thành công; bundle JS 798.10 kB còn vượt cảnh báo 500 kB. Đây là kết quả source/test, chưa xác minh runtime với tài khoản Driver/Escort; backend cần restart để áp dụng. Không thay đổi schema, migration, seed hoặc dữ liệu.

> **Cập nhật source 2026-10-22:** backend prototype `frontend/backend/` đã được gỡ; backend nghiệp vụ là `../../backend`. CUSTOMER dashboard đang gọi các API Spring hiện hữu (`/transport-requests/my`, `/horses/my-horses`, `/my/invoices`). Đã bổ sung API assignment trên bảng `transport_assignments` và nối vào trang chi tiết kế hoạch. Backend hiện bổ sung owner scope cho GET horses của CUSTOMER, giới hạn sửa locations và kiểm tra ownership khi CUSTOMER tạo quarantine reservation. Đây mới là kiểm tra source/build/test; ngày 2026-10-22 các port 3000 và 8080 không phản hồi nên không có runtime result mới.

## Bản đồ có thẩm quyền cho workspace hiện tại

Các endpoint dưới đây đối chiếu với controller, DTO, service và `SecurityConfig` trong `..\..\backend`. `api-client.ts` gọi trực tiếp Spring Boot tại `http://localhost:8080`; các Next.js Route Handlers trong `src/app/api/**` không phải backend Spring và không được xem là bằng chứng một API Spring tồn tại.

| Tính năng / màn hình | Hợp đồng backend đã kiểm tra | Vai trò / phạm vi | Persistence | Trạng thái hiện tại |
|---|---|---|---|---|
| Đăng nhập / phiên | `POST /api/auth/login` body `{email,password}` → `{accessToken,tokenType,expiresInMs,user}`; `GET /api/auth/me` → `UserInfo` | Login public; `/me` cần Bearer JWT | JWT stateless; user từ `dbo.users` | **REAL API VERIFIED**: login form, lưu token/role, Dashboard và `/me` đã chạy trong browser |
| Đăng ký | `POST /api/auth/register` body `{name,email,phone,organizationName,password,confirmPassword}` | Public; role mặc định do backend cấp | `dbo.users` | Payload và validation frontend/backend đã đồng bộ; chưa chạy live vì tạo user thật |
| Quên/đặt lại mật khẩu | Không có endpoint tương ứng trong Spring `AuthController` | Chưa hỗ trợ | Next Route Handlers cũ dùng Prisma độc lập, không dùng Spring auth store | UI thông báo chưa hỗ trợ; không gửi mã hoặc báo thành công |
| Vai trò / audit logs | `GET /api/roles[/{id}]`, `GET /api/audit-logs[/{id}]` | ADMIN theo controller và SecurityConfig hiện tại | Đọc SQL Server | Source matcher đã đồng bộ; process runtime cũ nên thay đổi quyền chưa được xác minh |
| Hồ sơ ngựa | `GET /api/horses/my-horses`; `POST /api/horses`; `GET/PUT /api/horses/{id}`; horse/document API riêng | Customer chỉ thao tác hồ sơ của mình theo service; nhân sự theo SecurityConfig | `dbo.horses`, `dbo.documents` | **REAL API INTEGRATED**; list/read có xác thực nguồn; mutation chưa chạy để tránh ghi dữ liệu demo |
| Tạo yêu cầu | `POST /api/transport-requests` JSON gồm `originLocationId,destinationLocationId,scheduledDepartureDate,scheduledArrivalDate,horseIds,specialRequirements,currency` → `TransportRequestResponse`; sau khi tạo, `POST /api/horses/{horseId}/documents` multipart (`file`,`documentType`,`requestId`) | CUSTOMER; service kiểm tra quyền sở hữu horse và tài liệu | `dbo.transport_requests`, quan hệ horse/request, lưu file theo `app.upload.dir` | **WIZARD WIRED TO REAL API — STATIC VERIFIED**; không tạo request/upload runtime do database thử nghiệm chưa xác nhận |
| Danh sách/chi tiết yêu cầu | `GET /api/transport-requests/my`, `GET /api/transport-requests`, `GET /api/transport-requests/{id}` → mảng/object trực tiếp | Customer bị lọc theo owner; nhân viên được cấp quyền xem toàn bộ | Đọc SQL Server | **REAL API VERIFIED**: ADMIN đọc 3 request qua list API; CUSTOMER credential chưa được xác minh |
| Manager approve/reject | `PATCH /api/transport-requests/{id}/approve` body tùy chọn `{estimatedAmount}`; `PATCH .../{id}/reject` body `{reason}` → `TransportRequestResponse` | LOGISTICS_MANAGER theo SecurityConfig; service chỉ chuyển trạng thái hợp lệ | Cập nhật request; reject reason hiện thông báo, không có endpoint history riêng | **API EXISTS — UI INTEGRATED**; mutation chưa kiểm thử runtime |
| Kiểm định | `GET /api/inspections[/{id}]`, `GET /api/inspections/request/{requestId}`, `POST /api/inspections`, `PATCH /api/inspections/{id}/status` | TRANSPORT_SPECIALIST ghi; GET theo role/owner | Bảng kiểm định `dbo.inspection_statuses` | **REAL API VERIFIED**: ADMIN đọc 3 bản ghi; specialist mutation chưa kiểm thử runtime |
| Transport plans / route stops / assignment | `GET/POST /api/transport-plans`, `GET/PUT /api/transport-plans/{id}`, route-stop endpoints; `GET/POST /api/transport-plans/{id}/assignments`, `GET /api/transport-plans/{id}/assignment-options`, `PUT/DELETE /api/transport-assignments/{id}` | Fleet Coordinator quản lý assignment; Driver/Escort chỉ GET kế hoạch/điểm dừng có assignment của chính họ; assignment GET chỉ cho staff được liệt kê trong SecurityConfig | `dbo.transport_plans`, `dbo.route_stops`, `dbo.transport_assignments` | Source và test xác nhận scope; runtime chưa xác minh |
| Phương tiện | `GET/POST /api/transport-assets`, `GET/PUT/DELETE /api/transport-assets/{id}` | Fleet Coordinator quản lý; manager/admin đọc theo SecurityConfig | `dbo.transport_assets` | **REAL API VERIFIED**: ADMIN đọc 3 asset |
| Tracking / sức khỏe / incident / delivery | GET history/tracking latest, delivery by plan/id; POST `/api/health-logs`, `/api/incidents`, `/api/tracking`, `/api/deliveries` với DTO Spring | Driver/Escort đọc/ghi theo assignment; customer đọc theo ownership với tracking/delivery | Bảng log nghiệp vụ tương ứng | Forms và API client đã nối; tracking/delivery reads được scoped trong service. Runtime nghiệp vụ chưa kiểm tra |
| Hóa đơn / thanh toán | `GET /api/invoices`, `/api/invoices/{id}`, `/api/my/invoices`; `POST /api/invoices`; `PATCH /api/invoices/{id}/payment-status` | Customer xem của mình; manager/admin thao tác trong quyền | `dbo.invoices`; cập nhật payment status không phải payment gateway | **REAL API VERIFIED**: ADMIN đọc 2 invoice; mutation không thử |
| Dashboard nội bộ | Không có endpoint `/api/dashboard`; dashboard Driver tổng hợp từ `GET /api/transport-plans` đã lọc assignment | Driver chỉ nhận danh sách kế hoạch được phân công; các role nội bộ khác dùng API nguồn theo từng dashboard | Chỉ đọc API nghiệp vụ thật | Driver UI dùng API hiện có; runtime chưa xác minh |
| Notifications, search, trips, recovery summary | Không có controller Spring tương đương cho `/api/notifications`, `/api/search`, `/api/trips/**`, `/api/recovery-dashboard` | Không được giả lập thành dữ liệu thật | Không có persistence Spring xác nhận | **NOT IMPLEMENTED**; UI giữ trạng thái chưa hỗ trợ |
| Nhân sự / tài khoản | `/api/users` GET/POST, `/{id}` GET/PUT; response có thông tin liên hệ và role | ADMIN/LOGISTICS_MANAGER; manager chỉ được quản lý bốn role nhân sự nội bộ, không CUSTOMER/ADMIN | `dbo.users` | **API EXISTS — SECURITY FIX BUILT, RUNTIME PENDING**: trước đó matcher cho phép CUSTOMER và service trả/sửa dữ liệu user; SecurityConfig/service/controller đã giới hạn. Backend process đang chạy chưa được restart để áp dụng |

### Wizard tạo yêu cầu — mapping hiện tại

- Entry point `request-create` của khách hàng trong `view-router.tsx` sử dụng `RequestCreateWizard` cũ, không dùng form đơn bước `RequestCreate`.
- Đọc lựa chọn từ `GET /api/horses/my-horses` và `GET /api/locations`. Chỉ lấy `horseId` từ danh sách của customer; backend service vẫn xác minh ownership và tồn tại của horse/location khi ghi.
- Gửi JSON tới `POST /api/transport-requests`; trường request đúng `TransportRequestCreateRequest`: location IDs (UUID, bắt buộc, khác nhau), hai ngày `LocalDate` (bắt buộc, khởi hành không quá khứ, arrival cùng/sau departure), horse IDs (ít nhất một, từng horse phải thuộc owner), `specialRequirements` (tối đa 4000), `currency` (3 chữ cái; service mặc định JPY nếu trống). Response là `TransportRequestResponse`; UI dùng `requestId` và `status` trả về, không tạo mã giả.
- Tệp được giữ trong memory tới khi POST request thành công; sau đó mỗi file gửi multipart tới `POST /api/horses/{horseId}/documents` cùng `documentType` và `requestId`. Service kiểm tra quyền sở hữu horse, customer của request và horse thuộc request. Upload là thao tác riêng sau create; lỗi upload không làm frontend gửi lại POST request.
- `deadlineDateTime`, timezone, pickup/delivery note, transport option, stall configuration, escort counts, add-ons và quote không có trường/API tương ứng trong contract Spring hiện tại. Wizard giữ 8 bước nhưng bước 3–7 chỉ nêu trạng thái chưa hỗ trợ; không gửi chúng, không tính phí cục bộ.
- Code đã kiểm tra tĩnh; không thử POST tạo request hoặc upload vì sẽ ghi database/file storage và môi trường thử nghiệm chưa được xác nhận. Vì vậy chưa xác minh response tạo request, upload runtime hay đọc lại từ customer account.

### Runtime và baseline của lượt audit này

- Khôi phục wizard trong task hiện tại chỉ được kiểm tra source/build/lint; không gọi các GET lựa chọn từ màn hình Customer và không gửi POST create/upload. `POST /api/transport-requests` và `POST /api/horses/{horseId}/documents` sẽ ghi SQL Server/file storage, trong khi môi trường thử nghiệm riêng và credential CUSTOMER chưa được xác nhận.
- Đã xác nhận từ browser `http://localhost:3000` tới backend `http://localhost:8080`: `GET` requests/plans/inspections/assets/incidents/invoices trả HTTP 200, lần lượt 3/2/3/3/1/2 bản ghi. Chỉ đếm bản ghi, không ghi dữ liệu hoặc in thông tin cá nhân.
- Admin gọi `GET /api/transport-requests/my` bị từ chối (HTTP 401); endpoint này chỉ dành CUSTOMER. Đăng nhập CUSTOMER và các tài khoản nội bộ khác chưa thử vì chưa có credential đã xác minh.
- Runtime probe không dùng token: GET `/api/auth/me`, `/api/roles`, `/api/audit-logs`, `/api/transport-requests`, `/api/transport-plans`, `/api/inspections`, `/api/transport-assets`, `/api/incidents`, `/api/invoices` đều trả HTTP 401 (expected for anonymous), không dùng để kết luận quyền role.
- CORS preflight `OPTIONS /api/roles` với Origin `http://localhost:3000` trả HTTP 200 và `Access-Control-Allow-Origin` khớp origin; methods gồm GET/POST/PUT/PATCH/DELETE/OPTIONS.
- Reload browser frontend quan sát trực tiếp request `GET http://localhost:8080/api/auth/me` → HTTP 401 không token, khớp URL client và expected unauthenticated status; không chứng minh login.
- Backend PID `28096` (Java) chạy từ `2026-10-21 06:36:58`; `RegisterRequest.class` biên dịch lúc `06:51:32`, `SecurityConfig.class` lúc `06:53:49`. Listener classpath trỏ `backend/build/classes/java/main`, nhưng không restart sau compile nên JVM đang dùng class đã load cũ. Không tự dừng/restart process.
- Không xác định được đây là dev/staging/shared. Local datasource cấu hình SQL Server `HorseTransportManagementDB`, chưa có DB test riêng được xác nhận. Không gửi POST đăng ký hoặc mutation và không dùng credential cho probe.
- Login frontend và dashboard ADMIN đã được kiểm tra ở lượt trước. Lượt hiện tại không có credential/token để xác minh login/session hoặc quyền role sau thay đổi.
- Baseline: `npm run build` thành công nhưng Next bỏ qua kiểm tra TypeScript; `npm run lint` có 7 lỗi hook pre-existing; `npx tsc --noEmit` còn lỗi thiếu `socket.io`/`socket.io-client` trong ví dụ websocket; `.\gradlew.bat build` thành công, `test NO-SOURCE`.
- Backend build thành công sau security/validation changes nhưng service đang chạy cổng 8080 vẫn dùng class đã load trước các thay đổi. Không có database/schema/seed mutation.

## Trạng thái tích hợp hiện tại

Đối chiếu controller, DTO, service và SecurityConfig trong `../../backend`. Frontend vẫn là Next.js; không có proxy Next được cấu hình cho các component dùng `src/lib/api-client.ts`.

### A. Mapping backend Spring Boot hiện tại

- Login dùng body `{email,password}`; khi chọn “Ghi nhớ đăng nhập”, access token được lưu trong localStorage, nếu không sẽ lưu trong sessionStorage. API client đọc cả hai nơi và xóa token ở cả hai khi nhận HTTP 401.

- Base URL là `NEXT_PUBLIC_API_BASE_URL` (mặc định `http://localhost:8080`); client chuẩn hóa tiền tố `/api`, gửi Bearer token, parse response trực tiếp hoặc rỗng, ném lỗi HTTP có status và xóa phiên khi nhận 401. Multipart không bị gắn `Content-Type` thủ công.
- Login nhận JSON `{ "email", "password" }` tại `POST /api/auth/login`, trả `{ accessToken, tokenType, expiresInMs, user }`; `/api/auth/me` trả user trực tiếp. Backend stateless, không có logout endpoint. Bảng `dbo.users` ban đầu thiếu `phone_number` và `organization_name` dù entity ánh xạ chúng; migration `../../backend/database/migrations/20261021_add_user_profile_columns.sql` bổ sung hai cột nullable.
- `POST /api/auth/register` yêu cầu `name,email,phone,organizationName,password,confirmPassword`; `phone` phải đúng 10 chữ số bắt đầu bằng `0`. Frontend gửi đúng `phone` (không phải `phoneNumber`) và validate các trường bắt buộc. Recovery chưa được Spring hỗ trợ; các route handlers Next cũ dùng Prisma riêng và không được coi là endpoint auth của backend hiện tại.
- `/api/horses/my-horses` trả mảng trực tiếp, trong đó `imageUrl` có thể null. DTO hỗ trợ ảnh, microchip, tên, giới tính, phả hệ, tiền sử bệnh, dị ứng, tính khí và tùy quyền `ownerUserId`; giống/năm sinh/cân nặng/chiều cao/recovery không được hỗ trợ. Transport request và plan cũng trả `imageUrl` theo từng ngựa để hiển thị nhất quán trong luồng yêu cầu/chuyến.
- `/api/transport-assets` trả mảng `TransportAssetDto.Response`; không có `/api/assets`, `ownerPartner` object hay `stallConfig`.
- `/api/transport-plans` có DTO riêng cho list/detail/create; route stops có API riêng. Create nhận requestId, routeDetails, departureTime, arrivalTime và coordinator tùy chọn. Chi tiết hiện đọc route stops, tracking, health logs, incidents và delivery theo ID kế hoạch; không coi kế hoạch là trip.
- `/api/users` trả mảng `UserResponse`; create dùng `phone` và `password`, không phải `phoneNumber`/`tempPassword`. SecurityConfig giới hạn `/api/users/**` cho ADMIN/LOGISTICS_MANAGER; service giới hạn Logistics Manager ở các role nội bộ. `GET /api/roles` trả danh sách tên/miêu tả vai trò và cho phép CUSTOMER/ADMIN/LOGISTICS_MANAGER theo SecurityConfig (comment controller chỉ ADMIN hiện không còn khớp matcher).
- `GET /api/audit-logs[/{id}]` chỉ dành cho ADMIN theo `AuditLogController`; SecurityConfig đã được khớp lại với contract này. Chưa kiểm thử runtime sau thay đổi.
- `GET /api/roles[/{id}]` chỉ dành cho ADMIN theo `RoleController` và matcher hiện tại; frontend hiện không gọi API này.
- `/api/inspections` và `/api/inspections/request/{requestId}` trả bản ghi theo ngựa; detail dùng `GET /api/inspections/{id}` và `PATCH /api/inspections/{id}/status`. Đây không phải checklist compliance tổng hợp hoặc review hồ sơ pháp lý.
- Transport request detail trả `TransportRequestResponse` trực tiếp. Status pending thực tế là `Dang tham dinh`; PATCH approve/reject là endpoint manager đã xác minh.
- Wizard khách hàng hiện gửi JSON đúng `TransportRequestCreateRequest` (điểm đi/đến, ngày đi/đến, horseIds, yêu cầu đặc biệt, currency). Hồ sơ ngựa có thể upload sau khi tạo yêu cầu qua `/api/horses/{horseId}/documents` với requestId; API không lưu deadline riêng, giải đấu, lựa chọn chuồng hoặc bộ tài liệu draft.
- `AssignmentService` hiện được expose qua `AssignmentController`: Fleet Coordinator có thể đọc lựa chọn, tạo và hủy assignment; GET danh sách giới hạn cho ADMIN/LOGISTICS_MANAGER/TRANSPORT_SPECIALIST/FLEET_COORDINATOR. Service kiểm tra vai trò nhân sự, phương tiện bảo trì và xung đột lịch. Endpoint có cập nhật assignment theo ID nhưng chưa có nút sửa trong UI. Không tự chuyển plan sang trạng thái sẵn sàng chỉ vì đã phân công; readiness vẫn cần điều kiện backend được xác nhận.
- SecurityConfig hiện chỉ cho Logistics Manager duyệt/từ chối request, Transport Specialist cập nhật inspections, Fleet Coordinator tạo/sửa plan, route stops và assets. GET plan/route/tracking/health/incident/delivery bị chặn với Driver/Escort cho tới khi backend lọc dữ liệu theo assignment.
- Invoice API chỉ trả tổng tiền, currency và trạng thái; backend chưa có dữ liệu nguồn để tách base price/additional fees. `GET /api/transport-requests/{requestId}/invoice` là nguồn tổng tiền cho màn chi tiết request. Logistics Manager xác nhận thanh toán ngoài hệ thống bằng `PUT /api/invoices/{id}/pay` với `{ "paymentMethod": "Chuyển khoản thủ công" | "Tiền mặt" }`; endpoint này chuyển trạng thái qua cùng service transition, không gọi payment gateway. `PATCH /api/invoices/{id}/payment-status` được giữ để tương thích. Tạo hóa đơn vẫn cần requestId và pdfUrl.

### B. Có dữ liệu gần nghĩa nhưng chưa đủ nghiệp vụ

- Transport plan hỗ trợ list/detail/create cơ bản và đọc stops, nhưng không có đầy đủ assignment/readiness của màn hình trip cũ. Không ánh xạ `/api/trips/**` sang `/api/transport-plans/**`.
- Inspection records không thay thế review tài liệu hoặc compliance summary.
- Invoice không có payment transaction history/gateway.
- Transport request có POST JSON, nhưng wizard cần draft/options/báo giá và request-document upload; các luồng đó không tương đương.

### C. Backend chưa cung cấp

- Chưa có `/api/dashboard` theo role, `/api/trips/**`, `/api/notifications`, `/api/search`, `/api/recovery-dashboard`.
- Chưa có request options/history/compliance summary/submit draft hoặc specialist review.
- Request wizard chỉ hỗ trợ các trường được API JSON lưu; không gửi FormData/payload thừa và không báo lưu các trường nghiệp vụ chưa có.
- Tìm kiếm dữ liệu từ command palette không gọi API thiếu; palette chỉ lọc lệnh/trang cục bộ và nêu rõ tìm kiếm dữ liệu chưa được hỗ trợ.

### Runtime và kiểm thử

- Trước migration, `POST /api/auth/login` trả HTTP 500 cho thông tin đúng, sai và tài khoản không tồn tại. Metadata SQL Server xác nhận thiếu hai cột được entity `User` ánh xạ, làm truy vấn tìm user lỗi trước khi chạy kiểm tra BCrypt.
- Sau migration, đăng nhập tài khoản demo qua API trả HTTP 200 với JWT, `tokenType=Bearer`, `expiresInMs` và user `ADMIN`; gọi `/api/auth/me` bằng token trả HTTP 200 với cùng user. Mật khẩu sai và email không tồn tại đều trả HTTP 401 với thông báo đăng nhập chung. GET `/` trả 401 do không phải endpoint login và cần xác thực.
- Đăng nhập qua frontend tại `http://localhost:3000` thành công và hiển thị thông báo chào mừng. Frontend gửi đúng method, URL, `Content-Type: application/json` và payload.
- Chạy frontend bằng `npm run dev` trong `frontend`; backend bằng `.\gradlew.bat bootRun` trong `backend` (Java 17+).
- `.\gradlew.bat build` thành công; không có test source nên Gradle báo `test NO-SOURCE`. `npm run build` và lint các file login/redirect thành công. Next.js bỏ qua kiểm tra TypeScript do `ignoreBuildErrors: true`.
- Kiểm tra runtime ngày 2026-10-21: gửi form đăng nhập thực tế tại `http://localhost:3000` trả HTTP 200; frontend lưu token và user role `ADMIN`, sau đó hiển thị Dashboard. CORS/browser-origin request dùng `JSON.stringify({email,password})`, `Content-Type: application/json`; `/api/auth/me` với Bearer token trả HTTP 200 và cùng role. Không in hoặc ghi token/mật khẩu.
- Mật khẩu sai và email không tồn tại đều trả HTTP 401 với cùng thông báo chung. Email sai định dạng hoặc thiếu mật khẩu trả HTTP 400 `Dữ liệu không hợp lệ` với tên trường validation; request JSON rỗng trả 400 validation.
- Lỗi 400 tổng quát ghi nhận ở lần probe trước được tái hiện khi PowerShell gửi JSON có dấu escape thừa (`{\"email\":...}`) nguyên văn; backend trả `Dữ liệu gửi lên không đúng định dạng`. Gửi cùng cấu trúc bằng serializer JSON trả đúng 401/200 tùy credential. Đây là lỗi định dạng ở lệnh probe, không phải payload frontend: `apiPost("/auth/login", { email, password })` stringify body, thêm `Content-Type: application/json` và ghép URL thành `/api/auth/login`.
- CORS preflight từ `http://localhost:3000` tới login trả HTTP 200 và cho phép POST với `content-type`. JWT không được in ra hoặc ghi log trong lần kiểm tra.
- `GET /api/transport-plans` không token trả HTTP 401. Backend hiện có sẵn trên cổng 8080; không khởi động/restart backend trong lần kiểm tra này.
- `npx tsc --noEmit` còn lỗi thiếu `socket.io` và `socket.io-client` tại `examples/websocket`; thư mục này nằm trong `tsconfig` nhưng không được import vào ứng dụng frontend chính, nên không thêm dependency cho ví dụ độc lập.
- Full `npm run lint` trước đó còn 7 lỗi `react-hooks/set-state-in-effect` ở carousel, hook responsive và màn hình trip/plan cũ; các file login/redirect đã lint thành công. Package không khai báo test script.

## Snapshot tích hợp cũ (không dùng làm hợp đồng hiện tại)

> **Lưu ý:** Toàn bộ nội dung từ tiêu đề này trở xuống là snapshot lịch sử của giai đoạn khảo sát/chuyển đổi trước khi backend Spring Boot hiện tại được triển khai. Các nhận định cũ như “chưa có backend Spring Boot”, SQLite/Prisma và kiến trúc đề xuất không mô tả workspace hiện tại; dùng các mục 1–3 ở trên làm nguồn sự thật hiện tại.

Phần khảo sát bên dưới là snapshot của trạng thái cũ, không phải hợp đồng hiện tại. Workspace hiện có Spring Boot tại `../../backend`; controller, DTO và service trong backend đó là nguồn xác minh API. Frontend vẫn giữ các Next.js Route Handler cũ, nhưng những màn hình dùng `src/lib/api-client.ts` đang gọi backend Spring Boot.

- Các controller Spring Boot hiện cung cấp `/api/auth/**`, `/api/roles/**`, `/api/users/**`, `/api/horses/**`, `/api/locations/**`, `/api/transport-requests/**`, `/api/transport-plans/**`, `/api/transport-assets/**`, `/api/invoices/**`, `/api/documents/**` cùng tracking, health logs, incidents, deliveries, audit logs, inspections, quarantine reservations và route stops.
- Các response danh sách/chi tiết thường là array/object trực tiếp, không có wrapper `{data: ...}`. Login trả `{accessToken, tokenType, expiresInMs, user}`; `/api/auth/me` trả `UserInfo` trực tiếp. JWT là stateless và backend không có logout endpoint, nên frontend đăng xuất bằng cách xóa token. Tạo transport request nhận JSON và trả DTO trực tiếp. Tải horse document dùng multipart với `file` và `documentType`.
- API client chuẩn hóa đường dẫn để dùng `/api` đúng một lần, gửi Bearer token và không tự đặt `Content-Type` cho FormData. Login lưu `accessToken`; customer dashboard, horse IDs, horse documents, invoice reads và thao tác approve/reject đã được điều chỉnh theo DTO/route đã xác minh.
- Các route được UI gọi nhưng chưa thấy controller tương ứng gồm `/api/dashboard`, `/api/trips/**`, `/api/assets`, `/api/staff`, `/api/notifications`, `/api/search`, `/api/recovery-dashboard`, cũng như transport-request `options`, `history`, `compliance`, `submit`, specialist `review`, và invoice `payments`. Backend có một số chức năng gần nghĩa dưới path/DTO khác, nhưng chưa đủ căn cứ để ánh xạ tự động.
- RequestCreateWizard hiện gửi FormData và phụ thuộc draft/options/upload tài liệu yêu cầu; controller Spring hiện chỉ nhận JSON tạo request, không có các endpoint draft/options hoặc upload tài liệu yêu cầu. Tạo hóa đơn từ UI cũng chưa gửi `pdfUrl` bắt buộc. Những luồng này cần endpoint/hợp đồng backend hoặc quyết định nghiệp vụ trước khi có thể đồng bộ an toàn.
- Chưa gửi đăng ký hợp lệ trên runtime vì thao tác sẽ ghi user vào SQL Server. Build không chứng minh đăng ký hoạt động thực tế; cần kiểm thử trên DB demo được phê duyệt.

## 1. Tóm tắt hiện trạng

### Kiến trúc và giao diện

- Dự án hiện là ứng dụng Next.js App Router, React và TypeScript. Các API được triển khai bằng Route Handler tại `src/app/api/**/route.ts`.
- Có một route trang Next.js (`src/app/page.tsx`). Các màn hình nghiệp vụ và trang công khai được điều hướng bên trong SPA bằng Zustand (`src/store/app-store.ts`, `src/components/views/view-router.tsx`), không phải mỗi màn hình là một URL Next.js riêng.
- Giao diện hiện có các trang công khai: trang chủ, dịch vụ, quy trình, đăng nhập, đăng ký, quên mật khẩu và đặt lại mật khẩu; cùng các màn hình cho dashboard, ngựa, yêu cầu, thẩm định/tuân thủ, phê duyệt, kế hoạch, đội xe, chuyến đi, nhân sự, hóa đơn, thông báo và hồi phục sau vận chuyển.
- Có 104 component TSX dưới `src/components` (26 component nghiệp vụ, 10 component public, 19 component app-shell, 48 component UI và 1 theme provider), ngoài trang và layout. Đây là mã cần được giữ nguyên về thiết kế/hành vi khi tách; không cần dựng lại giao diện.
- Các component nghiệp vụ gọi lớp dùng chung `src/lib/api-client.ts`. Hai chỗ gọi `fetch` trực tiếp còn được tìm thấy ở `src/components/views/customer/request-detail.tsx` và `src/components/views/shared/trip-detail.tsx`; khi tách cần chuyển chúng vào service chung.
- Next.js hiện cũng cung cấp layout/metadata, tải font Be Vietnam Pro qua `next/font/google`, build static assets và API. Không thấy Server Actions, Next Image hoặc một hệ thống route giao diện phức tạp. `src/components/views/customer/request-create.tsx` còn import `next/navigation`; hiện `view-router.tsx` dùng `RequestCreateWizard`, không import component này, nhưng cần xác nhận tình trạng sử dụng trước khi bỏ hoặc chuyển.
- `next.config.ts` đặt `output: "standalone"` và `typescript.ignoreBuildErrors: true`. Khi chuyển khỏi Next.js, cần thay các chức năng layout/font/metadata/build và bỏ qua lỗi TypeScript bằng các cấu hình tương đương; không thay đổi token CSS, màu, bố cục hoặc nội dung.

### Công nghệ, dependency và lệnh

- `package.json` khai báo Next.js `^16.1.1`, React/React DOM `^19.0.0`, TypeScript `^5`, Prisma/Prisma Client `^6.11.1`, `bcryptjs` `^3.0.3`, `next-auth` `^4.24.11`, Zod `^4.0.2`, Tailwind CSS `^4`.
- Hai lockfile không đồng nhất: `package-lock.json` đang khóa Next `16.4.2`, Prisma `6.19.3`, NextAuth `4.24.15`, Zod `4.6.7`; `bun.lock` khóa lần lượt `16.1.3`, `6.19.2`, `4.24.13`, `4.3.5`. Cần chọn một package manager/lockfile chuẩn trước khi tách để build tái lập được.
- Next.js, TypeScript, React, Prisma và `bcryptjs` có bằng chứng sử dụng trong mã. Không tìm thấy import/cấu hình dùng NextAuth hoặc Zod. `next-auth` và Zod hiện chỉ có trong khai báo/lockfile.
- Các script hiện có: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `db:push`, `db:migrate`, `db:reset`, `db:seed`. Không chạy lệnh database nào trong khảo sát. Đặc biệt, `db:push` có `--accept-data-loss` và `db:reset` có thể phá hủy dữ liệu; không sử dụng trong kế hoạch tách.
- `.env` có `DATABASE_URL`; mã dùng `NODE_ENV`. Tên biến SMTP chỉ xuất hiện trong chú thích, chưa có cấu hình gửi email thực tế. Chưa có biến địa chỉ backend cho frontend; `src/lib/api-client.ts` đang hard-code prefix `/api`.
- Node `v24.19.0` và npm `11.17.0` hiện có. Java cài đặt là Java `8`; không tìm thấy Maven. Spring Boot 3 cần Java 17 trở lên, do đó môi trường hiện tại chưa sẵn sàng để tạo/chạy backend Spring Boot. Không cài đặt hoặc nâng cấp công cụ trong giai đoạn khảo sát.
- Không thấy mã Java/Spring Boot, project Maven, mã C#/ASP.NET Core hoặc dependency Express.js trong dự án. API hiện tại là Next.js Route Handlers, không phải Express.

### Database và mô hình dữ liệu

- `prisma/schema.prisma` khai báo SQLite qua `DATABASE_URL`, Prisma Client `prisma-client-js`, 29 model. Schema bao quát vai trò/người dùng, đối tác/địa điểm, ngựa/tài liệu, yêu cầu/kiểm dịch/thẩm định, phương án/báo giá, kế hoạch/chặng/phân công, theo dõi/sức khỏe/sự cố/bàn giao/hồi phục, hóa đơn/thanh toán, thông báo/nhật ký và mã đặt lại mật khẩu.
- `DATABASE_URL` hiện trỏ tới file `db/custom.db` trong dự án. Đã mở file ở chế độ SQLite chỉ đọc, không đọc giá trị cá nhân, không ghi file.
- Database có 30 bảng vật lý: 29 bảng tương ứng model và bảng nối tự sinh `_CustomsRegulationToTransportRequest`. Một số số lượng bản ghi hiện tại: 6 user thuộc 5 role ID, 4 ngựa, 5 yêu cầu, 2 kế hoạch và 2 hóa đơn.
- Đối chiếu tên cột scalar của 29 model với SQLite: không có cột thiếu/thừa. `PRAGMA integrity_check` trả `ok`; `foreign_key_check` không có vi phạm. Đây là baseline cần lưu lại để so sánh sau chuyển đổi; không đồng nghĩa với việc đã kiểm thử mọi quy tắc nghiệp vụ của JPA.
- Prisma `String` ID dùng `cuid()` ở nhiều model, trong khi SQLite lưu ID dạng chuỗi. Entity Java phải đọc nguyên ID hiện tại và chọn cách sinh ID mới tương thích trước khi ghi dữ liệu.
- Quan hệ nối `CustomsRegulation`–`TransportRequest` dùng bảng nối do Prisma tự sinh; các quan hệ, cascade và unique/composite key cần được ánh xạ tường minh bằng JPA, không để Hibernate tự tạo schema.

### Đăng nhập, phân quyền và nghiệp vụ

- Năm vai trò được seed trong `prisma/seed.ts` và hiện có trong dữ liệu: `CUSTOMER`, `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`, `FLEET_COORDINATOR`, `DRIVER_ESCORT`. Giao diện gọi vai trò thứ tư là Coordinator. Không có vai trò Administrator trong danh sách seed hoặc dữ liệu hiện tại; một số route cũ có nhánh loại trừ `ADMIN`, nhưng không được chuyển nhánh đó thành role mới.
- Mật khẩu được hash bằng `bcryptjs` cost 10; đăng ký công khai luôn cấp `CUSTOMER`. Tài khoản nội bộ được tạo bởi Logistics Manager với bốn role nhân viên hợp lệ.
- Session cũ là cookie `equideli_session` chứa JSON Base64 không ký, có `HttpOnly`, `SameSite=Lax`, thời hạn 7 ngày, nhưng không đặt `Secure`. Không sao chép cơ chế này. Khi chuyển đổi nên yêu cầu đăng nhập lại và dùng session do Spring Security quản lý, cookie an toàn, CSRF phù hợp với cookie auth và kiểm tra quyền tại backend.
- Quên mật khẩu hiện tạo mã 6 chữ số, lưu mã trong DB, chặn gửi lại trong 60 giây, thời hạn 15 phút và giới hạn 5 lần nhập sai. Chế độ development trả `demoCode`; production hiện chưa gửi email dù có chú thích SMTP. Reset token đang dựa trên ID bản ghi mã. Cần thay thiết kế xác thực/reset trong backend mới thay vì bê nguyên session/token reset cũ.
- Backend mới cần trả DTO an toàn. Một số API cũ trả nguyên object Prisma `User` (bao gồm khả năng có `passwordHash`), vì vậy không dùng nguyên response đó làm DTO Spring. Các lỗi hiện thường có dạng `{ "error": "..." }`, nhưng chưa thống nhất toàn cục; cần giữ tương thích giao diện hoặc có adapter trong lớp gọi API.
- Quy tắc nghiệp vụ hiện diện trong route/API và `src/lib/stall-business-rules.ts`: tạo yêu cầu gắn ngựa thuộc khách hàng, phương án/bố trí chuồng được kiểm tra khả thi phía server, thẩm định chuyên viên, phê duyệt quản lý, kiểm dịch/tài liệu, lập kế hoạch/phân công, readiness, tracking, health/incidents, bàn giao/hồi phục, thanh toán và thông báo. Không tự thay đổi nghiệp vụ hoặc giá trong quá trình port.

## 2. Đề xuất kiến trúc đích (chưa triển khai)

### Frontend

- Dùng React + TypeScript với Vite trong thư mục frontend riêng. Chuyển/giữ nguyên các component TSX, Zustand store, Tailwind/theme tokens và biểu mẫu hiện có; giữ nguyên điều hướng nội bộ và hiển thị trước khi thay đổi URL hoặc UX.
- Thay `next/font/google`, metadata/layout và build Next bằng cấu hình React tương đương, bảo toàn font, `<html lang="vi">`, theme hydration và metadata. Xử lý có chủ đích import `next/navigation` còn sót trước khi xóa Next.js.
- Dùng `VITE_API_BASE_URL` trong một API service duy nhất. Bật `credentials: "include"` khi dùng cookie session, xử lý response/error nhất quán và chuyển hai lệnh `fetch` trực tiếp sang service. Không đưa Prisma, schema hoặc logic nghiệp vụ vào frontend.
- Giữ cùng đường dẫn REST `/api/...` ở giai đoạn đầu để hạn chế thay đổi giao diện; chỉ đổi host bằng cấu hình môi trường.

### Backend

- Dùng Java 17+ (khuyến nghị Java 21 LTS) và Maven; Spring Boot 3 với Spring Web, Spring Security, Spring Data JPA, Jakarta Validation. Tổ chức `controller`, `service`, `repository`, `entity`, `dto`, `security`, `config`, `exception`.
- Giữ endpoint tương đương danh sách dưới đây. Controller chỉ nhận/trả DTO; service thực hiện quy tắc nghiệp vụ và kiểm tra chủ sở hữu/tài nguyên; repository truy vấn. Phân quyền phải kiểm tra phía backend bằng đúng năm role hiện hữu, không dựa vào ẩn nút/trang.
- Cấu hình CORS chỉ cho origin frontend đã định, cho phép credentials khi dùng cookie; dùng CSRF protection cho session-cookie và chuẩn hóa response lỗi nhưng không làm mất thông báo/lỗi mà giao diện đang hiển thị.
- Dùng DTO đặc thù thay cho entity serialization, đặc biệt với user/password hash, audit log, quan hệ lồng nhau và dữ liệu hồ sơ.

### Database và chuyển đổi an toàn

- Đề xuất giữ nguyên SQLite/file và dữ liệu hiện có ở giai đoạn đầu thay vì chuyển đồng thời sang database khác. Spring Boot có thể dùng SQLite qua SQLite JDBC và dialect phù hợp (ví dụ Hibernate community dialect), nhưng cần thử nghiệm thực tế với phiên bản Spring Boot/Hibernate được chọn.
- Tắt tự tạo/cập nhật schema (`ddl-auto` không được là `create`, `create-drop` hoặc `update`). Ánh xạ chính xác tên bảng/cột/khóa/quan hệ; kiểm thử trên bản sao database và xác minh số lượng bản ghi, FK, unique keys, ngày giờ, boolean, ID và join table trước khi cutover.
- Tạo backup có kiểm chứng và kế hoạch khôi phục trước bất kỳ thao tác ghi/migration nào. Migration chỉ được đề xuất sau khi có phân tích từng thay đổi, được duyệt, có kiểm thử dữ liệu và không dùng `db:push --accept-data-loss`/reset.
- Mật khẩu bcrypt hiện có có thể có khả năng xác minh bằng BCrypt của Spring, nhưng phải kiểm thử tương thích trên fixture an toàn trước khi giữ nguyên hash. Không log password/hash/token. Session cũ không được tái sử dụng.
- Để không tự ý thêm role: ánh xạ các role ID hiện có thành Spring authorities; kiểm thử tất cả năm vai trò theo ma trận quyền. Xử lý riêng các API cũ chỉ kiểm tra đăng nhập hoặc thiếu kiểm tra quyền/tài nguyên; không mặc định tái tạo các lỗ hổng quyền đó.

## 3. Bản đồ API hiện tại → Spring Boot

Các endpoint Spring đề xuất bên dưới giữ nguyên path và method cũ để frontend có thể chuyển base URL sau. `Auth` nghĩa là cần session đăng nhập; khi endpoint không có kiểm tra role/ownership trong code cũ, điều đó được ghi rõ thay vì giả định quyền chặt hơn.

### Tích hợp Driver/Escort hiện tại (2026-10-25)

Trong workspace hiện tại không còn `frontend/src/app/api/**`, Prisma schema hay SQLite Route Handler runtime; do đó không có 46 handler nào còn để port/xóa. Bảng ở phần “Snapshot lịch sử” dưới đây là tài liệu cũ, không phải API đang chạy. `TripList`/dashboard cũ từng gọi `/api/trips` và `/api/dashboard`, còn trang chi tiết gọi `/api/trips/{id}/...`; chúng không phải Spring endpoint và đã được thay ở các view Driver đang hoạt động.

| Luồng legacy Driver/Escort | API Spring đang dùng hoặc trạng thái |
|---|---|
| `GET /api/dashboard` | Không có endpoint tương đương. Dashboard frontend tổng hợp số liệu từ danh sách `GET /api/transport-plans`; backend lọc danh sách theo assignment của người dùng. Không còn hiển thị notifications/recent activity giả. |
| `GET /api/trips` | Dùng `GET /api/transport-plans`; tương đương một phần: trả `TransportPlanDto.Response[]` (không phải `{trips}` và không bao gồm request/horses/assignments). Driver chỉ nhận plan được giao. |
| `GET /api/trips/{id}` | Thay bằng `GET /api/transport-plans/{id}` và các GET riêng cho stops, health logs, incidents. Response không phải aggregate `trip`; từng request được backend kiểm tra assignment. |
| `GET /api/trips/{id}/stops`, `GET /api/trips/{id}/health`, `GET /api/trips/{id}/incidents` | Tương ứng lần lượt với `GET /api/transport-plans/{id}/stops`, `/health-logs`, `/incidents`. Response Spring là mảng DTO trực tiếp, không bọc `{stops/logs/incidents}`. |
| `GET /api/trips/{id}/timeline`, `GET /api/trips/{id}/events` | Không có aggregate timeline/event API tương đương. Tracking có API riêng: `GET /api/transport-plans/{id}/tracking` và `/tracking/latest`, scoped theo assignment. |
| `POST /api/trips/{id}/health` | Frontend dùng `POST /api/health-logs`; payload yêu cầu `planId` và `horseId` cùng các chỉ số tùy chọn. Plan response hiện có `horseIds`; service xác nhận assignment và horse thuộc plan. |
| `POST /api/trips/{id}/incidents` | Frontend dùng `POST /api/incidents`, yêu cầu `planId`, `category`, `description`; trường tương đương cũ `isSos` có tên `sos`, còn `locationName` không có trong DTO. Backend kiểm tra assignment. |
| `POST /api/trips/{id}/events`, `POST /api/trips/{id}/handover`, recovery/readiness, stop mutations | Không ánh xạ tự động vì hợp đồng/trạng thái nghiệp vụ không tương đương. Tracking ghi dùng `POST /api/tracking`; bàn giao dùng `POST /api/deliveries` sau upload chữ ký/POD. Recovery/readiness API không có. |

Dashboard và danh sách Driver là luồng đọc; trang chi tiết có form ghi health log, incident, tracking và delivery qua hợp đồng Spring hiện có. Component chi tiết legacy không còn consumer đã được gỡ sau khi xác nhận `ViewRouter` không import nó. Không thay `/api/trips/**` bằng plans cho các thao tác chỉ có tên gần giống. Các form đã được xác minh tĩnh, chưa chạy E2E runtime với tài khoản/DB thử nghiệm.

### Snapshot lịch sử: API Next.js/Prisma cũ (không phải hợp đồng Spring hiện tại)

Phần dưới đây mô tả mã Next.js/Prisma cũ tại `src/app/api/**`; các shape và quyền ở đó không được dùng để suy ra hợp đồng hoặc quyền của Spring Boot hiện tại. Các luồng frontend nghiệp vụ đang dùng `src/lib/api-client.ts` gọi Spring trực tiếp.

Role viết tắt: `C` Customer; `LM` Logistics Manager; `TS` Transport Specialist; `FC` Fleet Coordinator; `DE` Driver/Escort. `Public` không cần đăng nhập. Các output là shape thành công chính; lỗi hiện thường trả `{error}` với HTTP 4xx/5xx.

Tài liệu đính kèm khi tạo yêu cầu chấp nhận PDF, DOC, DOCX, JPG và PNG, tối đa 10MB mỗi file (tối đa 10 file/lần). File được lưu local ngoài thư mục public tại `storage/uploads/request-documents` theo mặc định; có thể cấu hình đường dẫn bền vững bằng `EQUIDELI_UPLOAD_DIR`. Khi triển khai production cần gắn persistent volume hoặc chuyển sang object storage.

| API cũ | Method | Quyền hiện tại trong mã | Input chính | Output thành công | Spring Boot tương ứng |
|---|---|---|---|---|---|
| `/api` | GET | Public | Không có | `{message}` | `GET /api` |
| `/api/auth/login` | POST | Public | `{email, password}` | Thông tin user (không gồm hash); đặt cookie session | `POST /api/auth/login` |
| `/api/auth/register` | POST | Public; backend cấp role `C` | `{name, email, phoneNumber?, organizationName?, password, confirmPassword}` | `201 {success, message}` | `POST /api/auth/register` |
| `/api/auth/logout` | POST | Không bắt buộc session | Không có | `{ok}`; xóa cookie | `POST /api/auth/logout` |
| `/api/auth/me` | GET | Public; trả `user:null` nếu chưa đăng nhập | Cookie session hiện tại | `{user}` hoặc `{user:null}` | `GET /api/auth/me` |
| `/api/auth/forgot-password` | POST | Public | `{email}` | `{message}`; development có thể thêm `demoCode`; lỗi rate limit `429` | `POST /api/auth/forgot-password` |
| `/api/auth/verify-code` | POST | Public | `{email, code}` | `{verified, resetToken, message}` | `POST /api/auth/verify-code` |
| `/api/auth/reset-password` | POST | Public, xác thực bằng reset token cũ | `{resetToken, newPassword, confirmPassword}` | `{success, message}` | `POST /api/auth/reset-password` |
| `/api/assets` | GET | Auth; không giới hạn role | Không có | `{assets}` kèm owner partner | `GET /api/assets` |
| `/api/dashboard` | GET | Auth; nội dung thay đổi theo role | Không có | `{role, stats, recent, notifications}` | `GET /api/dashboard` |
| `/api/horses` | GET | Auth; C chỉ thấy ngựa của mình, role khác thấy toàn bộ | Không có | `{horses}` | `GET /api/horses` |
| `/api/horses/:id` | GET | Auth; C bị giới hạn owner, role khác không có owner filter | Path `id` | `{horse}` kèm documents/request links | `GET /api/horses/{id}` |
| `/api/invoices` | GET | Auth; C chỉ thấy hóa đơn của mình, role khác thấy toàn bộ | Không có | `{invoices}` kèm request/payments | `GET /api/invoices` |
| `/api/invoices` | POST | `LM` | `{requestId, amount, currency?, dueDate?, notes?}` | `201 {invoice}`; tạo notification cho khách | `POST /api/invoices` |
| `/api/invoices/:id` | GET | Auth; C chỉ được xem hóa đơn của mình, role khác không có owner filter | Path `id` | `{invoice}` kèm request/horses/payments | `GET /api/invoices/{id}` |
| `/api/invoices/:id/payments` | POST | Auth; C bị kiểm tra owner; code không giới hạn role khác dù comment nói manager/customer | `{amount, method, reference?, notes?}` | `201 {payment, newStatus}` | `POST /api/invoices/{id}/payments` |
| `/api/locations` | GET | Auth; không giới hạn role | Không có | `{locations}` | `GET /api/locations` |
| `/api/notifications` | GET | Auth; recipient luôn là user hiện tại | Không có | `{notifications}` (tối đa 50) | `GET /api/notifications` |
| `/api/notifications` | PATCH | Auth; cập nhật theo `notificationId`, không kiểm tra recipient trong route | `{notificationId}` | `{notification}` | `PATCH /api/notifications` |
| `/api/recent-activity` | GET | Auth; lọc log khác nhau theo role | Không có | `{activities}` (tối đa 8) | `GET /api/recent-activity` |
| `/api/recovery-dashboard` | GET | Auth; C chỉ thấy ngựa của mình, role khác không có bộ lọc | Không có | `{recoveries, summary, stats}` | `GET /api/recovery-dashboard` |
| `/api/search` | GET | Auth; C được lọc owner/customer, DE không nhận kết quả chuyến | Query `q` (tối thiểu 2 ký tự) | `{results:{requests,horses,trips,invoices}}`, tối đa 5 mỗi nhóm | `GET /api/search` |
| `/api/staff` | POST | `LM` | `{name, email, phoneNumber?, roleId, tempPassword}`; role chỉ `LM`, `TS`, `FC`, `DE` | `201 {user, message}`; response user hiện trả nguyên Prisma object | `POST /api/staff` |
| `/api/transport-requests` | GET | Auth; C lọc theo mình; TS/LM lọc trạng thái; FC/DE không có lọc role trong route | Query `status?` | `{requests}` kèm customer/origin/destination/horses/approver | `GET /api/transport-requests` |
| `/api/transport-requests` | POST | `C` | JSON `{horseIds, originLocationId, destinationLocationId, competitionName?, scheduledDepartureDate, scheduledArrivalDate, deadlineDateTime, deadlineTimezone?, specialRequirements?}`; tạo yêu cầu có thể gửi multipart với các field trên và nhiều field `documents` | `201 {request}`; tài liệu được kiểm tra định dạng/dung lượng và liên kết với request | `POST /api/transport-requests` |
| `/api/transport-requests/:id` | GET | Auth; C chỉ xem request của mình, role khác không có owner filter | Path `id` | `{request}` cùng hồ sơ, kiểm dịch, phương án, kế hoạch, hóa đơn và audit | `GET /api/transport-requests/{id}` |
| `/api/transport-requests/:id` | PUT | Auth; owner chỉ được kiểm tra nếu role là C; chỉ trạng thái Nháp/Trả lại bổ sung | `{horseIds?, originLocationId?, destinationLocationId?, competitionName?, scheduledDepartureDate?, scheduledArrivalDate?, specialRequirements?}` | `{request}` | `PUT /api/transport-requests/{id}` |
| `/api/transport-requests/:id/approval` | POST | `LM`; request phải Đang thẩm định/Đã gửi | `{decision, note?}`; decision `approve` hoặc nhánh còn lại là reject | `{request}`; approve còn tạo invoice/notifications | `POST /api/transport-requests/{id}/approval` |
| `/api/transport-requests/bulk-approval` | POST | `LM` | `{requestIds[], decision, note?}`; decision `approve`/`reject` | `{results:{approved,rejected,skipped}, total}` | `POST /api/transport-requests/bulk-approval` |
| `/api/transport-requests/:id/compliance` | GET | Auth; không có role/owner check | Path `id` | `{checks, allPassed, ready}` | `GET /api/transport-requests/{id}/compliance` |
| `/api/transport-requests/:id/documents` | GET | Auth; không có role/owner check | Path `id` | `{requiredDocs, documents, expiredCount, expiringSoonCount, regulations, requestStatus}` | `GET /api/transport-requests/{id}/documents` |
| `/api/transport-requests/:id/documents` | POST | `C` hoặc `TS`; C phải là owner | `{horseId, documentType, fileName, fileUrl, expiryDate?}` | `201 {document}` | `POST /api/transport-requests/{id}/documents` |
| `/api/transport-requests/:id/documents/:docId/file` | GET | Auth; C phải là owner | Path `id`, `docId` | File tải/xem qua API, không public URL | `GET /api/transport-requests/{id}/documents/{docId}/file` |
| `/api/transport-requests/:id/documents/:docId` | PATCH | `TS` | `{reviewStatus, reviewNote?}`; path `id`, `docId` | `{document}`; có thể thông báo customer | `PATCH /api/transport-requests/{id}/documents/{docId}` |
| `/api/transport-requests/:id/history` | GET | Auth; không có role/owner check | Path `id` | `{history}` audit log mới nhất trước | `GET /api/transport-requests/{id}/history` |
| `/api/transport-requests/:id/options` | GET | Auth; không có owner check | Path `id` | `{options, lockedOptions, request}`; phương án có quote, chuồng và ride-share | `GET /api/transport-requests/{id}/options` |
| `/api/transport-requests/:id/options` | POST | Auth; owner chỉ được kiểm tra nếu role là C; request phải Nháp/Trả lại bổ sung | `{optionId, stallConfigId, rideShareEnabled?, addOns?, escortCount?}` | `{selection, total, feasibilityStatus, feasibilityReasons}` | `POST /api/transport-requests/{id}/options` |
| `/api/transport-requests/:id/quarantine` | GET | Auth; không có owner check | Path `id` | `{reservations, facilities}` | `GET /api/transport-requests/{id}/quarantine` |
| `/api/transport-requests/:id/quarantine` | POST | `TS` hoặc `LM` | `{facilityLocationId, startDate, endDate, notes?}` | `201 {reservation}` | `POST /api/transport-requests/{id}/quarantine` |
| `/api/transport-requests/:id/review` | POST | `TS`; request phải Đã gửi/Đang thẩm định | `{decision, note?}`; decision `approve`, `return`, `reject_suggest` | `{request}`; có thể tạo notification | `POST /api/transport-requests/{id}/review` |
| `/api/transport-requests/:id/submit` | POST | Auth; owner chỉ được kiểm tra nếu role là C; trạng thái Nháp/Trả lại bổ sung và phải có ngựa | Path `id` | `{request}`; thông báo TS | `POST /api/transport-requests/{id}/submit` |
| `/api/trips` | GET | Auth; DE chỉ nhận chuyến được phân công; role khác nhận danh sách chung | Query `status?` | `{trips}` kèm request/stops/assignments | `GET /api/trips` |
| `/api/trips` | POST | `FC`; request phải được phê duyệt | `{requestId, departureTime, arrivalTime, routeDetails?}` | `201 {trip}` | `POST /api/trips` |
| `/api/trips/:id` | GET | Auth; DE phải có assignment, role khác không có role-specific filter | Path `id` | `{trip}` kèm hồ sơ/chặng/phân công/tracking/health/incidents/delivery | `GET /api/trips/{id}` |
| `/api/trips/:id/assignments` | PUT | `FC` | `{assignments:[{assetId?, driverUserId?, attendantUserId?, role?}]}` | `{assignments}`; tạo notification cho nhân sự được gán | `PUT /api/trips/{id}/assignments` |
| `/api/trips/:id/events` | GET | Auth; không kiểm tra assignment | Path `id` | `{events}` tracking logs | `GET /api/trips/{id}/events` |
| `/api/trips/:id/events` | POST | `DE` hoặc `FC`; không kiểm tra assignment | `{milestone, locationName?, notes?}` | `201 {event}` | `POST /api/trips/{id}/events` |
| `/api/trips/:id/handover` | POST | `DE` hoặc `FC`; không kiểm tra assignment | `{recipientName, recipientRole?, conditionNote?, signatureImage?, podDocumentUrl?}` | `201 {delivery}`; chuyển plan sang Hoàn thành | `POST /api/trips/{id}/handover` |
| `/api/trips/:id/health` | GET | Auth; không kiểm tra assignment | Path `id` | `{logs}` sức khỏe | `GET /api/trips/{id}/health` |
| `/api/trips/:id/health` | POST | `DE`; không kiểm tra assignment | `{horseId, stressLevel?, heartRate?, temperature?, appetiteStatus?, notes?}` | `201 {log}`; có thể cảnh báo manager | `POST /api/trips/{id}/health` |
| `/api/trips/:id/incidents` | GET | Auth; không kiểm tra assignment | Path `id` | `{incidents}` | `GET /api/trips/{id}/incidents` |
| `/api/trips/:id/incidents` | POST | `DE` hoặc `FC`; không kiểm tra assignment | `{category, description, isSos?, locationName?, additionalCost?}` | `201 {incident}`; SOS/chi phí tạo cảnh báo | `POST /api/trips/{id}/incidents` |
| `/api/trips/:id/incidents` | PATCH | Auth; chỉ `costApproved` được kiểm tra là `LM`, trường status không có giới hạn role riêng | `{incidentId, status?, costApproved?}` | `{incident}` | `PATCH /api/trips/{id}/incidents` |
| `/api/trips/:id/readiness` | GET | Auth; không kiểm tra assignment | Path `id` | `{checks, ready}` | `GET /api/trips/{id}/readiness` |
| `/api/trips/:id/readiness` | POST | `FC` | Path `id` | `{trip}`; chuyển status sang Sẵn sàng | `POST /api/trips/{id}/readiness` |
| `/api/trips/:id/recoveries` | GET | Auth; không kiểm tra assignment | Path `id` | `{recoveries, deliveries, horses}` | `GET /api/trips/{id}/recoveries` |
| `/api/trips/:id/recoveries` | POST | `DE`, `LM` hoặc `TS`; không kiểm tra assignment | `{horseId, deliveryId?, stressLevel?, heartRate?, temperature?, appetiteStatus?, recoveryStage?, vetNotes?, readyToRace?, nextCheckDate?}` | `201 {recovery}`; có thể thông báo customer | `POST /api/trips/{id}/recoveries` |
| `/api/trips/:id/stops` | POST | `FC` | `{sequenceNo, locationId?, stopName, stopType, plannedArrivalTime?, plannedDepartureTime?, notes?}` | `201 {stop}` | `POST /api/trips/{id}/stops` |
| `/api/trips/:id/stops` | PATCH | Auth; không kiểm tra role hoặc assignment | `{stopId, actualArrivalTime?, actualDepartureTime?, status?, notes?}` | `{stop}`; có thể thêm tracking log | `PATCH /api/trips/{id}/stops` |
| `/api/trips/:id/timeline` | GET | Auth; không kiểm tra assignment | Path `id` | `{timeline, stops}` theo thời gian | `GET /api/trips/{id}/timeline` |
| `/api/users` | GET | `LM` hoặc `FC` | Không có | `{users}`; hiện trả user object nguyên trạng cùng role | `GET /api/users` |

### Ghi chú về quyền khi port

Bảng trên mô tả đúng các guard nhìn thấy ở phiên bản hiện tại, không phải đề xuất cấp quyền mới. Một số route chỉ yêu cầu đăng nhập, một số chỉ kiểm tra owner khi role là Customer, và vài thao tác thay đổi chặng/sự cố không giới hạn đầy đủ role. Khi triển khai Spring, cần đặc tả ma trận quyền được nghiệp vụ duyệt và kiểm thử cả quyền truy cập bản ghi theo từng role; không sao chép thiếu sót kiểm soát quyền chỉ để đạt tương đồng hình thức.

## 4. Trình tự đề xuất sau khi duyệt

1. Chốt baseline hiện tại, framework/version, ma trận quyền và phương án SQLite; chuẩn bị JDK 17+/21 và Maven.
2. Tạo backend Spring Boot rỗng, cấu hình chỉ đọc schema khi khởi động và smoke-test trên bản sao SQLite.
3. Kiểm thử BCrypt/session/security trước; không chuyển cookie session cũ.
4. Chuyển từng nhóm endpoint theo bảng và thêm test request/response, lỗi, quyền, owner scope và bất biến dữ liệu.
5. Chuyển frontend API service sang cấu hình base URL; so sánh hành vi UI theo từng vai trò.
6. Chạy kiểm thử tích hợp trên bản sao DB, đối chiếu row counts/FK/unique và luồng nghiệp vụ; chỉ cutover có backup/rollback đã diễn tập.
7. Chỉ gỡ Next API/Prisma và dependency liên quan khi API thay thế, frontend và quy trình khôi phục đã được xác nhận.

**Giai đoạn A — khảo sát hiện trạng:** Đã đối chiếu lại worktree hiện tại. Có 60 API handler và 60 dòng mapping; 29 model Prisma có bộ cột scalar khớp với bảng SQLite, ngoài ra có bảng nối `_CustomsRegulationToTransportRequest`. Backend Spring hiện có duy nhất `GET /api/health`; chưa có entity, repository, service nghiệp vụ hay cơ chế đăng nhập Spring.

**Giai đoạn B — cấu hình database fail-closed:**

- File được duyệt là `C:\Users\asus\OneDrive\Máy tính\SWP391\Prototype\db\custom.db`. `DatabaseLocationGuard` chỉ chấp nhận đúng URI tuyệt đối do `Path.toUri()` tạo ra với `?mode=rw`; không có URL tương đối dự phòng.
- Đặt `EQUIDELI_DB_URL` trong cùng terminal trước khi chạy backend:

  ```powershell
  $env:EQUIDELI_DB_URL = 'jdbc:sqlite:file:///C:/Users/asus/OneDrive/M%C3%A1y%20t%C3%ADnh/SWP391/Prototype/db/custom.db?mode=rw'
  ```

- Guard kiểm tra biến môi trường và file trước khi Spring khởi động, sau đó so sánh lại `spring.datasource.url` hiệu lực trước khi tạo bean datasource. Thiếu biến, URL sai/ghi đè hoặc file không tồn tại đều làm ứng dụng dừng với lỗi rõ ràng. Nếu chuyển workspace sang đường dẫn khác, phải cập nhật đường dẫn được duyệt trong `DatabaseLocationGuard` và kiểm thử lại.
- `spring.jpa.hibernate.ddl-auto=none` và `spring.sql.init.mode=never` vẫn được giữ nguyên. `mode=rw` không tạo file thiếu nhưng **không** làm database chỉ-đọc; không dùng nó thay cho kiểm soát schema hay quyền ghi của nghiệp vụ.
- Đã dùng SQLite JDBC 3.50.3.0 kiểm tra URI có dấu tiếng Việt/khoảng trắng và `mode=rw` trên database tạm riêng; URL thành công với file đã có và từ chối file chưa tồn tại mà không tạo file. Unit logic của startup guard cũng được biên dịch/chạy độc lập bằng JDK 8 trên file tạm, bao gồm trường hợp thiếu biến, URL không được duyệt, datasource bị ghi đè và file thiếu. Không khởi động Spring Boot hoặc mở kết nối tới database chính trong bước cấu hình này; việc kiểm kê schema ở giai đoạn A dùng kết nối SQLite chỉ-đọc.

**Giới hạn kiểm thử và bước tiếp theo:** Máy hiện có Java 8, không có Maven trên PATH và không có Maven Wrapper; dự án yêu cầu Java 21. Vì vậy chưa thể chạy `mvn test` hoặc xác nhận compile toàn bộ ứng dụng sau khi thêm initializer Spring. Báo cáo Surefire cũ trong `backend/target` có thời điểm trước các thay đổi hiện tại và không được xem là kết quả kiểm thử mới. Chưa sửa `.env`, `pom.xml`, frontend, Next.js API routes hoặc database. Sau khi cung cấp JDK 21 và Maven, chạy kiểm thử/build backend trước; chỉ sau đó tiến hành mapping JPA trên bản sao riêng của database.
