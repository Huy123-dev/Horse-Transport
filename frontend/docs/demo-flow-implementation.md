# Equideli — triển khai trang chi tiết và luồng demo

Ngày rà soát: 2026-10-21

### Timeline hành trình và dashboard Logistics Manager (2026-10-25)

- Backend thêm `GET /api/transport-plans/{id}/timeline`, hợp nhất tracking, health log và incident, sắp xếp `timestamp` giảm dần. Endpoint chỉ cho CUSTOMER/LOGISTICS_MANAGER; với Customer, quyền sở hữu request được xác minh bởi từng service đọc hiện có.
- Backend thêm `GET /api/dashboard/stats`, giới hạn LOGISTICS_MANAGER; trả tổng yêu cầu, kế hoạch `IN_PROGRESS`, kế hoạch `COMPLETED` và doanh thu hóa đơn PAID phân nhóm theo đơn vị tiền. Không có quy đổi ngoại tệ.
- Frontend `JourneyTimeline` được gắn vào plan detail cho Customer và Logistics Manager; dashboard Logistics Manager gọi stats endpoint và hiển thị bốn chỉ số.
- `npm run typecheck`, `npm run lint`, `npm run build` và `backend\\gradlew.bat test` thành công. Chưa gọi API runtime; cần khởi động backend với database an toàn để thử UI/API thực tế.

### Cập nhật loại bỏ ADMIN và chuyển quyền

- `SecurityConfig` đã bỏ ADMIN khỏi các role matcher và chuyển các quyền có ADMIN sang LOGISTICS_MANAGER. Users, roles và audit logs chỉ cho Logistics Manager; user service vẫn chỉ quản lý nhân sự nội bộ.
- Frontend đã bỏ ADMIN khỏi constants, dashboard role union, router, plan-detail authorization và horse-list authorization; dashboard Logistics Manager có shortcut tới quản lý nhân sự.
- Script T-SQL [remove_admin_role.sql](../../backend/database/maintenance/remove_admin_role.sql) chưa được chạy. Script demote user ADMIN, chuyển ownership của horse/request và notifications đến `logistics.manager@example.com`, giữ audit rows nhưng bỏ actor FK, và rollback nếu còn FK references khác (ví dụ actor/assignment fields). Customer ownership của requests sẽ trở thành ownership của tài khoản Logistics Manager; DBA cần review/backup trước khi chạy.
- Backend cần restart và người dùng cần đăng nhập lại để nhận JWT với role mới. Chưa có kiểm thử runtime hay database mutation.

### Cập nhật Driver read/write integration

- Transport plan response bổ sung `horseIds`, đọc từ quan hệ hiện có của transport request. Không có thay đổi database/schema.
- Trang chi tiết Driver hiển thị lịch sử tracking và delivery, đồng thời có form ghi health log, incident, tracking và delivery. Payload dùng field names của DTO Spring; lỗi API được hiển thị qua toast, và dữ liệu được tải lại sau khi ghi thành công.
- Form health log yêu cầu chọn horse từ `horseIds` của plan. Nếu backend chưa trả danh sách horse thì thao tác lưu bị khóa và UI nêu rõ lý do.
- Form ghi activity nhận cả status backend `San sang`/`Dang thuc hien` và DTO alias `READY`/`IN_PROGRESS`; delivery chỉ hiển thị khi plan đang thực hiện. Backend vẫn là nguồn quyết định status, validation và assignment.
- Signature/POD của Driver hiện tải file thật qua `POST /api/files/upload`; file được lưu tại `uploads/public/` và URL trả về được gửi trong `POST /api/deliveries`. GET `/uploads/**` public; không upload hồ sơ nhạy cảm qua API này. Nếu POST delivery thất bại sau upload, file có thể còn lại và cần chính sách dọn file riêng.
- Frontend chặn file upload lớn hơn 10 MB trước khi gửi; loại file được giới hạn ở input và vẫn được backend kiểm tra chữ ký nội dung.
- Driver/Escort tracking và delivery GET được mở ở matcher nhưng vẫn kiểm tra assignment trong service dùng `CrewAssignmentAccessService`. Chưa xác minh bằng runtime credential; các POST không được thử để tránh ghi dữ liệu vào DB chưa xác nhận là thử nghiệm.
- `npm run typecheck`, `npm run lint`, `npm run build` thành công; build cảnh báo bundle JS 811.36 kB vượt ngưỡng 500 kB. `backend\gradlew.bat test` thành công (18 tests, 0 failures), gồm kiểm tra plan horse IDs, quyền truy cập route và assignment enforcement cho tracking/delivery.
- Đây chỉ là kiểm tra source/test: chưa gọi API runtime, không đăng nhập, không restart backend, không ghi DB; backend cần restart để áp dụng code mới. Chưa xác minh POST nghiệp vụ thực tế.

### Cập nhật Transport Specialist route planning

- Dashboard chuyên viên hiện tổng hợp yêu cầu đã duyệt chưa có plan, kế hoạch đang lập và hồ sơ kiểm định từ API Spring hiện có. Chỉ Fleet Coordinator được tạo transport plan; chuyên viên được mở danh sách/detail kế hoạch và bổ sung route stops cho plan đang lập/sẵn sàng.
- `TRANSPORT_SPECIALIST` được cấp POST/PUT/DELETE route-stop authorization; `RouteStopService` vẫn áp dụng status/validation hiện tại. Chưa có model/API phân bổ stall theo ngựa; quarantine reservation không mô tả stall assignment nên chức năng này được thông báo chưa hỗ trợ, không dùng dữ liệu giả.
- Driver/Escort tracking, health, incident và delivery write endpoints đã có assignment checks trong các service backend; UI hiện dùng API thật, gồm upload chữ ký/POD trước khi tạo delivery. PUT cho tracking/health/delivery không có trong contract hiện hành.

### Xác minh chuẩn bị E2E Driver/Escort

- Đối chiếu source xác nhận form gọi đúng `POST /api/health-logs`, `/api/incidents`, `/api/tracking`, `/api/deliveries` và `POST /api/files/upload`; backend kiểm tra role, assignment và trạng thái plan theo từng nghiệp vụ.
- `npm run typecheck`, `npm run lint` và `npm run build` đã chạy thành công sau cập nhật status mapping và giới hạn file.
- Chưa chạy E2E runtime, chưa đăng nhập và chưa gửi request ghi dữ liệu. Cần backend đã chạy với database thử nghiệm an toàn, tài khoản Driver/Escort, plan được phân công và trạng thái phù hợp; plan cần có horse IDs để thử health log.

### Cập nhật frontend 2026-10-25

- Frontend đã chuyển từ Next.js sang Vite + React; UI/component và Zustand navigation được giữ lại.
- Đã xóa `src/app` (gồm 46 Route Handlers), Prisma source/dependencies và server-side SQLite helper. Các file database cũ trong `db/` được bảo toàn, không truy cập hoặc thay đổi.
- API client dùng `VITE_API_BASE_URL`, mặc định `http://localhost:8080/api`, gửi Bearer JWT và vẫn xử lý 401/403 bằng `ApiError`. Backend không được sửa.
- `npm run build`, `npm run typecheck`, `npm run lint` thành công. Browser render landing page tại `http://localhost:3000`; unauthenticated `GET /api/auth/me` trả HTTP 401 với CORS header hợp lệ cho origin này. Login preflight trả HTTP 200; không gửi credential hoặc request thay đổi dữ liệu nên chưa xác minh đăng nhập hay role flow.
- Backend từ chối CORS cho `127.0.0.1:3000` và preview `127.0.0.1:4173`; Vite dev host được chỉnh thành `localhost` và `strictPort` để dùng origin đã được backend cho phép. Không sửa backend.
- Build cảnh báo bundle JavaScript 784.98 kB vượt ngưỡng 500 kB. Shell deployment scripts chưa được kiểm tra cú pháp vì môi trường Windows không có WSL distribution; chưa chạy deployment target Linux.
- `package.json` không khai báo test script; không có test suite chạy trong lượt này. Không chạy tự động sửa 5 cảnh báo audit (4 moderate, 1 high) để tránh mở rộng phạm vi.
- Nội dung snapshot cũ phía dưới ghi nhận bối cảnh Next.js/Prisma trước migration; không dùng làm mô tả cấu hình hiện tại.

### Cập nhật phân quyền Driver/Escort 2026-10-25

- Không còn Next.js Route Handler/Prisma runtime trong source hiện tại; 46 handler cũ chỉ còn được mô tả trong snapshot lịch sử `docs/api-mapping.md`. Không có handler nào được port từ Next trong lượt này.
- Backend tái sử dụng `TransportPlanController`, `RouteStopController`, `HealthLogController`, `IncidentController` và bảng `transport_assignments`; GET plan, stop, health log và incident được lọc theo `driver_user_id` hoặc `attendant_user_id`. ID ngoài assignment trả 404; health history theo horse chỉ query trên plan được giao.
- Ở snapshot thời điểm đó, `SecurityConfig` chỉ mở các GET scope; tracking/delivery/assignment GET vẫn bị chặn. Tracking và delivery sau đó đã được mở có điều kiện trong service theo cập nhật Driver read/write ở đầu tài liệu; assignment management vẫn bị chặn cho Driver/Escort.
- Driver dashboard/danh sách/chi tiết hiện lấy dữ liệu thật từ `/api/transport-plans`, `/api/transport-plans/{id}/stops`, `/health-logs`, `/incidents`. Ghi chú ban đầu về read-only view, thiếu horse IDs và tracking/delivery chưa mở là trạng thái trước khi cập nhật Driver write/read integration ở đầu tài liệu.
- Đã gỡ `shared/trip-detail.tsx` sau khi xác minh không có consumer; nó còn gọi `/api/trips/**` legacy, trong khi `ViewRouter` trước đó đã không render component này.
- `gradlew.bat test` thành công (15 tests, 0 failures), gồm test authorization route, assignment checks, và scope query cho plan/health/incidents; `npm run typecheck`, `npm run lint`, `npm run build` thành công. Bundle JavaScript 798.10 kB vẫn có cảnh báo Vite >500 kB. Chưa chạy request runtime có credential Driver/Escort; backend cần restart để nạp thay đổi source. Không thao tác DB/schema/migration/seed.

### Cập nhật source 2026-10-22

- Đã loại bỏ source và test của backend prototype Spring Boot/SQLite nằm trong `frontend/backend/`; không xóa Prisma/SQLite Next Route Handlers vì chúng vẫn là một API surface riêng cần được thay thế theo từng chức năng, không thể xóa an toàn như một khối.
- Bổ sung owner scoping cho GET list/detail hồ sơ ngựa của CUSTOMER; giới hạn sửa locations cho staff; quarantine reservation POST của CUSTOMER kiểm tra ownership request, còn sửa/xóa/chuyển trạng thái giới hạn cho ADMIN/LOGISTICS_MANAGER/TRANSPORT_SPECIALIST.
- Bổ sung `AssignmentController` sử dụng `AssignmentService`/`transport_assignments` sẵn có và form tạo/hủy assignment trong chi tiết kế hoạch. Thay đổi mới chỉ được kiểm tra compile/test/frontend build; không chạy API runtime hoặc thao tác database.
- Customer Dashboard hiện trong source đã lấy dữ liệu từ ba API Spring: yêu cầu của khách hàng, ngựa của khách hàng và hóa đơn của khách hàng; thêm nút thử lại khi tải lỗi.
- Build Next.js hiện bật type check; TypeScript loại trừ `examples/websocket` vì đây là ví dụ độc lập thiếu `socket.io` dependencies, không thuộc luồng ứng dụng. Ví dụ đó vẫn chưa type-check độc lập.
- Runtime mới ngày 2026-10-22 không xác minh được: cả `localhost:3000` và `localhost:8080` từ chối kết nối. Các kết quả runtime ngày 2026-10-21 dưới đây chỉ là lịch sử, không khẳng định trạng thái hiện tại.

## Phạm vi và kết quả

Frontend vẫn là Next.js. Không tạo API mới, không đổi schema, không chạy migration/seed và không ghi dữ liệu demo vào SQL Server. Đã dùng các API hiện có khi hợp đồng đủ rõ; các luồng thiếu API hoặc phạm vi truy cập an toàn được nêu rõ thay vì giả lập.

### Khôi phục wizard tạo yêu cầu (2026-10-21)

Wizard cũ còn ở `src/components/views/customer/request-create-wizard.tsx` nhưng không được import; `ViewRouter` dùng `request-create.tsx`, một form đơn giản khác. Wizard cũ gọi multipart `POST /transport-requests`, `/transport-requests/{id}/options`, `/submit` và `/options` đọc; các endpoint/options này không có trong Spring controller. Nó còn chứa giá chuồng, phí nhân viên, phí quốc tế và add-on hardcode, cùng trường deadline không có trong DTO. Do các bước lựa chọn và báo giá đó không thể ánh xạ chính xác, đã giữ lại cấu trúc 8 bước/tiến trình cũ, nhưng thay nội dung bước 3–7 bằng trạng thái chưa hỗ trợ; không hiển thị lựa chọn hay giá giả.

| Nhóm UI trong wizard | Trường/API thực tế | Kiểm tra và trạng thái |
|---|---|---|
| Chọn ngựa | `GET /api/horses/my-horses`; chọn `horseId` từ response | UI chỉ hiển thị danh sách của khách hàng. Backend `TransportRequestService.create` xác minh từng ngựa thuộc owner; chọn ngựa khác chủ bị từ chối 400 theo source. Chưa chạy thử runtime. |
| Điểm đi/đến | `originLocationId`, `destinationLocationId` (`UUID`), `GET /api/locations` | Hai giá trị bắt buộc và phải khác nhau; service kiểm tra location tồn tại. |
| Thời gian | `scheduledDepartureDate`, `scheduledArrivalDate` (`LocalDate`) | Cả hai bắt buộc; ngày đi không ở quá khứ, ngày đến cùng hoặc sau ngày đi. Ngày đến trước đây không bắt buộc trong UI cũ nhưng DTO backend yêu cầu. |
| Yêu cầu đặc biệt | `specialRequirements` (`String`, tối đa 4000) | Được gửi trong JSON; rỗng gửi `null`. |
| Tiền tệ | `currency` (`String`, 3 chữ cái) | UI giới hạn JPY/VND/USD; backend nhận pattern 3 chữ cái và mặc định JPY nếu null/rỗng. Đây không phải báo giá. |
| Tệp đính kèm | Sau khi tạo thành công, mỗi tệp gửi tới `POST /api/horses/{horseId}/documents` multipart gồm `file`, `documentType`, `requestId` | Endpoint có thật, service kiểm tra owner và request có chứa horse. Mỗi file phải được gán một ngựa đã chọn và loại hồ sơ do khách nhập. Upload tuần tự; nếu một file lỗi, giữ mã request và chỉ retry file chưa xác nhận; nếu kết quả upload mơ hồ do network/5xx thì mở request detail để kiểm tra, không POST lại tự động. Tệp được giữ trong bộ nhớ component, không localStorage; refresh làm mất file chưa upload. |
| Deadline, timezone, pickup/delivery notes, phương án, chuồng, nhân viên, dịch vụ, quote | Không có trường/API phù hợp trong `TransportRequestCreateRequest`; không có API options/submit/quote Spring | Không gửi hoặc chặn request chính; các bước 3–7 giải thích giới hạn. Quote chỉ có `estimatedAmount` tại quy trình manager approve, không có quote tổng từ các khoản cấu thành. |

Payload tạo request hiện chỉ gồm các trường DTO: `{originLocationId,destinationLocationId,scheduledDepartureDate,scheduledArrivalDate,horseIds,specialRequirements,currency}`; dùng JSON `POST /api/transport-requests`, không dùng Next.js Route Handler/Prisma. Mã và status chỉ lấy từ response thật. Khóa nút gửi khi đang chờ; nếu response 5xx/network không xác định, UI chặn gửi lại để tránh tạo duplicate. Tạo request và upload tài liệu là hai thao tác độc lập, nên lỗi upload không được trình bày như request thất bại.

### Rà soát role toàn hệ thống (đối chiếu source, chưa phải E2E từng role)

| Role thực tế | Frontend/API hiện có | Kết quả rà soát và giới hạn |
|---|---|---|
| `ADMIN` | Dashboard tổng hợp; API users/audit logs và các GET nghiệp vụ theo security | Dashboard live đã kiểm tra. Giao diện quản trị/audit riêng chưa đầy đủ; endpoint audit log hiện được giới hạn ADMIN theo controller contract. |
| `LOGISTICS_MANAGER` | Dashboard, hàng đợi duyệt, request detail, users/staff, invoice | Approve/reject có backend; chưa có workflow cancel/request-more/history đầy đủ. Chưa xác minh runtime bằng account manager. |
| `TRANSPORT_SPECIALIST` | Dashboard, inspection list/detail, compliance | Inspection status API có; tài liệu chưa có reviewer/status riêng. Chưa xác minh runtime bằng account specialist. |
| `FLEET_COORDINATOR` | Dashboard, plan list/create/detail, asset/fleet, assignment | Assignment API và UI tạo/hủy đã có trong source; readiness chưa hoàn thiện. Chưa xác minh runtime bằng account coordinator. |
| `DRIVER_ESCORT` | Role tồn tại trong backend; POST tracking/health/incident/delivery được phân quyền | Dashboard/read plan bị chặn cho đến khi backend scope theo assignment. Chưa có API đọc assignment để xác định nhiệm vụ của người dùng. |
| `CUSTOMER` | Dashboard, horse/request, invoice; ownership checks backend theo service | Không thể đọc dữ liệu owner khác theo các service đã rà soát; account CUSTOMER chưa xác minh runtime. |
| Veterinarian | Không tìm thấy role `VETERINARIAN`/`VET` trong role constants, role/security mappings hoặc source backend đã rà soát | Không có dashboard/permission/workflow bác sĩ thú y riêng; không giả định `DRIVER_ESCORT` tương đương bác sĩ. |

### Danh sách vấn đề theo mức ưu tiên

| Ưu tiên | Màn hình/chức năng | Vấn đề và nguyên nhân | File/API liên quan | Trạng thái |
|---|---|---|---|---|
| P1 | Đăng ký khách hàng | UI trước đó gửi `phoneNumber` nhưng DTO yêu cầu `phone`; UI cho phép bỏ số điện thoại/tổ chức dù backend bắt buộc; validation phone/password không đồng bộ. | `register-page.tsx`, `RegisterRequest.java`, `POST /api/auth/register` | Đã sửa payload và validation; đăng ký live chưa chạy vì sẽ ghi DB. |
| P1 | Audit log / role API | GET audit logs matcher cấp manager dù controller ghi chỉ ADMIN; `/api/roles/**` cũng rộng hơn controller contract. | `SecurityConfig.java`, `AuditLogController.java`, `RoleController.java` | Đã giới hạn hai GET cho ADMIN; build pass, runtime chưa xác minh sau restart. |
| P1 | Customer ownership | Service có ownership checks nhưng chưa có credential CUSTOMER được xác minh để kiểm tra quyền IDOR runtime. | horse/request/invoice services và API detail | Đã rà source; runtime security test còn thiếu. |
| P1 | Driver/Escort | Backend chưa có API đọc assignment có scope nên không xác định được plan thuộc tài xế. | `AssignmentService`; thiếu controller; plan/tracking/health GET | UI chặn dashboard/plan detail; chưa hoàn thiện tác nghiệp. |
| P1 | Manager → Coordinator | Assignment API mới có nhưng chưa có runtime verification; readiness chưa đủ; dữ liệu mẫu có plan chưa đồng bộ trạng thái request. | `AssignmentController`, `AssignmentService`, `/api/transport-plans/**` | Cần test runtime trên DB dev riêng và hoàn thiện điều kiện readiness; không cho UI tự đánh dấu sẵn sàng. |
| P2 | Forgot/reset password | Spring auth không có recovery endpoints; Next handlers cũ dùng Prisma riêng và không gửi email thực. | `AuthController.java`, UI forgot/reset, Next `/api/auth/*` handlers | UI báo chưa hỗ trợ, không tạo success giả. |
| P2 | Admin operations | API user/audit có nhưng giao diện quản trị chuyên biệt/audit browser chưa có. | `/api/users/**`, `/api/audit-logs/**`, `view-router.tsx` | Chưa triển khai; cần yêu cầu Admin cụ thể. |
| P2 | Specialist/compliance | Có inspection records nhưng không có reviewer/status cho từng tài liệu hay workflow theo quốc gia. | `InspectionController`, HorseDocument API | Inspection UI có; không suy diễn tuân thủ pháp lý. |
| P2 | Hủy đơn / yêu cầu bổ sung | Không có endpoint cancel, request-more hoặc history tương ứng trong Spring. | `TransportRequestController` | Không hiển thị thao tác không được backend hỗ trợ. |
| P2 | Bồi thường | Không tìm thấy controller/DTO claim/compensation trong backend. | Backend controller set | Chưa triển khai, không có căn cứ để duyệt hoặc định giá. |
| P2 | Chuồng/escort/package/add-on | Request DTO không nhận các tùy chọn này; wizard cũ có giá cục bộ và gọi API options không tồn tại. | `TransportRequestCreateRequest`, `request-create-wizard.tsx` | Wizard cũ được nối lại; các bước không có API hiển thị rõ chưa hỗ trợ, không bật pricing/mock. |
| P2 | Dashboard role | Dashboard nội bộ đọc API live; Driver bị chặn an toàn; Customer và các role nhân sự chưa E2E. | Dashboard components, `/api/**` | ADMIN runtime đã render; các role khác chưa kiểm tra. |
| P3 | Trang giới thiệu role | Ba trang Specialist/Coordinator/Driver-Escort trước đó chưa có. | `role-overview-page.tsx`, `home-page.tsx`, `public-site.tsx` | Đã thêm; navigation và browser render đã kiểm tra. |
| P3 | Veterinarian | Không có role riêng trong role/security mappings đã rà soát. | backend role/security, `constants.ts` | Không tạo role hoặc gán quyền theo suy đoán. |

Các chỗ lệch contract được xử lý trong lượt này:

- Đăng ký từng gửi `phoneNumber`, trong khi `RegisterRequest` bắt buộc trường `phone`, và UI coi số điện thoại/tổ chức là tùy chọn dù backend bắt buộc. Đã khớp payload, required fields, password length 8–72 và validation số điện thoại 10 chữ số bắt đầu bằng 0 ở UI/backend.
- “Quên mật khẩu”/“Đặt lại mật khẩu” từng gọi trực tiếp các route `/api/auth/forgot-password`, `/verify-code`, `/reset-password` không có trong Spring `AuthController`; Next handlers tương ứng dùng Prisma store tách biệt. UI hiện thông báo chưa hỗ trợ, không tuyên bố đã gửi email/đổi mật khẩu.
- `AuditLogController` ghi chú chỉ ADMIN, nhưng `SecurityConfig` trước đó cấp GET audit logs cho LOGISTICS_MANAGER. Đã đồng nhất matcher theo ADMIN.

Đăng ký hợp lệ chưa gửi live vì thao tác sẽ tạo user và chưa có database test chuyên dụng được xác nhận. Validation frontend/backend đã được kiểm tra qua source/build; chưa xác nhận runtime đăng ký sau restart backend.

### Phân loại chức năng còn thiếu theo bằng chứng backend/frontend

| Chức năng | Phân loại | Bằng chứng hiện có | Trạng thái / điều kiện tiếp theo |
|---|---|---|---|
| Customer yêu cầu hủy transport request | **4 — Chưa có luồng API/UI** | Request controller chỉ expose GET/POST và approve/reject; trạng thái `CANCELLED` chỉ dùng lọc dữ liệu. | Không thêm nút hay chính sách hủy. Cần định nghĩa role, trạng thái được hủy, hậu quả phí/hoàn tiền và audit history. |
| Yêu cầu bồi thường | **4 — Chưa có cả hai** | Không tìm thấy compensation/claim controller, DTO hoặc màn hình đang hoạt động. | Cần nghiệp vụ, dữ liệu chứng minh, thẩm quyền và quy trình xử lý. |
| Cấu hình chuồng vận chuyển theo request | **2 — Chỉ còn UI legacy, không có Spring API** | `request-create-wizard.tsx` có form/config/pricing nhưng không được `ViewRouter` dùng; Spring request DTO không nhận stall configuration. Có quarantine reservations nhưng đó không phải cấu hình chuồng. | Không bật legacy flow; cần API và quy tắc an toàn/giá được duyệt. |
| Giới hạn tối đa 4 escort | **2 — UI legacy chưa đủ, backend chưa enforce** | Legacy wizard có bộ đếm escort nhưng không có max 4; active request DTO/assignment API không nhận trường này. | Không coi giới hạn UI là kiểm soát. Cần quyết định 0–4 hay 1–4 và thêm validation backend trước khi triển khai. |
| Gói dịch vụ | **2 — UI legacy, không có API Spring** | Tùy chọn/giá trong wizard cũ; không có package field trong DTO/service tạo request. | Cần catalog, điều kiện và giá do nghiệp vụ cung cấp. |
| Chi phí bổ sung của incident | **3 — API có, UI đang hoạt động chưa tích hợp thao tác duyệt** | Incident DTO/service nhận `additionalCost`; `PATCH /api/incidents/{id}/approve-cost` chỉ cho ADMIN/LOGISTICS_MANAGER. Active plan detail hiển thị amount/approved status; approve button chỉ còn trong màn trip legacy không được router dùng. | Chưa thêm nút duyệt: response không có currency/unit cho khoản tiền; cần xác nhận đơn vị tiền và cách hạch toán trước khi cho manager approve từ UI active. |
| Add-on charges trong báo giá request | **2 — UI legacy, không có API Spring** | Wizard cũ tính phí nội bộ; request DTO chỉ có currency/special requirements, không có breakdown/options; active request page không có báo giá add-ons. | Không dùng giá cục bộ hoặc gắn vào tổng hóa đơn. Cần backend quote/item model và chính sách giá. |
| Assignment nhân viên/phương tiện | **1 — Backend API và UI tích hợp một phần** | Bảng/entity/service hiện có; đã thêm REST API, role checks và UI tạo/hủy cho Fleet Coordinator. | Runtime chưa thử; UI chưa sửa assignment hiện hữu; readiness chưa được bật và Driver/Escort chưa có read scope. |
| Tuyến đường / route stops | **1 — Backend và UI cơ bản đã có** | TransportPlan/RouteStop controllers và active plan detail/list có; dùng API `/api/transport-plans/**` và `/api/route-stops/**`. | Chưa E2E role Coordinator; không đại diện assignment/readiness. |
| Kiểm tra hồ sơ vận chuyển | **1 — Inspection API/UI có một phần** | Inspection controller/list/detail cập nhật trạng thái; horse document API tải file. | Không có reviewer/status cho từng document, request-more workflow hay compliance rule theo quốc gia. |
| Nhiệm vụ Driver/Escort | **3 — Assignment tồn tại nhưng nhiệm vụ đọc chưa có scope** | Assignment controller được bổ sung cho staff; GET plan/logs vẫn bị chặn cho Driver/Escort. | Không có UI tác nghiệp active; cần API read theo assignment cho plan, stops, tracking, health, incidents và delivery trước. |
| Veterinarian | **5 — Chưa thể triển khai vì không có role/quy tắc riêng** | Không tìm thấy role `VETERINARIAN`/`VET`; health log không chứng minh đây là quyền bác sĩ. | Cần xác nhận role, phạm vi y tế và quyền truy cập; không cấp quyền theo suy đoán. |

### Runtime kiểm tra an toàn ngày 2026-10-21

- Không xác định được đây là development, staging hay SQL Server dùng chung. Process chạy local từ workspace; `application.properties` cấu hình SQL Server `HorseTransportManagementDB`, không có bằng chứng DB riêng dành cho test. Do đó coi các thao tác ghi là không an toàn.
- Backend listener PID `28096` (Java) đã chạy từ `06:36:58`; `SecurityConfig.class` được biên dịch lúc `06:53:49`, `RegisterRequest.class` lúc `06:51:32`. Process được khởi chạy bằng classpath `backend/build/classes/java/main` và chưa restart sau thời điểm biên dịch; JVM đang phục vụ phiên bản class cũ. Không dừng hoặc restart process.
- CORS preflight `OPTIONS /api/roles` từ origin `http://localhost:3000` trả HTTP 200, `Access-Control-Allow-Origin: http://localhost:3000`, methods gồm GET/POST/PUT/PATCH/DELETE/OPTIONS.
- Reload frontend trong browser gửi trực tiếp `GET http://localhost:8080/api/auth/me` và nhận HTTP 401 khi không có token; xác nhận base URL/tiền tố API thực tế và luồng unauthenticated. Không coi 401 này là lỗi CORS hoặc xác minh login.
- GET không token tới `/api/auth/me`, `/api/roles`, `/api/audit-logs`, `/api/transport-requests`, `/api/transport-plans`, `/api/inspections`, `/api/transport-assets`, `/api/incidents`, `/api/invoices` đều trả HTTP 401. Đây là kết quả chặn truy cập anonymous; không chứng minh quyền của role đã đăng nhập. Không có credential được dùng trong phép thử này.
- Frontend client dùng `NEXT_PUBLIC_API_BASE_URL` hoặc mặc định `http://localhost:8080`, tự ghép `/api`; source registration gửi POST JSON gồm `name,email,phone,organizationName,password,confirmPassword`. Không gửi POST registration runtime vì có thể ghi user vào DB.
- Do process backend chưa restart và không có DB test/credential được xác minh, chưa kiểm thử runtime các thay đổi `/api/roles`, audit-log, phone validation, đăng ký, login/session hoặc role-specific ownership trong lượt này. Runtime dashboard ADMIN đã được xác minh trong lượt trước với process đang chạy khi đó.

### Trang đã cập nhật

- Yêu cầu vận chuyển: `ViewRouter` dùng lại wizard 8 bước cũ; gửi JSON đúng `TransportRequestCreateRequest`, validate điểm đi/đến, ngựa và ngày; giữ state trong phiên component nếu API lỗi; chuyển đến detail theo ID backend trả về. Upload hồ sơ dùng endpoint horse-document có thật sau khi request tạo thành công; bước options/chuồng/nhân sự/dịch vụ/quote không giả lập.
- Request detail: tải tài liệu thật theo horse/request, tải file qua API có JWT, hiển thị rõ tài liệu chưa có trạng thái thẩm định; approve/reject có xác nhận, giá dự kiến tùy chọn và lý do bắt buộc khi từ chối; hiển thị các mốc backend thực lưu và liên kết tới plan khi có.
- Inspection detail mới: mở bằng `inspectionId`, hiển thị yêu cầu/horse/chuyên viên/tài liệu/ghi chú, cho phép chuyên viên chọn bước tiếp theo theo trạng thái hiện tại và yêu cầu lý do với từ chối/yêu cầu bổ sung.
- Horse detail: thêm lịch sử sức khỏe thật, yêu cầu liên quan, thông tin chủ hồ sơ và tải tài liệu; không suy diễn chẩn đoán hoặc trạng thái duyệt tài liệu.
- Transport-plan detail: hiển thị điểm dừng dự kiến/thực tế, tracking logs, health logs, incidents và delivery theo đúng `planId`; nhãn rõ các tọa độ là mốc do người dùng gửi, không phải GPS live. Không ánh xạ `trips` sang `transport-plans`.
- Invoice detail: xác nhận thao tác ghi nhận đã thanh toán và kiểm tra response `PAID`; thông báo rõ thao tác chỉ đổi trạng thái, không chạy giao dịch trực tuyến.
- Router: bật request wizard đã khớp API và kiểm soát các màn hình theo role frontend; Driver/Escort không được mở plan detail khi API đọc chưa lọc theo assignment.
- API client: bổ sung tải file có Authorization, xử lý 401 và lỗi HTTP theo cùng hợp đồng API.
- `api-mapping.md`: cập nhật mapping hiện tại, phạm vi security và trạng thái runtime mới nhất.

## Tình trạng từng flow

| Flow | Trạng thái | Giới hạn còn lại |
|---|---|---|
| A — Khách hàng tạo yêu cầu | Wizard gốc được router sử dụng lại. Gửi JSON đúng DTO, mở detail theo ID backend; file chọn trước được tải thật sau khi tạo qua API hồ sơ ngựa, có cơ chế không tạo lại request khi upload lỗi. | File chỉ giữ trong memory tới khi upload; API không lưu competition, deadline riêng, lựa chọn chuồng, staff/options hoặc quote. Chưa tạo request runtime vì không xác nhận được database test/credential CUSTOMER. |
| B — Manager xử lý yêu cầu | Detail có xác nhận approve/reject, giá dự kiến và lý do từ chối. `SecurityConfig` giới hạn approve/reject cho `LOGISTICS_MANAGER`; backend chỉ xử lý request đang chờ. | Backend không có history endpoint; lý do từ chối chỉ vào notification, không được lưu thành lịch sử trên request. Không có thao tác “yêu cầu bổ sung”. Chưa thử mutation trên DB demo. |
| C — Điều phối chuyến | Plan list/create/detail, route-stop read và assignment create/read/delete dùng API/model thực. | Assignment runtime chưa kiểm thử; chưa thể xác nhận readiness. `plan2` trong DB mẫu được ghi nhận trước đây ở trạng thái lập kế hoạch dù request gốc còn pending; cần xác minh lại dữ liệu hiện tại. |
| D — Theo dõi chuyến | Plan detail hiển thị tracking, chỉ số sức khỏe và điểm dừng đã ghi. | Backend chưa giới hạn GET plan/logs theo assignment Driver/Escort; SecurityConfig chặn các GET này cho Driver/Escort cho tới khi có scope an toàn. Không có UI cập nhật cho tài xế trong task này và không có GPS live. |
| E — Hồ sơ/thủ tục xuyên biên giới | Inspection detail cho phép cập nhật trạng thái kiểm định; tài liệu có thể xem/tải và kiểm tra hạn hết hạn. SecurityConfig giới hạn thay đổi inspection cho `TRANSPORT_SPECIALIST`. | Document API không có reviewer/status; không có workflow yêu cầu bổ sung tài liệu riêng hay điều kiện readiness pháp lý theo quốc gia. Không kết luận tuân thủ quy định từ tên file hoặc metadata. |
| F — Sức khỏe và sự cố | Horse/plan detail hiển thị health logs và incidents thật; dữ liệu được ghi nhận được trình bày như dữ liệu nhập, không phải chẩn đoán. | Incident chỉ liên kết với plan, không có `horseId`. Không thêm thao tác nhập sức khỏe/sự cố cho Driver/Escort khi luồng đọc plan của role này chưa được scope an toàn. |
| G — Chi phí/hoàn tất | Invoice detail hiển thị số tiền từ invoice và cho Logistics Manager xác nhận trạng thái thanh toán bằng API. | Không có cổng thanh toán; thao tác là ghi nhận trạng thái thủ công. Backend chưa có tổng hợp chi phí từ các khoản cấu thành/incident để tạo quyết toán chuyến. Delivery cần `signatureImageUrl`, nhưng chưa có API upload chữ ký; không thể hoàn tất end-to-end. |

`/api/dashboard`, `/api/notifications`, `/api/search`, `/api/recovery-dashboard` và `/api/trips/**` vẫn không có hợp đồng Spring Boot tương đương. Không thay `/api/trips/**` bằng `/api/transport-plans/**`.

## Các file đã thay đổi

### Frontend

- `src/components/views/customer/request-create.tsx`
- `src/components/views/customer/request-create-wizard.tsx` (wizard 8 bước cũ được tái sử dụng; các bước thiếu API được ghi rõ)
- `src/components/views/customer/request-detail.tsx`
- `src/components/views/customer/horse-detail.tsx`
- `src/components/views/specialist/inspection-list.tsx`
- `src/components/views/specialist/inspection-detail.tsx` (mới)
- `src/components/views/coordinator/transport-plan-detail.tsx`
- `src/components/views/shared/invoice-detail.tsx`
- `src/components/views/shared/role-dashboard.tsx` (mới; dashboard tổng hợp từ API nghiệp vụ thật)
- `src/components/views/view-router.tsx`
- `src/lib/api-client.ts`
- `src/lib/constants.ts`
- `src/components/public/register-page.tsx`
- `src/components/public/forgot-password-page.tsx`
- `src/components/public/reset-password-page.tsx`
- `src/components/public/role-overview-page.tsx` (mới; trang giới thiệu theo vai trò nhân sự)
- `src/components/public/home-page.tsx`
- `src/components/public/public-site.tsx`
- `src/components/public/public-footer.tsx`
- `src/store/app-store.ts`
- `public/role-specialist.svg`, `public/role-coordinator.svg`, `public/role-driver-escort.svg`
- `docs/api-mapping.md`
- `docs/demo-flow-implementation.md` (tài liệu này)

### Backend

- `src/main/java/com/equiflow/security/SecurityConfig.java`: khóa approve/reject request cho Customer; giới hạn review inspection, tạo/sửa plan, route stops/assets theo vai trò; chặn Driver/Escort đọc plan/logs chưa được scope theo assignment; giới hạn `/api/users/**` cho ADMIN/LOGISTICS_MANAGER.
- `src/main/java/com/equiflow/controller/UserController.java` và `src/main/java/com/equiflow/service/UserService.java`: ADMIN được quản lý toàn bộ tài khoản; Logistics Manager chỉ đọc/tạo/sửa các vai trò nhân sự nội bộ, không xem hoặc sửa CUSTOMER/ADMIN.
- `src/main/java/com/equiflow/dto/RegisterRequest.java`: số điện thoại đăng ký được validate đúng định dạng 10 chữ số bắt đầu bằng 0.
- `src/main/java/com/equiflow/security/SecurityConfig.java`: ngoài giới hạn users từ lượt trước, GET audit logs và `/api/roles/**` đã được đồng nhất theo contract controller là chỉ ADMIN.

Các thay đổi trên sửa lỗ hổng phân quyền đã xác định trong endpoint users: matcher cũ cho phép CUSTOMER gọi tất cả method `/api/users/**`; service trả hồ sơ email/điện thoại và PUT cho phép đổi `roleId`. Không sửa entity, schema, migration, seed, cấu hình chạy backend hoặc dữ liệu SQL. Backend process hiện chạy chưa restart sau build, nên thay đổi phân quyền tài khoản mới chỉ được build, chưa có hiệu lực runtime.

### Baseline và audit toàn ứng dụng

- Frontend `npm run build`: thành công nhưng Next.js bỏ qua type-check theo cấu hình hiện hữu.
- `npm run lint`: baseline và sau thay đổi vẫn 7 lỗi `react-hooks/set-state-in-effect` ở `carousel.tsx`, `coordinator/plan-detail.tsx`, `shared/trip-detail.tsx`, `use-mobile.ts`; không thuộc file thay đổi hiện tại.
- `npx tsc --noEmit`: chỉ báo thiếu `socket.io-client`/`socket.io` trong `examples/websocket`; không thêm dependency vì đây là ví dụ độc lập.
- Backend `.\gradlew.bat build`: thành công; không có test source (`test NO-SOURCE`).
- ESLint chọn lọc file frontend đã sửa trong các lượt audit và lượt khôi phục wizard (bao gồm wizard và router): thành công.
- Browser đã mở/điều hướng được cả ba trang role; SVG từng role trả HTTP 200. Form đăng ký hiển thị lỗi inline với phone không hợp lệ mà không gửi request tạo tài khoản. Forgot password hiển thị rõ chưa hỗ trợ và không gửi mã.
- Runtime GET/CORS results are recorded above; không có API mutation nào được gửi.
- `npm run build` không chạy TypeScript check vì `next.config.ts` đang đặt `typescript.ignoreBuildErrors: true`; full `tsc` lỗi riêng hai import socket.io trong ví dụ websocket. Không thay cấu hình hoặc cài dependency.
- Không thực hiện test E2E ghi dữ liệu, role authorization runtime hoặc đăng ký hợp lệ; backend chạy hiện tại chưa restart sau cập nhật matcher/validator.
- API đọc runtime bằng tài khoản ADMIN: requests 3, plans 2, inspections 3, assets 3, incidents 1, invoices 2; các GET trả HTTP 200. Chỉ đọc, không ghi dữ liệu.
- Browser đã render dashboard ADMIN mới từ API và hiển thị đúng các số đếm; trước đó dashboard các vai trò nội bộ gọi `/api/dashboard` không tồn tại.
- Tại baseline audit ban đầu, `request-create-wizard.tsx` chưa được `view-router.tsx` import; wizard đó chứa API options không tồn tại và giá mô phỏng. Trong lượt khôi phục này, router đã chuyển sang wizard cũ sau khi thay mapping và bỏ logic giả. `request-create.tsx` được giữ nguyên nhưng hiện không được router dùng; không có fallback localStorage/demo.
- Các Next.js handlers trong `src/app/api/**` không phải Spring endpoints; màn hình active được định tuyến bằng `view-router.tsx` và dùng `api-client.ts` gọi backend Spring. Chưa xóa handler/legacy component vì ngoài phạm vi thay thế và cần audit riêng trước khi loại bỏ.
- Chưa chạy mutation request/approve/plan/invoice hoặc test các tài khoản ngoài ADMIN; không thực hiện vì chưa xác minh credential/customer ownership và không muốn tạo hoặc thay đổi record trong DB demo.

### Kiểm thử bổ sung — khôi phục wizard (2026-10-21)

- `npx eslint src\components\views\customer\request-create-wizard.tsx src\components\views\view-router.tsx`: **thành công**.
- `npm run build`: **thành công**, nhưng Next.js ghi rõ đã bỏ qua kiểm tra TypeScript theo cấu hình hiện tại.
- `npx tsc --noEmit`: **thất bại tại hai import thiếu trong ví dụ độc lập** `examples/websocket/frontend.tsx` (`socket.io-client`) và `examples/websocket/server.ts` (`socket.io`); không có lỗi TypeScript khác được báo trong lần chạy này.
- Không thay đổi backend nên không chạy lại Gradle build trong task wizard này; build backend gần nhất được ghi ở baseline phía trên.
- Không chạy browser/E2E cho wizard hoặc POST `/api/transport-requests`/upload: chưa xác nhận được database thử nghiệm riêng và credential CUSTOMER được phép ghi. Vì vậy response tạo, tài liệu upload và đọc lại trong danh sách/detail chưa được xác minh runtime.
- Không thay đổi database, schema, migration, seed hoặc dữ liệu; không restart/dừng backend.

## Dữ liệu demo hiện có — chỉ đọc

Đã truy vấn SQL Server bằng SELECT; không thêm, cập nhật hoặc xóa dữ liệu.

- Tài khoản trong `dbo.users`: `customer@example.com` (CUSTOMER), `logistics.manager@example.com` (LOGISTICS_MANAGER), `specialist@example.com` (TRANSPORT_SPECIALIST), `fleet.coordinator@example.com` (FLEET_COORDINATOR), `driver@example.com` và `escort.vet@example.com` (DRIVER_ESCORT). DB còn có `admin@example.com` (ADMIN); role ADMIN không thuộc bộ 5 role trong tài liệu nghiệp vụ. Mật khẩu không được ghi trong tài liệu.
- Request `F6000000-0000-0000-0000-000000000001`: `Da phe duyet`.
- Request `F6000000-0000-0000-0000-000000000002`: `Dang tham dinh`.
- Request `F6000000-0000-0000-0000-000000000003`: `Da huy`.
- Plan `11A00000-0000-0000-0000-000000000001`: `Dang thuc hien`; có assignment, tracking, health log, incident đang xử lý và delivery. Vì incident còn mở, không thể dùng mẫu này để chứng minh hoàn tất chuyến.
- Plan `11A00000-0000-0000-0000-000000000002`: `Dang lap ke hoach`, không có assignment; request gốc hiện `Dang tham dinh`, không phù hợp quy trình “được duyệt rồi mới lập plan”.
- Ba inspection mẫu có trạng thái `Dang xu ly`, `Yeu cau bo sung ho so`, `Da phe duyet`.
- Không có plan ở trạng thái hoàn thành. Dữ liệu hiện tại vì vậy chưa phải một kịch bản đầu-cuối nhất quán.

### Kịch bản trình diễn đề xuất

Chỉ dùng bản sao DB/dev environment dành riêng cho demo nếu cần thao tác ghi; không xử lý các bản ghi mẫu đang dùng chung nếu chưa được xác nhận.

1. Đăng nhập tài khoản `customer@example.com`; kiểm tra horse list và các request của chính khách hàng.
2. Tạo yêu cầu mới bằng tuyến/ngày/horse thật. Xác nhận mã và trạng thái do API trả về; nộp tài liệu sau đó từ request detail.
3. Đăng nhập `logistics.manager@example.com`; mở request mới, nhập giá tùy chọn và approve hoặc nhập lý do để reject. Khách hàng mở lại request để xem trạng thái/notification.
4. Đăng nhập `specialist@example.com`; mở một inspection theo `inspectionId`, xem tài liệu/hạn, yêu cầu bổ sung hoặc phê duyệt theo dữ liệu thực.
5. Đăng nhập `fleet.coordinator@example.com`; tạo plan chỉ từ request đã được duyệt, mở chi tiết và có thể tạo/hủy assignment qua API mới. Chỉ thực hiện trên DB demo riêng đã được phê duyệt; runtime và readiness chưa được xác minh.
6. Driver/Escort hiện không có luồng detail an toàn để đọc plan đã phân công; không trình diễn cập nhật tracking/health/incident qua UI. Các tọa độ có sẵn chỉ là log do người dùng nhập, không phải GPS.
7. Xem invoice bằng tài khoản Customer/Manager. Request detail lấy tổng tiền từ `GET /api/transport-requests/{requestId}/invoice`; backend chưa có breakdown giá cơ bản/phụ phí và chưa cấu hình thông tin tài khoản ngân hàng. Chỉ Logistics Manager có thể dùng `PUT /api/invoices/{id}/pay` để ghi nhận khoản thanh toán thủ công đã nhận (chuyển khoản hoặc tiền mặt); thao tác không gọi payment gateway. Không trình diễn hoàn tất chuyến vì hiện không có delivery-signature upload và incident mẫu còn mở.

Tài khoản/role được liệt kê từ DB thực tế. Đã xác minh login runtime từ frontend origin với tài khoản demo ADMIN; không đưa mật khẩu hoặc JWT vào source, output hoặc tài liệu. Trước khi demo các luồng theo role khác, xác nhận credential tương ứng trong môi trường demo.

## Lệnh chạy và kiểm thử

Chạy backend và frontend trong hai terminal riêng:

```powershell
Set-Location C:\Equideli\backend
.\gradlew.bat bootRun
```

```powershell
Set-Location C:\Equideli\frontend
npm run dev
```

Kiểm tra:

```powershell
Set-Location C:\Equideli\backend
.\gradlew.bat build
```

```powershell
Set-Location C:\Equideli\frontend
npm run build
npm run lint
npx tsc --noEmit
```

## Kết quả kiểm thử trong task

- Frontend production build: **thành công**. Next.js vẫn bỏ qua type validation trong build theo cấu hình hiện có.
- ESLint trên toàn bộ file frontend đã sửa: **thành công**.
- Full frontend lint: **thất bại với 7 lỗi `react-hooks/set-state-in-effect` có sẵn** ở `carousel.tsx`, `coordinator/plan-detail.tsx`, `shared/trip-detail.tsx`, `use-mobile.ts`; không phát sinh lỗi ở các file đã sửa trong task.
- TypeScript `npx tsc --noEmit`: **thất bại chỉ tại ví dụ độc lập** `examples/websocket/frontend.tsx` và `examples/websocket/server.ts` do thiếu `socket.io-client`/`socket.io`. Không thêm dependency vì ví dụ không nằm trong luồng build ứng dụng chính.
- Backend `.\gradlew.bat build`: **thành công**; Gradle báo `test NO-SOURCE`, không có test backend để chạy.
- Runtime login: đã submit form thật từ `http://localhost:3000`; API trả HTTP 200, frontend lưu token và role `ADMIN`, rồi hiển thị Dashboard. `GET /api/auth/me` dùng Bearer token trả HTTP 200 với cùng role. Token/mật khẩu không được in hoặc ghi log. Mật khẩu sai/email không tồn tại trả 401; email sai định dạng hoặc thiếu mật khẩu trả 400 validation.
- HTTP 400 tổng quát ghi nhận trước đó đến từ lệnh probe PowerShell gửi JSON đã escape dấu quote (`{\"email\":...}`) nguyên văn, không phải frontend. Frontend dùng `JSON.stringify` và hợp đồng `LoginRequest` khớp.
- CORS preflight login từ frontend trả HTTP 200. GET plan không token vẫn trả 401. API nghiệp vụ khác chưa được thử trong lượt này. Session trình duyệt ban đầu được khôi phục sau khi hoàn tất kiểm thử form đăng nhập.
- Sau các thay đổi đăng ký và trang giới thiệu role trong audit này, chỉ reload trang chủ và quan sát `GET /api/auth/me` không token → 401; không coi đây là E2E. Các kiểm tra login ADMIN được nêu ở trên thuộc lần kiểm thử trước, không được chạy lại trong lượt này. Chưa tạo/đổi trạng thái dữ liệu SQL demo.
