# Equideli repair report — 2026-10-22

## A. Tóm tắt kết quả

Task được hoàn thành **một phần**, không phải nghiệm thu tích hợp runtime toàn hệ thống.

Đã:

- Gỡ source/test và output build của backend Spring Boot/SQLite prototype trong `frontend/backend/`; không tác động backend nghiệp vụ `backend/`.
- Sửa owner scope cho CUSTOMER ở API đọc danh sách/chi tiết ngựa, giới hạn CUSTOMER sửa danh mục locations, và kiểm tra quyền sở hữu request khi CUSTOMER tạo quarantine reservation.
- Bổ sung role guard cho các thao tác quarantine và test authorization ở HTTP layer.
- Expose `AssignmentService` hiện hữu qua API Spring và tích hợp tạo/hủy phân công trong trang chi tiết transport plan.
- Giữ frontend Next.js; bỏ cấu hình bỏ qua TypeScript. TypeScript của ứng dụng chính đã kiểm tra thành công; ví dụ độc lập `examples/websocket` được loại khỏi phạm vi app do thiếu hai package socket.io.
- Cập nhật tài liệu hiện trạng và runbook.

Chưa:

- Xác minh API/browser runtime: ngày kiểm tra, cả `localhost:3000` và `localhost:8080` đều từ chối kết nối.
- Port hoặc loại bỏ 46 Next.js Route Handlers/Prisma/SQLite; chúng vẫn là API surface riêng và một số nghiệp vụ chưa có hợp đồng Spring tương đương.
- Hoàn thiện Driver/Escort scoped reads, readiness, document verification, request cancel/claim, gói dịch vụ/chuồng/chi phí, delivery signature hoặc payment gateway.
- Chứng minh SQL Server hiện tại là database dev riêng; không gửi request ghi, chạy migration hay seed.

## B. Danh sách file thay đổi

| File | Hành động | Nội dung thay đổi | Lý do / ảnh hưởng |
|---|---|---|---|
| `backend/src/main/java/com/equiflow/controller/HorseController.java` | Sửa | Truyền user ID/role vào service cho GET list/detail | Không còn đường đọc ngựa CUSTOMER không lọc |
| `backend/src/main/java/com/equiflow/service/HorseService.java` | Sửa | CUSTOMER list dùng owner query; detail của chủ khác trả 404 | Chống truy cập bằng cách đổi ID |
| `backend/src/main/java/com/equiflow/security/SecurityConfig.java` | Sửa bổ sung | CUSTOMER vẫn có GET horse nhưng bị lọc ở service; CUSTOMER bị bỏ khỏi POST/PUT locations; thêm role rules quarantine/assignment | Authorization phía backend; file đã có thay đổi staged trước task nên phần hiện hữu được giữ nguyên |
| `backend/src/main/java/com/equiflow/controller/QuarantineReservationController.java` | Sửa | Truyền principal/role khi tạo reservation | Cho phép service kiểm tra owner |
| `backend/src/main/java/com/equiflow/service/QuarantineReservationService.java` | Sửa | CUSTOMER chỉ tạo lịch trên request của mình; staff operations được giới hạn tại SecurityConfig | Tránh reservation dựa vào ID request của người khác |
| `backend/src/main/java/com/equiflow/controller/AssignmentController.java` | Tạo | GET assignments/options, POST assignment, PUT/DELETE assignment | Dùng service/table hiện hữu; không tạo bảng hoặc mô hình phân công thứ hai |
| `backend/src/main/java/com/equiflow/dto/AssignmentDto.java` | Sửa | Thêm DTO tối giản cho lựa chọn asset/crew | Không trả toàn bộ User cho màn hình phân công |
| `backend/src/main/java/com/equiflow/service/AssignmentService.java` | Sửa | Cung cấp option ID/tên/trạng thái cho plan | Tái sử dụng validation và conflict checks hiện có |
| `backend/build.gradle` | Sửa | Thêm Spring test, Spring Security test, JUnit Platform launcher và cấu hình JUnit Platform | Cho phép chạy test backend thực tế |
| `backend/src/test/java/com/equiflow/service/HorseServiceTest.java` | Tạo | 2 test owner filtering và chặn đọc ID của chủ khác | Kiểm tra service-level ownership |
| `backend/src/test/java/com/equiflow/security/ApiAuthorizationTest.java` | Tạo | 5 test HTTP role: đọc/ghi location, quarantine và tạo assignment | Kiểm tra role rules với MockMvc |
| `frontend/src/components/views/coordinator/transport-plan-detail.tsx` | Sửa | Đọc assignment/options, tạo assignment, yêu cầu xác nhận trước khi hủy; hiển thị lỗi/thành công | Nối coordinator UI với Spring API thật |
| `frontend/src/components/views/customer/customer-dashboard.tsx` | Sửa | Dùng lại các API Spring hiện có, thêm retry khi tải lỗi | Không có `/dashboard` giả; API mapping đã có trong source trước task, lượt này bổ sung retry |
| `frontend/next.config.ts` | Sửa | Bỏ `typescript.ignoreBuildErrors` | Build không còn che lỗi TypeScript |
| `frontend/tsconfig.json` | Sửa | Loại ví dụ độc lập `examples/websocket` khỏi project app | Ví dụ không thuộc luồng Next chính và đang thiếu `socket.io`/`socket.io-client` |
| `frontend/.env.example` | Sửa | Thêm `NEXT_PUBLIC_API_BASE_URL` mẫu trỏ backend Spring local | Làm rõ cấu hình URL, không chứa secret |
| `frontend/docs/api-mapping.md` | Sửa | Ghi cập nhật source hiện tại, assignment endpoints và giới hạn runtime | Không nhầm dữ liệu lịch sử với kết quả mới |
| `frontend/docs/demo-flow-implementation.md` | Sửa | Ghi thay đổi security/assignment/prototype và trạng thái hiện tại | Cập nhật flow và các giới hạn chưa xong |
| `frontend/docs/demo-runbook.md` | Sửa | Đánh dấu runtime 2026-10-22 không phản hồi; cập nhật assignment source | Không hướng dẫn demo như thể runtime đang sẵn sàng |
| `frontend/docs/repair-report-2026-10-22.md` | Tạo | Báo cáo này | Deliverable theo yêu cầu |
| `frontend/backend/` | Xóa | 16 file source/config/test, output `target/` và thư mục rỗng | Loại prototype Spring Boot/SQLite; không có import/reference từ UI cần chuyển |

Backend có thay đổi **đã staged trước task** trong `UserController.java`, `RegisterRequest.java`, `GlobalExceptionHandler.java`, `UserService.java`, và một phần `SecurityConfig.java`. Các thay đổi đó không bị hoàn nguyên hoặc viết đè. `backend/database/` và một tệp chưa theo dõi khác trong backend cũng được giữ nguyên; không thuộc phần sửa hiện tại. Không commit/push.

Các file chỉ được kiểm tra, không chỉnh: Next Route Handlers, `prisma/schema.prisma`, Prisma client helper, controllers/services khác, cấu hình SQL Server, các file migration và dữ liệu SQL.

## C. Backend mock đã loại bỏ

Đã xóa `frontend/backend/` prototype riêng (Spring Boot 3.5.7, Java 21, SQLite, port 8081), gồm:

- `CheckDb.java`, `pom.xml`.
- `EquideliApplication.java`.
- `CorsConfig.java`, `DatabaseLocationGuard.java`, `SecurityConfig.java`.
- `HealthController.java`.
- Các `package-info.java` placeholder trong dto/entity/exception/repository/security/service.
- `application.properties`.
- `DatabaseLocationGuardTest.java`, `HealthControllerTest.java`.
- Các artifact Maven đã sinh trong `target/`.

Không có component frontend gọi backend prototype này; UI active dùng `src/lib/api-client.ts` gọi backend gốc. Logic đăng ký/health trong prototype không được chuyển vì không cung cấp nghiệp vụ Spring cần giữ. Không xóa `frontend/src/app/api/**`, Prisma schema/client hoặc Prisma dependencies: đó là 46 Next Route Handlers khác, có chức năng riêng và chưa được port đầy đủ. Chúng vẫn là **đường persistence song song còn tồn tại**, không phải một phần đã hoàn thành của cleanup kiến trúc.

## D. Tích hợp API

| Chức năng | API trước đây / source cũ | API Spring sau sửa | Frontend | Backend | Kiểm thử |
|---|---|---|---|---|---|
| Customer dashboard | Một component legacy từng gọi `/dashboard`; dashboard active trong source đã tổng hợp API thật | `GET /api/transport-requests/my`, `/api/horses/my-horses`, `/api/my/invoices` | `customer-dashboard.tsx` | Controllers hiện hữu | TypeScript/build; chưa runtime |
| Danh sách/detail ngựa | `GET /api/horses` và `/{id}` trước đây cho phép CUSTOMER nhưng service không lọc owner | Giữ endpoints; CUSTOMER được lọc theo user ID; chủ khác trả 404 | `horse-list.tsx`, `horse-detail.tsx` dùng API client | `HorseController`, `HorseService`, `SecurityConfig` | 2 unit tests service; chưa gọi API live |
| Sửa locations | CUSTOMER từng được phép POST/PUT danh mục dùng chung | GET giữ nguyên; POST/PUT chỉ ADMIN, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST | Không có thay đổi UI | `SecurityConfig` | MockMvc kiểm tra CUSTOMER bị 403 và manager được phép; chưa live |
| Quarantine reservation | Route mặc định cho mọi authenticated; create không nhận user | CUSTOMER create chỉ với request sở hữu; chỉ staff được sửa/xóa/chuyển status; customer GET vẫn lọc owner | Chưa có UI mới | Controller/service/security hiện hữu | MockMvc kiểm tra customer không được PUT; chưa test runtime |
| Assignment | `AssignmentService` không có controller; legacy trip component gọi `/api/trips/**` không khớp Spring | `/api/transport-plans/{id}/assignments`, `/assignment-options`; `/api/transport-assignments/{id}` | Chi tiết plan có list/options/create/cancel cho Coordinator | `AssignmentController`, `AssignmentService` | Build/typecheck/lint và role test MockMvc; không gọi runtime/DB |
| Driver/Escort trip | Legacy `/api/trips/**`; chưa có scope đọc assignment đầy đủ ở Spring | Không ánh xạ sang `/api/transport-plans/**` và chưa mở reads cho Driver/Escort | Router tiếp tục chặn | Các API scope chưa đủ | Chưa kiểm thử runtime |
| Next API + Prisma | 46 Next Route Handlers dùng Prisma/SQLite | Từng endpoint cần port riêng; đã có tương đương một phần cho auth, horse, locations, requests, plans, assets, inspections, invoices | Không thấy gọi trực tiếp bằng `fetch("/api/...")` từ UI component trong lượt tìm kiếm; handlers vẫn public qua Next | Spring tương đương một phần; thiếu options/review/history/trips/recovery/notifications/search/payment history | Giữ nguyên; cleanup chưa hoàn tất |

## E. Chức năng đã sửa

### 1. Owner scope hồ sơ ngựa

- **Vấn đề:** CUSTOMER được phép GET list/detail nhưng service trả hồ sơ không lọc.
- **Giải pháp:** controller chuyển principal/role; service dùng truy vấn owner cho list và trả 404 nếu horse detail không thuộc caller. Staff giữ phạm vi hiện tại.
- **Kiểm thử:** `HorseServiceTest` có test dùng owner-scoped repository method và test ID của chủ khác bị từ chối; pass. HTTP runtime chưa thử.

### 2. Locations và quarantine

- **Vấn đề:** CUSTOMER có thể thay đổi locations; quarantine mutation chỉ cần authenticated.
- **Giải pháp:** location writes giới hạn staff. Quarantine có matcher cụ thể; customer tạo lịch phải sở hữu request; cập nhật/xóa/status chỉ staff.
- **Kiểm thử:** MockMvc xác nhận quyền CUSTOMER deny và LOGISTICS_MANAGER create location allow; pass. MockMvc xác nhận CUSTOMER không PUT quarantine; pass. Chưa xác minh quyền trên process/backend runtime.
- **Giới hạn:** quyền staff quarantine được giới hạn ở ADMIN/LOGISTICS_MANAGER/TRANSPORT_SPECIALIST dựa trên vai trò hiện hữu; cần nghiệp vụ chủ hệ thống xác nhận role ownership cuối cùng nếu có chính sách khác.

### 3. Assignment

- **Vấn đề:** entity/service/validation có sẵn nhưng không có REST controller và plan detail không có action.
- **Giải pháp:** expose GET/POST/PUT/DELETE; chỉ Fleet Coordinator được ghi và xem assignment options. Options chỉ trả ID/tên/status; service hiện có kiểm tra trạng thái maintenance, role DRIVER_ESCORT, trùng nhân sự/tài sản/lịch. UI active có list, thêm và hủy với confirm.
- **Kiểm thử:** backend compile/test, frontend typecheck/build/lint chọn lọc pass; MockMvc chặn CUSTOMER và cho phép role Coordinator vào API create. Không kiểm thử transaction, notification, conflict với SQL Server thật.
- **Giới hạn:** UI hiện không sửa assignment đã có; endpoint PUT được expose nhưng chưa dùng trong UI. Chưa mở Driver/Escort reads hoặc readiness.

### 4. Customer dashboard và TypeScript

- Dashboard source dùng endpoint Spring hiện hữu, không gọi `/api/dashboard`; thêm trạng thái retry khi lỗi. Không thêm dữ liệu fallback.
- Xóa cấu hình build bỏ qua type errors; typecheck/build đã pass khi không đưa sample websocket vào ứng dụng chính. Sample vẫn thiếu hai socket.io imports.

## F. Các thay đổi backend và comment

- `HorseController.getAll/getById`: yêu cầu Authentication để chuyển scope vào service.
- `HorseService.findAll/findById`: CUSTOMER list/detail được giới hạn ownership; trả 404 khi detail thuộc chủ khác để không tiết lộ record tồn tại. Comment giải thích owner scope được áp dụng ở service.
- `SecurityConfig`: bỏ CUSTOMER khỏi writes locations; khai báo rõ role của quarantine và assignment. Các thay đổi staged trước đó trong cùng file vẫn còn.
- `QuarantineReservationController.create` và `QuarantineReservationService.create`: truyền current user/role; ownership được kiểm tra trước khi xác nhận request đã approved. Comment nêu điều kiện customer.
- `AssignmentController`: REST layer mỏng, sử dụng `AssignmentService`; không thêm persistence/model mới.
- `AssignmentService.options`: xác minh plan tồn tại rồi chỉ xuất danh sách asset và DRIVER_ESCORT tối thiểu cần cho form.
- `AssignmentDto`: các option không trả thông tin User nhạy cảm; giữ DTO response assignment đã có.
- Không sửa repository/entity/schema/SQL migration cho assignment; dùng bảng/entity hiện hữu.

## G. Bảo mật và phân quyền

- Đã có test HTTP role cho:
  - CUSTOMER GET locations được phép.
  - CUSTOMER POST/PUT locations bị từ chối.
  - LOGISTICS_MANAGER POST locations được phép.
  - CUSTOMER PUT quarantine bị từ chối.
  - CUSTOMER POST assignment bị từ chối; FLEET_COORDINATOR được phép.
- Có unit tests service cho horse owner scope.
- Chưa test trực tiếp bằng JWT thật, SQL Server, credential demo hoặc role khác trên runtime.
- `GET /api/horses` vẫn cho phép CUSTOMER theo matcher nhưng service áp owner filtering. `/api/horses/my-horses` giữ query riêng.
- Assignment list/options không cho CUSTOMER hoặc Driver/Escort; không có IDOR scope Driver vì chưa mở các reads đó.
- Rủi ro chưa xử lý: 46 Next.js API handlers Prisma có thể tiếp tục phục vụ dữ liệu SQLite độc lập; phải port/retire theo API cụ thể sau khi xác định consumer và contract. Không đổi ADMIN role.

## H. Kết quả build và test

| Hạng mục | Lệnh | Kết quả mới trong task | Lỗi còn lại |
|---|---|---|---|
| Frontend build | `npm run build` trong `frontend` | Thành công; Next chạy TypeScript validation, không còn bỏ qua | Không xác minh runtime |
| Frontend TypeScript | `npx tsc --noEmit` | Thành công cho ứng dụng chính | `examples/websocket` bị exclude; nếu type-check riêng vẫn thiếu `socket.io` và `socket.io-client` |
| Frontend lint toàn bộ | `npm run lint` | Thất bại với 7 lỗi | Các lỗi `react-hooks/set-state-in-effect` ở `ui/carousel.tsx`, `views/coordinator/plan-detail.tsx` (2), `views/shared/trip-detail.tsx` (3), `hooks/use-mobile.ts`; không phải file sửa trong lượt này |
| Frontend lint chọn lọc | `npx eslint src/components/views/customer/customer-dashboard.tsx src/components/views/coordinator/transport-plan-detail.tsx` | Thành công | Không áp dụng tới các component legacy |
| Backend test | `.\gradlew.bat test --rerun-tasks` trong `backend` | Thành công: 7 tests, 0 failures/errors/skipped | Không kết nối SQL Server; các test là unit/MockMvc |
| Backend build | `.\gradlew.bat build` trong `backend` | Thành công trước lần cập nhật cuối test; test final sau đó đã rerun thành công | Cần chạy build lại một lượt sau báo cáo nếu muốn nghiệm thu nguyên khối cuối |
| API/browser runtime | Probe `localhost:3000`, `localhost:8080`; tab browser chia sẻ | Không kết nối; tab trả `chrome-error://chromewebdata/` | Không có HTTP response nghiệp vụ mới |

## I. Database và migration

- Không sửa schema, dữ liệu, seed hoặc SQL migration; không chạy migration/seed/SQL.
- Không gửi request ghi vào SQL Server.
- File migration đã có/untracked dưới `backend/database/` được giữ nguyên; không có thay đổi đối với nó.
- Assignment tái sử dụng bảng `transport_assignments`. Không thêm cột/bảng.
- Các chức năng request cancellation, compensation, service packages/quote breakdown, stall options, document reviewer/verifier, payment transaction history, delivery signature upload và veterinarian vẫn thiếu API/schema hoặc quy tắc đủ căn cứ.

## J. Việc cần tiếp tục

1. **P0 — Xác định runtime/database thử nghiệm:** khởi động services theo mục K bằng owner môi trường; xác nhận SQL Server là DB dev riêng trước khi gửi mutation.
2. **P1 — Runtime authorization:** dùng test accounts đã được cấp phép để thử horse IDOR, location 403, quarantine ownership, assignment CRUD/conflict; không dùng DB shared.
3. **P1 — Next API/Prisma:** inventory consumer và port hoặc retire từng trong 46 handler; không xóa toàn bộ trước khi thay thế consumer và auth.
4. **P1 — Driver/Escort:** bổ sung assignment-scoped reads cho plan, route stops, tracking, health, incidents, delivery; sau đó mới mở dashboard/detail và write flows.
5. **P1 — Readiness:** định nghĩa/triển khai đủ điều kiện readiness bằng plan, assets, staff, route, compliance; assignment có alone không đồng nghĩa ready.
6. **P2 — Nghiệp vụ chưa có quy tắc:** chờ quyết định về hủy/hoàn tiền, bồi thường, giới hạn escort, cấu hình chuồng, pricing, document verification, payment, veterinarian.
7. **P2 — Lint baseline:** sửa riêng 7 hook lint errors ở các file chưa chỉnh; không tắt rule.
8. **P2 — Sample websocket:** hoặc thêm dependency đúng scope cho sample độc lập, hoặc giữ ngoài frontend app build và ghi hướng dẫn chạy riêng; không cài dependency tùy tiện.

## K. Hướng dẫn chạy hệ thống

1. Xác nhận SQL Server và `HorseTransportManagementDB` thuộc môi trường development được phép ghi; cấu hình username/password qua thiết lập local hiện có, không ghi credential vào source.
2. Terminal backend:

   ```powershell
   Set-Location C:\Equideli\backend
   .\gradlew.bat bootRun
   ```

3. Terminal frontend:

   ```powershell
   Set-Location C:\Equideli\frontend
   npm run dev
   ```

   Frontend mặc định gọi `http://localhost:8080`; nếu cần override, đặt `NEXT_PUBLIC_API_BASE_URL` trong local environment trước khi chạy. Biến `NEXT_PUBLIC_*` không được chứa secret.

4. Mở `http://localhost:3000`; đăng nhập bằng credential được cấp phép. Backend hiện không có health endpoint chuyên biệt; không dùng `GET /` làm kiểm tra health vì có thể trả 401. Chỉ dùng `/api/auth/me` sau đăng nhập để xác nhận session, hoặc gọi API read phù hợp role.
5. Lệnh kiểm tra:

   ```powershell
   Set-Location C:\Equideli\frontend
   npm run build
   npx tsc --noEmit
   npm run lint
   ```

   ```powershell
   Set-Location C:\Equideli\backend
   .\gradlew.bat test
   .\gradlew.bat build
   ```

   Các test build không thay thế kiểm thử API runtime, role/ownership trên DB test riêng hoặc browser end-to-end.
