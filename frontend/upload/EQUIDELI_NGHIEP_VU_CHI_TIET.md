# EQUIDELI — Đặc tả nghiệp vụ chi tiết cho 50 màn hình

**Dùng kèm:** prompt tổng thể cho Z.ai Agent, bộ giao diện Google Stitch hiện tại, `HorseTransportManagementDB.sql` và tài liệu REQ đang có.

**Mục tiêu tài liệu:** chuyển giao diện từ các màn hình tĩnh thành ứng dụng có luồng nghiệp vụ nhất quán, dữ liệu liên kết, phân quyền, kiểm tra điều kiện và trạng thái rõ ràng. Đây là đặc tả nghiệp vụ đề xuất cho đồ án; các quy định thú y, kiểm dịch, nhập khẩu, xuất khẩu, quá cảnh và vận tải phải được cấu hình theo tuyến/cặp quốc gia và được người có trách nhiệm xác minh, không được coi các ví dụ trong tài liệu này là tư vấn pháp lý hoặc chứng nhận tuân thủ.

---

## 1. Nguyên tắc đọc tài liệu và xử lý mâu thuẫn

1. Ưu tiên bộ Stitch **đang được người dùng xác nhận là phiên bản hiện tại**, danh sách 50 màn hình hiện tại, `HorseTransportManagementDB.sql` thực tế và REQ mới nhất. Không suy ra rằng một màn hình đã tồn tại chỉ vì tài liệu cũ có ghi tên màn hình đó.
2. Một số tài liệu đầu vào cũ có thể ghi **EQUIFLOW**, 40 màn hình hoặc 49 màn hình. Không tự động đổi tên, xóa, thêm, nhân bản hoặc đánh số lại màn hình để khớp tài liệu cũ. Lập `docs/source-conflicts.md`, ghi rõ xung đột và đề xuất cách xử lý. Khi được yêu cầu bảo toàn 50 màn hình, không tự ý sinh thêm màn hình thứ 51.
3. Trước khi viết mã, kiểm tra toàn bộ workspace, các file Stitch, REQ và schema SQL. Lập ma trận 50 màn hình → vai trò → thao tác → API → bảng/cột hiện có → quy tắc nghiệp vụ → kiểm thử.
4. Không tuyên bố đã làm xong chỉ vì màn hình React đã được tạo. Một tính năng chỉ được đánh dấu hoàn thành khi các thao tác chính chạy được, kiểm tra quyền và dữ liệu đúng, trạng thái được lưu, tải lại trang vẫn còn dữ liệu và có kiểm thử phù hợp.
5. Không chạy script SQL có `DROP DATABASE`, xóa dữ liệu, tạo lại database hoặc thay đổi schema phá hủy trên môi trường hiện có. Lưu SQL gốc nguyên trạng và tạo migration có kiểm soát nếu cần.
6. Không bịa cột/bảng/API trước khi đọc SQL. Nếu schema thiếu chức năng cần thiết, đề xuất migration riêng, giải thích quan hệ và chờ quy trình triển khai an toàn; không tự sửa file SQL gốc.
7. Ngôn ngữ UI là tiếng Việt có dấu. Giữ nguyên các mã kỹ thuật, email, RFID, IATA, LAR, ATA Carnet, FEI và tên riêng cần thiết. Không dùng tiếng Anh cho nút, trạng thái hoặc thông báo thông thường.

## 2. Mục tiêu nghiệp vụ

EQUIDELI quản lý việc đưa ngựa đua từ nơi xuất phát qua các chặng đường bộ, sân bay/cảng, chặng vận tải quốc tế, nơi kiểm dịch và địa điểm nhận ngựa. Hệ thống phải giúp các bên biết:

- Ngựa nào đang được vận chuyển, vì mục tiêu thi đấu nào và cần có mặt muộn nhất vào lúc nào.
- Hồ sơ nhận dạng, sức khỏe, kiểm dịch, giấy phép và thủ tục của từng tuyến đã đủ hay còn thiếu; ai đang xác minh và giấy tờ nào sắp hết hạn.
- Phương án nào phù hợp về tuyến, phương thức vận chuyển, thời gian, cấu hình chuồng và chi phí; vì sao phương án được khuyến nghị.
- Phương tiện, chuồng, nhân sự, điểm dừng, lịch bay/lịch chặng và lịch cách ly có khả thi, không trùng lịch hay không.
- Mốc hành trình gần nhất do nhân viên cập nhật thủ công, dự kiến đến, nguy cơ trễ, tình trạng ngựa, sự cố và quyết định xử lý.
- Ai đã làm gì, vào thời điểm nào, dựa trên dữ liệu nào; các thay đổi ảnh hưởng đến lịch, giấy tờ, chi phí hoặc khả năng tham gia giải phải có dấu vết.

### Ngoài phạm vi mặc định

- Không có định vị GPS thời gian thực. Nhân viên/tài xế cập nhật mốc và vị trí thủ công; bản đồ nếu có chỉ là sơ đồ tuyến và các điểm dự kiến.
- Không có thanh toán trực tuyến.
- Không có OCR tự động đọc giấy tờ. Chuyên viên kiểm tra thủ công và ghi kết quả.
- Không có chẩn đoán thú y tự động. Hệ thống ghi nhận chỉ số, hiển thị ngưỡng cảnh báo đã cấu hình và yêu cầu người có chuyên môn xử lý.
- Không có vai trò `Administrator` riêng. Chỉ sử dụng 5 vai trò nội bộ/khách hàng dưới đây.
- Không cần một màn hình lịch thi đấu độc lập nếu phiên bản hiện tại không có màn hình đó. Thông tin giải đấu, giờ thi đấu, hạn có mặt và thời gian hồi phục có thể hiển thị trong hồ sơ ngựa, yêu cầu, báo giá, trang tổng quan và bảng rủi ro.

## 3. Năm vai trò và ranh giới trách nhiệm

### 3.1 Khách hàng (Customer)
Có thể quản lý hồ sơ ngựa thuộc tài khoản/trang trại của mình; lập và gửi yêu cầu; xem báo giá; chọn phương án khả thi; tải giấy tờ; theo dõi mốc do đội vận chuyển cập nhật; xem thông báo; gửi đánh giá/feedback. Không được tự duyệt hồ sơ pháp lý, tự sửa dữ liệu hành trình do nhân viên ghi nhận, thay đổi lịch/chi phí sau khi đã chốt mà không qua quy trình yêu cầu thay đổi, hoặc xem dữ liệu của khách hàng khác.

### 3.2 Logistics Manager
Quản lý hàng đợi yêu cầu, mức ưu tiên, quyết định thương mại/nghiệp vụ trong phạm vi quyền, đánh giá rủi ro tổng thể, phê duyệt kế hoạch/chi phí phát sinh theo quy trình, theo dõi KPI, đối tác/bảng giá tham chiếu và nhân sự. Không được bỏ qua cảnh báo thú y/kiểm dịch bắt buộc; trường hợp bị chặn phải yêu cầu khắc phục hoặc quyết định dừng/hủy theo quy trình được ghi nhận.

### 3.3 Transport Specialist
Thẩm định hồ sơ ngựa, giấy tờ thú y, điều kiện xuất/nhập/quá cảnh, quy định theo quốc gia/cửa khẩu, lịch cách ly và khoảng thời gian hồi phục cần thiết. Có thể yêu cầu bổ sung, xác nhận đạt/chưa đạt, ghi chú căn cứ và thời điểm cần rà soát lại. Không tự thay đổi giá thương mại hay tự phân xe/tài xế nếu không được giao quyền đó.

### 3.4 Fleet & Route Coordinator (Điều phối viên tuyến đường)
Lập tuyến/chặng, phân bổ phương tiện, cấu hình chuồng, nhân sự và điểm dừng; kiểm tra khả năng đáp ứng lịch, giới hạn phương tiện, vệ sinh/khử trùng, sức chứa và xung đột lịch. Ghi nhận bàn giao, kiểm tra phương tiện và xử lý sự cố hiện trường bước đầu. Không xác nhận thay chuyên viên về giấy tờ thú y và không tự phê duyệt khoản chi vượt quyền.

### 3.5 Driver / Escort (Tài xế / Hộ tống)
Chỉ xem các chuyến được giao, ngựa trong chuyến, hướng dẫn vận chuyển và checklist; cập nhật các mốc thủ công, ghi nhận tình trạng ngựa, lượng nước/thức ăn, kiểm tra chuồng/xe, báo sự cố/SOS và xác nhận bàn giao. Không được sửa hồ sơ gốc của ngựa, giấy phép, giá báo hoặc phân công của chuyến.

### 3.6 Quy tắc phân quyền chung
- Mặc định từ chối truy cập nếu không xác minh được người dùng có quyền với bản ghi.
- Khách hàng chỉ xem ngựa, đơn, báo giá, file và thông báo thuộc tài khoản của mình.
- Driver/Escort chỉ xem chuyến được phân công và dữ liệu tối thiểu cần cho chuyến đó.
- Những thao tác quan trọng (duyệt/từ chối, đổi tuyến, đổi cấu hình chuồng, đổi nhân sự, thay đổi giá, đóng sự cố, bàn giao hoàn tất) phải lưu người thao tác, thời điểm, giá trị trước/sau và lý do.
- Không thiết kế một bộ chọn vai trò ở màn hình đăng nhập. Vai trò và quyền được lấy từ tài khoản đã xác thực.

## 4. Các đối tượng dữ liệu nghiệp vụ chính

Các tên dưới đây là **khái niệm nghiệp vụ**, không phải yêu cầu tạo bảng trùng tên. Z.ai phải ánh xạ sang schema thực tế trước khi tạo migration.

1. **Tài khoản và tổ chức khách hàng:** thông tin đăng nhập, liên hệ, trang trại/đơn vị, vai trò, trạng thái hoạt động.
2. **Hồ sơ ngựa:** mã ngựa, tên, RFID/microchip nếu có, số hộ chiếu, giống, giới tính, ngày sinh/tuổi, cân nặng, kích thước liên quan, tiền sử sức khỏe, dị ứng, tính khí, hành vi khi lên/xuống phương tiện, yêu cầu xử lý đặc biệt, người sở hữu và lịch sử thay đổi.
3. **Giải đấu/sự kiện mục tiêu:** tên, địa điểm, quốc gia, thời điểm bắt đầu, thời điểm ngựa phải có mặt theo yêu cầu, thời gian hồi phục tối thiểu đã được xác nhận, ghi chú và tài liệu xác nhận tham gia nếu có. Sự kiện có thể là dữ liệu gắn với hồ sơ ngựa/yêu cầu; không bắt buộc tạo màn hình lịch riêng.
4. **Yêu cầu vận chuyển:** khách hàng, ngựa, điểm đi/đến, quốc gia quá cảnh, sự kiện mục tiêu, giờ thi đấu, hạn có mặt, số giờ hồi phục cần thiết, lựa chọn dịch vụ, mức ưu tiên, trạng thái, thông tin liên hệ, yêu cầu đặc biệt, lịch sử phê duyệt.
5. **Giấy tờ:** loại, áp dụng cho ngựa/chặng/quốc gia nào, đơn vị cấp, số hiệu, ngày cấp, ngày hết hạn, phiên bản file, trạng thái kiểm tra, người kiểm tra, ghi chú và lịch sử thay đổi. Không mặc định mọi loại giấy đều bắt buộc trên mọi tuyến.
6. **Bộ quy tắc quốc gia/tuyến:** nước xuất phát, quá cảnh, đến; cửa khẩu/sân bay/cảng; giấy tờ, xét nghiệm, tiêm phòng, kiểm dịch, điều kiện thời hạn, nguồn tham khảo, ngày hiệu lực, ngày rà soát, người xác minh. Quy tắc phải có trạng thái: bản nháp, đang xác minh, đang áp dụng, hết hiệu lực.
7. **Phương án và báo giá:** tuyến, phương thức/chặng, nhà cung cấp, cấu hình chuồng, dịch vụ, thời gian dự kiến, giả định tính giá, các hạng mục chi phí, thời hạn hiệu lực, phiên bản và trạng thái chấp thuận.
8. **Phương tiện và cấu hình chuồng:** loại phương tiện, sức chứa theo cấu hình, giới hạn khối lượng/kích thước, thiết bị, trạng thái sẵn sàng, lịch sử vệ sinh/khử trùng, thời gian bảo trì và lịch sử sử dụng.
9. **Kế hoạch chuyến:** đơn liên quan, các chặng có thứ tự, lịch dự kiến, điểm dừng, phương tiện, tài xế/hộ tống, điều phối viên, dự phòng, ETA, trạng thái và phiên bản kế hoạch.
10. **Mốc hành trình:** thời gian sự kiện, địa điểm được nhân viên chọn/ghi tay, trạng thái, người cập nhật, ghi chú, tệp đính kèm, thời gian dự kiến/ thực tế. Không giả lập dữ liệu GPS như thể là trực tiếp.
11. **Nhật ký sức khỏe:** thời điểm, ngựa, người ghi, chỉ số/quan sát, ăn uống, nước, hành vi, dấu hiệu bất thường, hình ảnh, hành động đã thực hiện và người đã được thông báo. Chỉ số cảnh báo được cấu hình/duyệt, không tự chẩn đoán.
12. **Sự cố:** loại, mức độ khẩn cấp, vị trí/mốc được ghi thủ công, ngựa/chuyến ảnh hưởng, mô tả, ảnh/chứng cứ, người nhận cảnh báo, biện pháp tạm thời, chi phí dự kiến/thực tế, người phê duyệt, quyết định về tuyến/lịch và kết quả đóng sự cố.
13. **Lịch cách ly/kiểm dịch:** cơ sở, sức chứa, thời gian bắt đầu/kết thúc, yêu cầu áp dụng, tình trạng đặt chỗ/xác nhận, kết quả kiểm tra và điều kiện giải phóng.
14. **Bàn giao:** địa điểm, thời điểm, người giao/nhận, danh sách ngựa, tình trạng ngựa, tình trạng chuồng/niêm phong, hồ sơ kèm theo, ảnh/biên bản và xác nhận của các bên.
15. **Thông báo/nhật ký kiểm toán:** sự kiện phát sinh, người nhận, thời gian, trạng thái đã đọc, bản ghi liên quan, hành động tiếp theo, cùng người thao tác và dữ liệu trước/sau cho hành động quan trọng.

## 5. Luồng nghiệp vụ đầu-cuối

### Luồng A — Tạo yêu cầu và chốt phương án
1. Khách hàng tạo hoặc chọn hồ sơ ngựa đã có.
2. Nhập điểm đi, điểm đến, các nước quá cảnh dự kiến nếu biết, mục đích, sự kiện mục tiêu, giờ bắt đầu thi đấu, giờ phải có mặt, thời gian hồi phục cần thiết và thông tin liên hệ.
3. Hệ thống kiểm tra dữ liệu bắt buộc, quyền sở hữu ngựa và tính hợp lý thời gian. Nếu chưa biết trường nào, ghi “chưa xác nhận” và yêu cầu chuyên viên kiểm tra; không tự đoán.
4. Hệ thống đưa ra các lựa chọn dịch vụ có thể đáp ứng theo dữ liệu hiện có. Hiển thị tối đa 3 phương án khả thi nếu có đủ dữ liệu; nếu chỉ có 1–2 phương án thì chỉ hiện số đó; nếu không có phương án khả thi phải nói rõ lý do và không tạo lựa chọn giả.
5. Mỗi phương án cần nêu: tuyến/chặng, phương thức, ETA, ngày cần có mặt, thời gian hồi phục dự kiến, cấu hình chuồng dự kiến, giả định về giấy tờ/kiểm dịch, chi phí tham khảo chi tiết và phần chưa được xác nhận.
6. Giá mô phỏng phải gắn nhãn “Giá tham khảo/mô phỏng cho đồ án”, có phiên bản và thời hạn hiệu lực; không hiển thị như báo giá chính thức của hãng vận tải.
7. Khách hàng chọn phương án và gửi yêu cầu. Việc gửi yêu cầu không đồng nghĩa yêu cầu đã được phê duyệt hay đã có chỗ vận tải chắc chắn.

### Luồng B — Kiểm tra đơn, giấy tờ và tuân thủ
1. Logistics Manager rà soát mức độ hoàn chỉnh, tính khả thi thương mại, mức ưu tiên và các thông tin cần bổ sung.
2. Transport Specialist xác minh danh sách giấy tờ theo **tuyến cụ thể**: nước xuất phát, từng nước quá cảnh, nước đến, cửa khẩu và loại hình di chuyển. Mỗi yêu cầu giấy tờ cần nguồn/căn cứ, thời hạn hiệu lực, ai xác minh và ngày rà soát.
3. Tài liệu do khách hàng tải lên ở trạng thái “Chờ kiểm tra”, không tự chuyển sang “Đạt”. Chuyên viên có thể đánh dấu “Hợp lệ”, “Cần bổ sung”, “Không hợp lệ” hoặc “Không áp dụng cho tuyến này”, kèm lý do.
4. Nếu cần bổ sung, gửi thông báo rõ loại giấy tờ, vấn đề, người cần xử lý và hạn bổ sung. Lần tải lên mới tạo phiên bản mới, không xóa lịch sử cũ.
5. Nếu có giấy tờ hết hạn, kiểm dịch chưa đặt/hoàn thành hoặc điều kiện thú y chưa được xác minh, hệ thống phải chặn bước khởi hành hoặc chuyển sang trạng thái “Chưa đủ điều kiện”; không có nút bỏ qua điều kiện bắt buộc.
6. Sau khi hồ sơ phù hợp, Logistics Manager quyết định bước phê duyệt yêu cầu và cho phép lập kế hoạch. Dấu vết thẩm định phải có người/giờ/căn cứ.

### Luồng C — Lập kế hoạch và điều phối
1. Coordinator tạo phiên bản kế hoạch gồm các chặng theo thứ tự: lấy ngựa → điểm tập kết/quarantine nếu áp dụng → sân bay/cảng → vận tải quốc tế → cửa khẩu đến → kiểm dịch sau nhập khẩu nếu áp dụng → nơi bàn giao.
2. Mỗi chặng có điểm đi/đến, giờ dự kiến, phương thức, đối tác, tài sản/phương tiện, người phụ trách, điều kiện chuyển tiếp và khoảng thời gian dự phòng.
3. Kiểm tra xung đột lịch của phương tiện, tài xế/hộ tống, cơ sở cách ly, cửa sổ tiếp nhận và thời gian xử lý giấy tờ. Không phân bổ cùng một tài nguyên cho hai chặng trùng giờ nếu chưa có cơ chế giải phóng lịch rõ ràng.
4. Kiểm tra sức chứa, kích thước/cân nặng ngựa và cấu hình chuồng được phép của phương tiện/đối tác. Không mặc định mọi loại chuồng phù hợp với mọi loại hình vận tải.
5. Nếu thay đổi tuyến, phương thức, giờ, phương tiện, nhân sự hoặc cấu hình chuồng, tạo phiên bản kế hoạch mới và chạy lại các kiểm tra ảnh hưởng: ETA, hạn có mặt, thời gian hồi phục, giấy tờ, kiểm dịch, giá và lịch nguồn lực.
6. Logistics Manager duyệt kế hoạch theo quyền và quy trình. Kế hoạch bị từ chối phải có lý do, quay về Coordinator chỉnh sửa.

### Luồng D — Thực hiện chuyến, sức khỏe và bàn giao
1. Trước khi khởi hành: xác minh kế hoạch được duyệt, giấy tờ bắt buộc, xác nhận lịch phương tiện, checklist xe/chuồng, vệ sinh/khử trùng, niêm phong và bàn giao trách nhiệm.
2. Driver/Escort chỉ xem chuyến được giao. Mỗi cập nhật có thời điểm, mốc/vị trí nhập thủ công, trạng thái, ghi chú và bằng chứng nếu cần.
3. Theo dõi sức khỏe theo chu kỳ/quy trình do chuyên viên phụ trách quy định. Khi quan sát bất thường, tạo cảnh báo/sự cố và chuyển thông tin tới Coordinator cùng Logistics Manager; tình huống sức khỏe cần được chuyển đến người có chuyên môn phù hợp.
4. Sự cố mở ra luồng xử lý riêng: ghi nhận → phân loại mức độ → biện pháp tạm thời → đánh giá tác động ngựa/lịch/giấy tờ/chi phí → xin quyết định khi cần → cập nhật kế hoạch → xác nhận xử lý → đóng sự cố.
5. Khi bàn giao, ghi tên người nhận, thời gian, địa điểm, trạng thái từng ngựa, hồ sơ và chữ ký/ảnh biên bản nếu có. Bàn giao không tự đồng nghĩa quy trình vận chuyển đã hoàn tất nếu vẫn còn thời gian hồi phục hoặc điều kiện hậu vận chuyển cần theo dõi.
6. Sau khi giao, chuyển sang “Đang hồi phục” khi có thời gian hồi phục cần theo dõi. Chỉ đánh dấu “Hoàn thành” khi các điều kiện bàn giao, hồ sơ, sự cố và nghĩa vụ còn lại đã được đóng theo quy trình đồ án.

## 6. Máy trạng thái — phải tách biệt, không dùng một badge cho mọi thứ

### 6.1 Trạng thái yêu cầu vận chuyển
- **Bản nháp:** khách hàng đang nhập, chưa gửi.
- **Đã gửi:** khách hàng đã gửi; chờ tiếp nhận.
- **Đang xem xét:** Manager/nhân viên được giao đang kiểm tra.
- **Cần bổ sung:** chờ khách hàng cung cấp thông tin/tài liệu; lưu rõ mục còn thiếu.
- **Chờ thẩm định chuyên môn:** cần Specialist xác minh hồ sơ, tuyến hoặc điều kiện.
- **Đã duyệt yêu cầu:** yêu cầu đạt điều kiện để lập kế hoạch; không có nghĩa đã khởi hành.
- **Bị từ chối:** có lý do và người quyết định.
- **Đã hủy:** ghi lý do, người yêu cầu/người duyệt và ảnh hưởng tới lịch/chi phí.
- **Đang lập kế hoạch / Chờ duyệt kế hoạch / Đã lên lịch:** trạng thái lập kế hoạch riêng, không trộn với hồ sơ giấy tờ.

### 6.2 Trạng thái giấy tờ (mỗi tài liệu riêng)
- Chưa tải lên; Chờ kiểm tra; Hợp lệ; Cần bổ sung; Không hợp lệ; Sắp hết hạn; Hết hạn; Không áp dụng (phải có lý do/căn cứ).
- Trạng thái của bộ hồ sơ được suy ra từ các tài liệu theo tuyến: “Đủ điều kiện”, “Còn thiếu”, “Đang thẩm định”, “Bị chặn”. Không chỉ dựa trên số lượng file đã tải.

### 6.3 Trạng thái chuyến
- Chưa khởi hành; Đã chuẩn bị; Đang vận chuyển; Tạm dừng do sự cố; Đang kiểm tra/kiểm dịch tại điểm đến (nếu áp dụng); Đã bàn giao; Đang hồi phục; Hoàn thành; Đã hủy.
- Mỗi lần chuyển trạng thái phải do đúng vai trò thực hiện, đúng điều kiện và lưu mốc thời gian. Cập nhật thủ công phải ghi rõ “Cập nhật thủ công”.

### 6.4 Mức rủi ro theo lịch thi đấu — tính độc lập với trạng thái chuyến
Gọi:
- `competition_start_at`: giờ bắt đầu giải/thi đấu.
- `required_recovery_hours`: số giờ hồi phục tối thiểu đã được xác nhận.
- `latest_arrival_at = competition_start_at - required_recovery_hours`.
- `eta_at`: giờ đến dự kiến hiện tại.

Phân loại:
- **Đúng kế hoạch:** `eta_at <= latest_arrival_at`.
- **Có nguy cơ trễ:** `eta_at > latest_arrival_at` nhưng `eta_at + required_recovery_hours <= competition_start_at`.
- **Không đáp ứng lịch thi đấu:** `eta_at + required_recovery_hours > competition_start_at`.

Các nhóm này là ba nhánh độc lập cùng được tính từ ETA mới nhất, không phải chuỗi trạng thái lần lượt. Nếu thiếu giờ thi đấu, ETA hoặc thời gian hồi phục đã xác nhận thì hiện “Chưa đủ dữ liệu đánh giá”, không tự gán màu xanh. Hạn có mặt do khách hàng/ban tổ chức cung cấp cần lưu riêng, không tự thay bằng công thức nếu hai mốc khác nhau; hiển thị cả hạn bắt buộc và thời điểm đến muộn nhất tính theo thời gian hồi phục để người có trách nhiệm quyết định.

### 6.5 Trạng thái sự cố
Mới ghi nhận → Đã tiếp nhận → Đang xử lý → Chờ quyết định/chi phí (nếu cần) → Đã khắc phục → Đã đóng. “SOS/Khẩn cấp” là mức ưu tiên/cờ cảnh báo, không phải trạng thái đóng. Sự cố đã đóng không được xóa; nếu mở lại phải lưu người mở lại, thời gian và lý do.

## 7. Quy tắc đặc thù của ngựa đua

1. **Ngựa là đối tượng trung tâm của chuyến.** Mọi yêu cầu, lịch sử, giấy tờ, bố trí chuồng, nhật ký sức khỏe, bàn giao và đánh giá phải liên kết được về mã ngựa.
2. **Hồ sơ ngựa không đồng nghĩa hồ sơ chuyến.** Cân nặng, kích thước, định danh, dị ứng, tiền sử và hành vi được lưu ở hồ sơ ngựa; giá trị hoặc chỉ dẫn phục vụ một chuyến cụ thể có thể được chụp lại theo phiên bản kế hoạch.
3. **Thời gian hồi phục không mặc định bằng nhau cho mọi ngựa.** Có thể dùng giá trị trong hồ sơ làm tham khảo nhưng yêu cầu cụ thể cần được xác nhận bởi người có trách nhiệm. Lưu ai xác nhận, vào lúc nào và vì sao thay đổi.
4. **Ghép ngựa chung chuồng không dựa duy nhất vào cùng chủ.** Phải đánh giá giới hạn kích thước/khối lượng/cấu hình, tính tương thích, tiền sử hành vi khi vận chuyển, tuyến/phương thức và yêu cầu an toàn của nhà vận tải. Tính khí hung hăng một mình không tự quyết định “chuồng riêng”; hệ thống nêu cảnh báo/khuyến nghị và yêu cầu người có thẩm quyền xác minh.
5. **Các cấu hình chuồng** (ví dụ chung 2 ngựa, chung 3 ngựa, riêng) chỉ là các lựa chọn mô hình. Chỉ hiện cấu hình thực sự tương thích với tài sản/phương tiện và quy định vận chuyển đang áp dụng. Không đưa ra số đo/sức chứa chuẩn chung khi chưa có cấu hình tài sản cụ thể.
6. **Giấy tờ là theo tuyến.** Loại xét nghiệm, chứng nhận sức khỏe, giấy phép xuất/nhập/quá cảnh, kiểm dịch và chứng từ hải quan phải được tra theo nước, cửa khẩu, thời điểm và loại hình di chuyển. Không coi một danh sách mẫu là bắt buộc cho mọi quốc gia.
7. **Sức khỏe xuyên suốt hành trình.** Ghi nhận tại mốc trước khởi hành, điểm kiểm tra/chuyển giao quan trọng và điểm đến theo quy trình đã cấu hình. Khi báo động chỉ số vượt ngưỡng, ghi rõ ngưỡng và nguồn cấu hình; không tự đưa ra chẩn đoán hoặc toa thuốc.
8. **Đến nơi không phải lúc nào cũng kết thúc vận chuyển.** Có thể còn thông quan, kiểm dịch, vận chuyển chặng cuối, bàn giao, xác nhận tình trạng và theo dõi hồi phục.
9. **Không hứa hẹn thời gian thực.** ETA là giá trị ước tính từ kế hoạch/cập nhật thủ công. Mỗi ETA phải có thời điểm cập nhật và nguồn: kế hoạch, điều phối viên hoặc nhân viên ghi nhận.
10. **Thay đổi phương án có tác động liên hoàn.** Bất kỳ thay đổi nào ở tuyến, phương thức, điểm dừng, nhà vận tải, chuồng, giờ khởi hành, nhân sự hoặc thời gian cách ly đều phải chạy lại kiểm tra lịch, giấy tờ, ETA, hồi phục, nguồn lực và báo giá.

## 8. Báo giá động — cần giải thích được

Báo giá không phải gói cố định giống nhau cho mọi chuyến. Bộ tính giá của đồ án nên dùng các thành phần cấu hình được, chẳng hạn:

- Chặng đường bộ, vận tải quốc tế và chặng cuối.
- Phương thức/tuyến, khoảng cách hoặc mức giá tham chiếu của nhà cung cấp.
- Số ngựa và cấu hình chuồng hợp lệ.
- Khối lượng/kích thước nếu cấu hình giá có xét đến.
- Phí chuẩn bị/người hộ tống/handling tại điểm trung chuyển.
- Phí kiểm tra thú y, xét nghiệm, giấy phép, kiểm dịch, lưu chuồng, thông quan theo tuyến nếu áp dụng.
- Bảo hiểm hoặc dịch vụ bổ sung nếu người dùng/đơn vị chọn và điều kiện cho phép.
- Dự phòng hoặc phụ phí đã định nghĩa, phải có lý do.

Mỗi báo giá hiển thị: số lượng × đơn giá = thành tiền; tổng phụ, thuế/phí nếu có, tổng tham khảo; nguồn/phiên bản bảng giá; thời hạn hiệu lực; giả định; hạng mục chưa xác nhận; điều kiện làm giá thay đổi. Không được tạo con số như báo giá thật khi không có dữ liệu—dữ liệu demo phải ghi “tham khảo/mô phỏng”.

Khi người dùng đổi phương án, số ngựa, cấu hình chuồng, thời gian hoặc tuyến, hệ thống tính phiên bản báo giá mới và giải thích các khoản tăng/giảm. Không ghi đè báo giá đã chấp thuận mà không có lịch sử. Khi phát sinh chi phí thực tế do sự cố, lập đề nghị riêng, kèm bằng chứng/lý do và quy trình phê duyệt; không tự cộng khoản vào hóa đơn đã chốt.

## 9. Quy định và nguồn tham khảo

Ứng dụng có thể lưu liên kết/thông tin tham khảo từ các cơ quan, nhưng không được biến chúng thành một nhãn chung “đạt chuẩn quốc tế” nếu chưa thẩm định điều kiện áp dụng. Nguồn tham khảo để người phát triển hiểu bối cảnh:

- WOAH — International competition horse movement / khuôn khổ HHP: https://www.woah.org/en/what-we-offer/safe-trade-and-movement-of-animals/international-competition-horse-movement/
- WOAH — hướng dẫn phúc lợi động vật trong vận chuyển đường bộ, đường biển và đường hàng không: https://www.woah.org/en/statement-on-animal-welfare-during-transport/
- WOAH — Handbook for the management of high health, high performance horses: https://bulletin.woah.org/?panorama=05-1-02-hhp-handbook-en
- Ủy ban châu Âu — kiểm soát thú y tại biên giới EU: https://food.ec.europa.eu/animals/veterinary-border-control_en
- Ủy ban châu Âu — quy định về động vật họ ngựa và hồ sơ nhập cảnh EU: https://food.ec.europa.eu/animals/live-animal-movements/equine-animals_en
- IRT — quy trình dịch vụ vận chuyển ngựa quốc tế, thông tin chuẩn bị trước chuyến/kiểm dịch/hải quan/giao ngựa: https://www.irt.com/

Đây là tài liệu định hướng thiết kế, không thay thế quy định mới nhất của cơ quan thú y, hải quan, sân bay, đơn vị vận tải hoặc quốc gia liên quan. UI nên hiển thị “tham khảo — cần xác minh” và cho phép chuyên viên ghi nguồn, ngày truy cập/ngày xác minh, phạm vi áp dụng và người xác minh. Nếu chưa xác minh, không hiển thị tài liệu đó là điều kiện pháp lý cuối cùng.

---

# 10. Đặc tả 50 màn hình

Mỗi màn hình cần có: mục tiêu, bộ dữ liệu, thao tác, kiểm tra nghiệp vụ, trạng thái/kết quả, quyền truy cập và trạng thái rỗng/lỗi. Dưới đây là yêu cầu chức năng; phải so sánh với thiết kế Stitch thực tế, không tự ý đổi bố cục gốc nếu người dùng yêu cầu bảo toàn giao diện.

## A. Dùng chung — Màn 01–06

### 01. Đăng nhập
**Mục tiêu:** xác thực người dùng và mở đúng khu vực theo vai trò đã cấp.

- Trường: email/tên đăng nhập, mật khẩu, ghi nhớ đăng nhập; nút đăng nhập; liên kết quên mật khẩu; liên kết tạo tài khoản nếu mở đăng ký công khai.
- Không có danh sách chọn vai trò. Vai trò do backend trả sau khi xác thực.
- Kiểm tra trống, định dạng tài khoản và trạng thái bị khóa/vô hiệu hóa. Thông báo lỗi không tiết lộ tài khoản có tồn tại hay không.
- Thành công: tạo phiên/token an toàn và chuyển tới dashboard đúng vai trò. Không lưu mật khẩu thô ở trình duyệt/localStorage.
- Trạng thái cần thiết: đang gửi, sai thông tin, tài khoản chưa xác minh, bị khóa, server không khả dụng.

### 02. Tạo tài khoản
**Mục tiêu:** tạo tài khoản khách hàng, không cho tự đăng ký thành nhân viên nội bộ.

- Trường tối thiểu: tên người liên hệ, email, số điện thoại, tên trang trại/đơn vị, mật khẩu, xác nhận mật khẩu và đồng ý điều khoản nếu có.
- Email phải có định dạng hợp lệ; mật khẩu đáp ứng chính sách; không tạo hai tài khoản cùng email; thông tin bắt buộc cần chỉ rõ.
- Tài khoản mới ở trạng thái chờ xác minh email/hoàn tất kích hoạt. Vai trò mặc định là Khách hàng.
- Không nhận role từ payload do người dùng tự gửi; quyền nội bộ chỉ được cấp bởi người có quyền thông qua màn quản lý nhân sự.

### 03. Xác thực email
**Mục tiêu:** xác minh quyền kiểm soát địa chỉ email.

- Hiển thị email đích đã che một phần, trường mã xác minh nếu quy trình dùng OTP, nút xác nhận và gửi lại mã.
- Mã có hạn dùng, giới hạn số lần thử và thời gian chờ gửi lại; không ghi mã nhạy cảm vào log.
- Xác minh thành công cập nhật trạng thái tài khoản và dẫn về đăng nhập/trang phù hợp. Mã sai/hết hạn cho phép thử lại đúng giới hạn.

### 04. Quên / Đặt lại mật khẩu
**Mục tiêu:** khôi phục tài khoản mà không làm lộ thông tin.

- Bước 1 nhập email; hệ thống trả thông báo trung tính dù email có tài khoản hay không.
- Bước 2 dùng token/OTP còn hạn; bước 3 nhập mật khẩu mới và xác nhận.
- Token chỉ sử dụng một lần, có thời hạn và bị vô hiệu sau khi đổi mật khẩu. Tùy chính sách có thể kết thúc các phiên cũ.
- Có trạng thái gửi yêu cầu, email chưa tới, mã sai, mã hết hạn, mật khẩu yếu và thành công.

### 05. Hồ sơ cá nhân & Đổi mật khẩu
**Mục tiêu:** người dùng xem/sửa thông tin liên hệ của chính mình.

- Hiển thị tên, email (có thể không sửa trực tiếp), số điện thoại, đơn vị/trang trại, vai trò chỉ đọc và trạng thái tài khoản.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại nếu người dùng đã đăng nhập; mật khẩu mới và xác nhận phải khớp.
- Thay đổi thông tin liên hệ lưu lịch sử thời gian. Khách hàng chỉ sửa hồ sơ của mình; không sửa vai trò hoặc trạng thái hoạt động.

### 06. Trung tâm thông báo
**Mục tiêu:** cung cấp hành động tiếp theo rõ ràng chứ không chỉ hiển thị chuông thông báo.

- Danh sách lọc theo tất cả/chưa đọc/khẩn cấp, loại thông báo, thời gian và bản ghi liên quan.
- Loại: yêu cầu được tiếp nhận, cần bổ sung hồ sơ, tài liệu bị từ chối/sắp hết hạn, thay đổi kế hoạch/giá, nguy cơ trễ, sự cố, bàn giao, phản hồi/đánh giá.
- Mỗi thông báo chứa tiêu đề, nội dung dễ hiểu, thời gian, mức độ, đối tượng liên quan, nút mở bản ghi và trạng thái đã đọc.
- Chỉ người nhận có quyền xem nội dung. Đánh dấu đã đọc không đồng nghĩa xử lý xong công việc.

## B. Khách hàng — Màn 07–18

### 07. Trang tổng quan khách hàng
**Mục tiêu:** trả lời “ngựa nào cần chú ý, đơn đang tới đâu, tôi cần làm gì tiếp theo?”.

- Thẻ KPI: số ngựa đang quản lý, yêu cầu đang xử lý, hồ sơ cần bổ sung, chuyến sắp đến hạn, thông báo chưa đọc.
- Danh sách ngựa/đơn gần đây với tên + mã ngựa, mã đơn, sự kiện mục tiêu, ngày bắt đầu thi đấu, hạn có mặt, ETA gần nhất, trạng thái giấy tờ, mức rủi ro lịch.
- Ưu tiên khối “Cần bạn xử lý”: bổ sung tài liệu, xác nhận báo giá, xác nhận thông tin, xem kế hoạch thay đổi.
- Nhấn vào KPI/notification mở danh sách đã lọc hoặc trang chi tiết tương ứng. Không hiển thị số liệu toàn hệ thống của các khách khác.
- Nếu chưa có dữ liệu, đưa nút bắt đầu quản lý ngựa/tạo yêu cầu và giải thích bước tiếp theo.

### 08. Danh sách ngựa đua
**Mục tiêu:** tìm, lọc và mở hồ sơ ngựa thuộc khách hàng.

- Bảng: mã ngựa, tên, RFID/microchip, số hộ chiếu nếu có, giống, tuổi, cân nặng gần nhất, trạng thái hồ sơ, lần kiểm tra sức khỏe gần nhất, chuyến gần nhất.
- Tìm theo tên/mã/RFID; lọc theo trạng thái hồ sơ hoặc đang có yêu cầu/chuyến.
- Thao tác: xem chi tiết, thêm ngựa, sửa thông tin được phép, mở yêu cầu vận chuyển.
- Không cho xóa cứng nếu hồ sơ đã liên kết đơn/chuyến/lịch sử; dùng trạng thái ngừng hoạt động/ẩn khỏi lựa chọn mới với lịch sử giữ nguyên.

### 09. Chi tiết hồ sơ ngựa
**Mục tiêu:** cung cấp nguồn thông tin chuẩn cho mọi yêu cầu vận chuyển liên quan đến ngựa.

- Nhóm thông tin: định danh, chủ sở hữu, giống/giới tính/tuổi, cân nặng và kích thước nếu có, hộ chiếu/RFID, ảnh, tiền sử sức khỏe, dị ứng, tính khí, hành vi lên xuống phương tiện, hướng dẫn xử lý đã xác minh.
- Hiển thị giấy tờ theo loại/trạng thái/hạn; lịch sử vận chuyển; nhật ký sức khỏe có quyền truy cập; sự kiện thi đấu mục tiêu, ngày thi đấu, hạn có mặt và giờ hồi phục đã được xác nhận.
- Hiển thị rõ nguồn và ngày cập nhật cân nặng/chỉ số có thể thay đổi; không coi dữ liệu cũ là dữ liệu đo mới.
- Thao tác: sửa hồ sơ, thêm tài liệu, xem lịch sử, tạo yêu cầu. Thay đổi trường quan trọng có thể yêu cầu xác nhận lại nếu có chuyến chưa khởi hành.

### 10. Thêm / Sửa hồ sơ ngựa
**Mục tiêu:** nhập dữ liệu nhận dạng và các yếu tố ảnh hưởng đến tính an toàn/phương án.

- Trường: mã/tên ngựa, RFID/microchip nếu có, số hộ chiếu, giống, giới tính, ngày sinh/tuổi, cân nặng, kích thước nếu biết, tiền sử sức khỏe, dị ứng, tính khí, hành vi vận chuyển, hướng dẫn đặc biệt và ảnh.
- Khách hàng không tự xác nhận chứng chỉ y tế hoặc tính hợp lệ pháp lý. Có thể khai báo dữ liệu và đính kèm chứng cứ; Specialist chịu trách nhiệm thẩm định.
- Kiểm tra định dạng và xung đột mã/RFID/số hộ chiếu theo quy tắc schema. Nếu dữ liệu chưa biết, cho phép để trống khi không bắt buộc và đánh dấu “Cần xác nhận”; không tạo số liệu ngẫu nhiên.
- Trường hồi phục nên lưu giá trị tham khảo và trạng thái xác nhận/nguồn. Nếu hệ thống yêu cầu xác nhận bởi Specialist, không để khách hàng tự biến thành giá trị chuyên môn đã duyệt.

### 11. Tạo yêu cầu vận chuyển
**Mục tiêu:** tạo yêu cầu đủ thông tin để thẩm định, lập tuyến và tính giá.

- Quy trình biểu mẫu nhiều bước: (1) chọn ngựa; (2) điểm đi/đến và quốc gia quá cảnh nếu biết; (3) sự kiện/mục đích và giờ thi đấu; (4) hạn phải có mặt; (5) thời gian hồi phục mục tiêu; (6) yêu cầu dịch vụ/handling; (7) liên hệ và giấy tờ; (8) kiểm tra tóm tắt và gửi.
- Hệ thống tính `latest_arrival_at` từ giờ thi đấu và thời gian hồi phục đã xác nhận; hiển thị riêng hạn do khách/ban tổ chức đưa ra. Nếu hai mốc không khớp, cảnh báo và yêu cầu làm rõ.
- Tự động hiển thị các giấy tờ dự kiến cần kiểm tra theo tuyến, nhưng gắn nhãn “Danh sách sơ bộ — Specialist xác minh”. Không yêu cầu khách chọn hoặc tắt điều kiện bắt buộc.
- Kiểm tra ngày tháng, điểm đến, quyền với ngựa, liên hệ, tính hợp lý giờ thi đấu/hạn có mặt. Không tự khẳng định có chỗ vận chuyển trước khi có kế hoạch được duyệt.
- Sau khi gửi, sinh mã yêu cầu, trạng thái Đã gửi, tóm tắt và khả năng xem tiến độ.

### 12. Danh sách đơn vận chuyển
**Mục tiêu:** theo dõi vòng đời mọi yêu cầu của khách hàng.

- Bảng: mã đơn, ngựa, điểm đi/đến, sự kiện mục tiêu, giờ thi đấu/hạn có mặt, ETA, mức rủi ro, trạng thái yêu cầu, trạng thái giấy tờ, ngày cập nhật.
- Bộ lọc theo trạng thái, ngựa, sự kiện, ngày gửi và mức rủi ro; tìm mã đơn/ngựa.
- Thao tác tùy trạng thái: xem chi tiết, tiếp tục bản nháp, bổ sung hồ sơ, xem báo giá, phản hồi yêu cầu bổ sung, đề nghị hủy hoặc đề nghị thay đổi.
- Không cho chỉnh sửa trực tiếp các thông tin đã khóa bởi kế hoạch đã duyệt; thay đổi phải qua quy trình đề nghị và đánh giá tác động.

### 13. Chi tiết đơn & Checklist giấy tờ
**Mục tiêu:** hiển thị toàn bộ lịch sử xử lý và lý do đơn đang ở trạng thái hiện tại.

- Header: mã đơn, khách, ngựa, tuyến, sự kiện, giờ thi đấu, hạn có mặt, giờ hồi phục, ETA, rủi ro và trạng thái yêu cầu.
- Tab/khu vực: tổng quan; hoạt động theo dòng thời gian; checklist tài liệu; phương án/báo giá; kế hoạch/chuyến; yêu cầu bổ sung; trao đổi/thông báo.
- Mỗi dòng checklist: tên tài liệu, áp dụng cho chặng/quốc gia nào, bắt buộc/không áp dụng/chưa xác minh, đã tải/chưa tải, ngày hết hạn, người kiểm tra, lý do cần bổ sung.
- Khách hàng chỉ được xem, tải lên hoặc trả lời yêu cầu bổ sung. Kết quả thẩm định chỉ do Specialist hoặc vai trò được cấp quyền.
- Lưu timeline tất cả thao tác quan trọng, không ghi đè ghi chú/phiên bản trước.

### 14. Tải lên / Bổ sung giấy tờ
**Mục tiêu:** tải một phiên bản file gắn đúng ngựa, đơn, chặng và yêu cầu cần giải quyết.

- Chọn loại tài liệu đã được hệ thống yêu cầu; liên kết đúng ngựa/đơn/chặng; nhập số hiệu, cơ quan cấp, ngày cấp, ngày hết hạn và ghi chú khi cần.
- Kiểm tra loại file, dung lượng, lỗi upload; cho phép xem tên file và thời gian tải lên. Không OCR hay tự đánh dấu hợp lệ.
- Tải file mới tạo phiên bản mới và chuyển tài liệu sang “Chờ kiểm tra”; bản trước vẫn nằm trong lịch sử.
- Nếu tài liệu không áp dụng, khách hàng gửi giải thích/đề nghị loại trừ; chỉ Specialist mới xác nhận “Không áp dụng”.

### 15. Theo dõi chuyến đi
**Mục tiêu:** cho khách biết mốc mới nhất, bước tiếp theo và tác động đến lịch thi đấu.

- Timeline chặng: dự kiến/đã xảy ra, vị trí/mốc ghi tay, người cập nhật, ghi chú, ảnh/chứng cứ, lần cập nhật cuối.
- Hiển thị phương tiện/đối tác và người liên hệ theo quyền; không hiển thị vị trí GPS giả hoặc hoạt ảnh xe chạy trực tiếp.
- Hiển thị ETA, nguồn ETA, thời gian cập nhật, hạn có mặt, thời gian hồi phục và phân loại rủi ro theo công thức mục 6.4.
- Nếu có sự cố, hiển thị mức độ, ảnh hưởng, hành động hiện tại và thông báo được xác nhận bởi điều phối. Không hiển thị thông tin nội bộ nhạy cảm không liên quan.
- Sau bàn giao, hiển thị biên bản và tình trạng hồi phục khi được phép.

### 16. Tra cứu phương án vận chuyển
**Mục tiêu:** so sánh lựa chọn khả thi, không phải danh sách dịch vụ chung chung.

- Các phương án được tạo từ dữ liệu yêu cầu, bảng giá tham chiếu, chặng và điều kiện tuyến. Mỗi phương án ghi rõ giả định nào đã xác minh/chưa xác minh.
- Chỉ hiển thị tối đa 3 phương án khả thi nếu đủ dữ liệu. Phân biệt “khuyến nghị” và “rẻ nhất/nhanh nhất”; giải thích lý do như đáp ứng giờ, phù hợp cấu hình ngựa, ít chuyển chặng hơn hoặc giá tham chiếu thấp hơn.
- Mỗi thẻ: tuyến, phương thức/chặng, ETA, thời gian hồi phục còn lại trước giải, cấu hình chuồng đề xuất, đối tác nếu đã xác định, tổng tham khảo và các chi phí chính.
- Phương án không đáp ứng lịch hoặc không an toàn không được gắn nhãn “được khuyến nghị”. Có thể hiển thị riêng là không khả thi cùng lý do nếu điều đó giúp khách hiểu lựa chọn bị loại.

### 17. Tùy chỉnh phương án vận chuyển
**Mục tiêu:** cho khách chọn một số tùy chọn có thể điều chỉnh nhưng không bỏ qua các điều kiện bắt buộc.

- Chỉ cho thay đổi thuộc phạm vi khách hàng: một số dịch vụ bổ sung, ưu tiên thời gian/chi phí, yêu cầu hỗ trợ, hoặc cấu hình trong tập phương án đã được xác nhận khả thi.
- Các lựa chọn chuồng chỉ hiện nếu phương tiện/đối tác có cấu hình đó và ngựa phù hợp ở mức sơ bộ. Cùng chủ không đủ điều kiện tự động ghép chung.
- Không cho tắt hồ sơ pháp lý, kiểm dịch, xác minh sức khỏe, điều kiện an toàn hoặc tài liệu bắt buộc.
- Mỗi thay đổi cập nhật ước tính giá và thời gian, nêu khoản thay đổi, cảnh báo xung đột thời gian và yêu cầu Specialist/Coordinator kiểm tra lại nếu ảnh hưởng kỹ thuật.
- Nếu lựa chọn khiến phương án không khả thi, hiển thị lý do cụ thể và không cho xác nhận lựa chọn đó.

### 18. Chi tiết báo giá vận chuyển
**Mục tiêu:** giúp khách hiểu giá, giả định và cách xác nhận.

- Hiển thị mã/phiên bản báo giá, trạng thái, thời hạn hiệu lực, tuyến/chặng, ngựa, số lượng, cấu hình, chi phí từng hạng mục, thuế/phí nếu được định nghĩa, tổng và điều kiện.
- Tách rõ phí đã xác định, giá tham khảo, khoản chờ nhà cung cấp xác nhận và khoản phát sinh chưa biết.
- Khách có thể chấp thuận/đề nghị chỉnh sửa/từ chối khi báo giá ở trạng thái chờ phản hồi và còn hiệu lực. Lưu thời điểm phản hồi.
- Chấp thuận báo giá không được tự động bỏ qua duyệt pháp lý/kiểm dịch hoặc đảm bảo có chỗ vận tải nếu kế hoạch chưa được xác nhận.

## C. Logistics Manager — Màn 19–27

### 19. Trang tổng quan quản lý logistics
**Mục tiêu:** quản lý tồn đọng, rủi ro và quyết định cần đưa ra.

- KPI: đơn chờ duyệt, đơn cần quyết định, chuyến sắp khởi hành, trường hợp bị chặn bởi giấy tờ, rủi ro trễ, sự cố mở, chi phí đang chờ duyệt.
- Danh sách ưu tiên sắp xếp theo mức khẩn cấp và hạn; mỗi cảnh báo có nguyên nhân, thời điểm cập nhật và liên kết đến bản ghi xử lý.
- Biểu đồ có phạm vi ngày và chú giải rõ. Mọi số trên KPI/biểu đồ nhấn được để mở danh sách tương ứng; không dùng số liệu trang trí không có dữ liệu nguồn.

### 20. Hàng đợi đơn & Mức ưu tiên
**Mục tiêu:** tiếp nhận, phân loại và điều phối người xử lý yêu cầu.

- Bảng: mã đơn, khách, ngựa, sự kiện, hạn có mặt, trạng thái tài liệu, rủi ro, giá tham khảo, ngày gửi, người xử lý.
- Bộ lọc chờ xử lý, cần bổ sung, khẩn cấp, chờ Specialist, đã duyệt, bị chặn. Mức ưu tiên có thể dựa trên thời gian còn lại, rủi ro, độ sẵn sàng hồ sơ và quy định vận hành đã cấu hình.
- Manager có thể gán người xử lý, điều chỉnh ưu tiên với lý do, yêu cầu bổ sung, chuyển Specialist thẩm định hoặc mở chi tiết duyệt.
- Không biến “đắt tiền” thành ưu tiên tự động duy nhất; mọi điểm ưu tiên phải có tiêu chí hiển thị.

### 21. Chi tiết đơn & Phê duyệt
**Mục tiêu:** quyết định có cho yêu cầu đi tiếp sang lập kế hoạch hay không.

- Tóm tắt dữ liệu, lý do vận chuyển, tuyến, mục tiêu sự kiện, hồ sơ và checklist, tính khả thi lịch, giá tham khảo, cảnh báo, trao đổi và lịch sử người xử lý.
- Quyết định: duyệt bước nghiệp vụ trong phạm vi quyền; yêu cầu bổ sung; từ chối; chuyển Specialist; trả lại chỉnh sửa. Mỗi quyết định bắt buộc có lý do/ghi chú phù hợp.
- Phải chặn hoặc không cho duyệt bước tiếp theo nếu dữ liệu quan trọng thiếu, chưa có đánh giá của Specialist khi cần, hoặc hệ thống có cờ bắt buộc chưa đạt.
- Phân biệt rõ “duyệt yêu cầu” với “duyệt kế hoạch”, “đủ giấy tờ”, “đã lên lịch” và “đã khởi hành”.

### 22. Deadline & Rủi ro vận chuyển
**Mục tiêu:** phát hiện sớm khả năng ngựa không kịp đến và hồi phục trước giải.

- Hiển thị giờ thi đấu, hạn có mặt do người dùng/ban tổ chức cung cấp, số giờ hồi phục đã xác nhận, giờ đến muộn nhất theo hồi phục, ETA hiện tại, nguồn ETA và khoảng dự phòng.
- Áp dụng 3 mức rủi ro mục 6.4; nếu thiếu dữ liệu ghi “Chưa đủ dữ liệu đánh giá”. Không giả định hồi phục 48 giờ cho mọi ngựa.
- Các nguyên nhân rủi ro có thể là giấy tờ chưa xong, cửa sổ kiểm dịch chưa có chỗ, nối chuyến sát, tài nguyên trùng lịch, sự cố hoặc ETA mới thay đổi.
- Manager có thể giao việc/đề nghị phương án thay thế/ghi quyết định. Hệ thống lưu rủi ro trước-sau và lý do quyết định chấp nhận hoặc đề xuất không tiếp tục chuyến.

### 23. Kế hoạch tổng thể chuyến
**Mục tiêu:** xem một chuyến từ đầu đến cuối và các phụ thuộc giữa chặng.

- Hiển thị các chặng theo thứ tự, lịch dự kiến/thực tế, địa điểm, phương thức, đối tác, phương tiện, nhân sự, giấy tờ cần có, mốc kiểm dịch, điểm bàn giao và ETA.
- Nêu rõ chặng nào chưa có xác nhận của nhà cung cấp hoặc cơ quan chức năng. Dự kiến không được trình bày như booking đã xác nhận.
- Manager có thể xem phiên bản kế hoạch và trạng thái duyệt, ghi chú, so sánh tác động giữa các phiên bản.
- Nếu thay đổi kế hoạch sau duyệt, tạo bản sửa đổi, yêu cầu kiểm tra lại quy tắc liên quan và ghi rõ cần duyệt lại hay không.

### 24. Duyệt sự cố & Chi phí phát sinh
**Mục tiêu:** xem sự cố đang tác động chuyến và quyết định xử lý/chi phí trong thẩm quyền.

- Thông tin: loại/mức khẩn cấp, chặng, ngựa, thời gian, ghi nhận của Driver/Coordinator, ảnh/chứng cứ, biện pháp tạm thời, nguyên nhân sơ bộ, ETA trước/sau, khoản phí phát sinh và lựa chọn xử lý.
- Quyết định: yêu cầu bổ sung bằng chứng, chấp thuận/từ chối khoản chi, phê duyệt thay đổi kế hoạch, giao người xử lý, đóng hoặc mở lại sự cố.
- Không cho tự động chấp thuận chi phí chỉ vì có ảnh; cần loại chi phí, số tiền, lý do và căn cứ quyền phê duyệt.
- Lưu dấu vết phê duyệt, trường hợp bị từ chối, tác động giá và người đã được thông báo.

### 25. Báo cáo & Nhật ký hệ thống
**Mục tiêu:** theo dõi kết quả, hiệu suất và truy vết hành động.

- Báo cáo đề xuất: số đơn theo trạng thái, tỷ lệ đến đúng hạn, lý do trễ, thời gian xử lý giấy tờ, sự cố theo loại, chi phí phát sinh, thời gian hồi phục được theo dõi và feedback khách hàng.
- Mỗi biểu đồ có bộ lọc thời gian/đối tác/tuyến và truy cập danh sách bản ghi nguồn. Không tính KPI khi dữ liệu không đầy đủ mà không ghi chú.
- Nhật ký kiểm toán: người, vai trò, thời gian, hành động, loại bản ghi, mã bản ghi, giá trị trước/sau hoặc mô tả thay đổi, lý do.
- Người xem báo cáo chỉ được xem trường dữ liệu họ có quyền. Không cung cấp chức năng sửa trực tiếp audit log.

### 26. Đối tác & Bảng giá tham chiếu
**Mục tiêu:** quản lý nhà cung cấp và dữ liệu giá dùng cho phương án/báo giá mô phỏng.

- Đối tác: tên, loại dịch vụ, quốc gia/địa bàn, liên hệ, phạm vi tuyến, tài liệu hợp tác, trạng thái hoạt động, người xác minh và ngày rà soát.
- Bảng giá: đơn vị tính, chặng/phương thức, cấu hình áp dụng, tiền tệ nếu cần, hiệu lực từ/đến, nguồn, ngày cập nhật, người nhập và trạng thái xác minh.
- Không trộn “giá nội bộ mô phỏng” với “giá nhà cung cấp đã xác nhận”. Mỗi loại cần nhãn riêng.
- Giá hết hiệu lực không được dùng làm giá hiện hành nếu không có quy trình cho phép; báo giá đã tạo giữ lại bản chụp giá cũ phục vụ lịch sử.

### 27. Quản lý nhân sự
**Mục tiêu:** quản lý tài khoản nội bộ, vai trò và khả năng được phân công.

- Danh sách nhân viên: mã/tên, email, vai trò trong 5 vai trò cho phép, trạng thái, kỹ năng/chứng chỉ liên quan nếu có, liên hệ, lịch/khả năng phân công.
- Manager được quyền tạo/kích hoạt/vô hiệu hóa hoặc điều chỉnh vai trò nếu chính sách dự án cho phép. Không có role `Administrator`.
- Khi đổi vai trò, hiển thị ảnh hưởng và lưu nhật ký. Không cho nhân viên tự nâng quyền bằng trường form.
- Lịch phân công phải được đối chiếu với kế hoạch chuyến và thời gian nghỉ/ca trực nếu thông tin đó có trong hệ thống.

## D. Transport Specialist — Màn 28–38

### 28. Trang tổng quan Specialist
**Mục tiêu:** thấy các hồ sơ pháp lý/kiểm dịch cần thẩm định và các hạn gần nhất.

- KPI: hồ sơ chờ kiểm tra, thiếu giấy, giấy sắp hết hạn, lịch cách ly chưa xác nhận, quy tắc tuyến chưa rà soát, yêu cầu có lịch thi đấu gần.
- Danh sách phải có mã đơn/ngựa, tuyến, sự kiện/hạn, vấn đề cụ thể, mức ưu tiên, người gửi và thời điểm cập nhật.
- KPI mở danh sách đã lọc. Không chỉ hiển thị badge “đạt chuẩn”; mỗi kết luận cần trạng thái, căn cứ và người xác nhận.

### 29. Danh sách hồ sơ kiểm dịch
**Mục tiêu:** quản lý các bước kiểm dịch áp dụng cho từng tuyến/đơn/ngựa.

- Bảng: mã đơn, ngựa, nước xuất/đến/quá cảnh, giai đoạn kiểm dịch, cơ sở, ngày dự kiến, đặt chỗ/hoàn thành, kết quả, giấy tờ liên quan và điều kiện còn thiếu.
- Lọc theo giai đoạn, trạng thái, nước, hạn và vấn đề. Hiển thị cơ sở/booking chưa xác nhận khác với booking đã xác nhận.
- Specialist cập nhật kết quả/ghi chú dựa trên chứng cứ, tải hồ sơ tham chiếu, yêu cầu bổ sung hoặc chuyển trạng thái theo quy trình được cấu hình.

### 30. Thẩm định hồ sơ ngựa / Đơn
**Mục tiêu:** kiểm tra nhận dạng ngựa, tài liệu và sự thống nhất dữ liệu.

- So sánh mã ngựa, RFID/microchip, hộ chiếu, người sở hữu, lịch trình, giấy chứng nhận và tài liệu tải lên; làm rõ điểm lệch dữ liệu.
- Mỗi tài liệu cho phép kết quả: hợp lệ trong phạm vi tuyến, cần bổ sung, không hợp lệ, hết hạn, không áp dụng có căn cứ.
- Ghi người thẩm định, thời điểm, nhận xét và căn cứ/nguồn. Không OCR tự động; không chỉ dựa vào tên file hoặc có file là coi hợp lệ.
- Nếu dữ liệu định danh không khớp, đánh dấu khối chặn và báo người liên quan trước khi cho đi tiếp.

### 31. Checklist giấy tờ theo tuyến
**Mục tiêu:** tạo danh sách kiểm tra có căn cứ cho hành trình cụ thể.

- Chọn nước xuất phát, từng điểm quá cảnh, nước đến, cửa khẩu/phương thức, loại hình di chuyển (tạm nhập/dự sự kiện/quay lại hay loại khác nếu được cấu hình), ngày dự kiến và thông tin ngựa.
- Sinh checklist từ bộ quy tắc đã xác minh. Mỗi dòng gồm loại tài liệu/kiểm tra, áp dụng cho chặng nào, bắt buộc/điều kiện áp dụng/chưa xác định, thời hạn, nguồn, người xác minh và ngày hiệu lực.
- Nếu không có bộ quy tắc đã xác minh, báo “Chưa có đủ dữ liệu quy định cho tuyến này”, không tự tạo checklist có vẻ chính thức.
- Thay đổi tuyến hoặc ngày cần rà lại checklist và gắn phiên bản mới; giữ lịch sử checklist cũ.

### 32. Cảnh báo & Gia hạn giấy tờ
**Mục tiêu:** phát hiện tài liệu sắp hết hạn trước khi nó chặn chặng tiếp theo.

- Danh sách theo ngày hết hạn, chặng sử dụng, ngựa/đơn, số ngày còn lại và trạng thái gia hạn.
- Ngưỡng cảnh báo phải cấu hình được và không tuyên bố là ngưỡng pháp lý chung. Cảnh báo phải tính xem tài liệu có còn hiệu lực tại ngày dự kiến sử dụng/chặng hay không.
- Specialist ghi biện pháp: yêu cầu bản mới, xin xác nhận, ghi rõ không áp dụng hoặc tạm dừng bước liên quan. Không tự gia hạn giấy phép bằng cách sửa ngày hết hạn.

### 33. Quy định theo quốc gia & Cửa khẩu
**Mục tiêu:** quản lý một kho quy tắc có nguồn, phạm vi và thời hạn, không phải trang nội dung tĩnh.

- Trường: quốc gia/vùng, cửa khẩu/sân bay/cảng, hướng đi, nhóm ngựa/loại hình di chuyển, yêu cầu tài liệu/kiểm tra, thời điểm áp dụng, link nguồn chính thức, ngày truy cập/xác minh, người xác minh, trạng thái và ghi chú.
- Trạng thái: bản nháp, đang xác minh, đang áp dụng, hết hiệu lực, cần rà soát. Chỉ bộ quy tắc đã xác minh và còn hiệu lực mới được tự dùng để sinh checklist.
- Lưu phiên bản và ngày thay đổi; không ghi một quốc gia có một quy tắc cho mọi cửa khẩu/loại hình nếu nguồn nói khác nhau.
- Nêu cảnh báo: “Thông tin tham khảo; cần xác minh với cơ quan/đối tác có thẩm quyền trước khi vận chuyển”.

### 34. Lịch cách ly kiểm dịch
**Mục tiêu:** theo dõi đặt chỗ và thời gian cách ly liên quan từng ngựa/chuyến.

- Lịch theo cơ sở, sức chứa được cấu hình, ngựa, ngày vào/ra, trạng thái yêu cầu/đặt chỗ/xác nhận/đang cách ly/được giải phóng, tài liệu liên quan và người phụ trách.
- Kiểm tra xung đột lịch, sức chứa, khoảng cách thời gian giữa các lượt sử dụng và điều kiện cơ sở. Không coi lịch đặt là xác nhận nếu đối tác chưa xác nhận.
- Thay đổi ngày đến/chuyến phải đánh giá lại đặt chỗ, sức chứa và ETA; thông báo Coordinator/Manager khi ảnh hưởng lịch.
- Không cho coi kiểm dịch hoàn tất nếu thiếu kết quả/điều kiện giải phóng bắt buộc theo bộ quy tắc áp dụng.

### 35. Cấu hình thời gian hồi phục theo tuyến
**Mục tiêu:** hỗ trợ tính thời điểm đến muộn nhất và rủi ro thi đấu.

- Hiển thị ngựa, loại chuyến/tuyến, thời gian vận chuyển dự kiến/thực tế, thời gian hồi phục đang áp dụng, nguồn/cơ sở, người xác nhận, ngày hiệu lực.
- Có thể lưu giá trị tham chiếu theo ngựa/chuyến hoặc tuyến, nhưng phải phân biệt rõ mức mặc định và giá trị chuyên môn đã xác nhận cho ngựa cụ thể.
- Khi đổi hồi phục, hệ thống tính lại giờ có mặt muộn nhất, mức rủi ro và cảnh báo ở trang liên quan; ghi lịch sử trước/sau và lý do.
- Không tự lấy trung bình dữ liệu lịch sử để quyết định thời gian hồi phục chính thức; chỉ dùng phân tích tham khảo khi được gắn nhãn.

### 36. Tra cứu quy chuẩn thú y quốc tế
**Mục tiêu:** lưu tài liệu tham khảo và liên kết để người thẩm định tra cứu.

- Trường: tên nguồn, cơ quan phát hành, URL, chủ đề, quốc gia/phạm vi, ngày phát hành/hiệu lực nếu biết, ngày truy cập, người rà soát, trạng thái xác minh và ghi chú.
- Bộ lọc theo quốc gia, chủ đề (nhận dạng, xét nghiệm, phúc lợi vận chuyển, giấy chứng nhận, biên giới/kiểm dịch), ngày và trạng thái.
- Tài liệu có thể mở link ngoài. Nếu chưa xác minh, phải gắn nhãn tham khảo; không chép tóm tắt của mô hình và hiển thị như lời khẳng định pháp lý.
- Nếu nguồn thay đổi/không truy cập được, cho phép đánh dấu cần rà soát và ghi nhận người chịu trách nhiệm.

### 37. Báo cáo kiểm dịch & Thẩm định
**Mục tiêu:** xem kết quả thẩm định và các nguyên nhân thường làm chậm hồ sơ.

- KPI/bảng: hồ sơ đã kiểm tra, đang chờ, cần bổ sung, giấy hết hạn, quy tắc chưa xác minh, thời gian chờ theo bước và tuyến.
- Có bộ lọc ngày/đơn/quốc gia/người phụ trách; nhấn vào số liệu mở danh sách nguồn.
- Không tính “đạt” chỉ từ việc đã tải đủ file. Báo cáo cần phân biệt số tài liệu được kiểm tra và số hồ sơ thực sự đáp ứng điều kiện.

### 38. Đánh giá phương án vận chuyển
**Mục tiêu:** đánh giá phương án theo ràng buộc thú y, sức khỏe, tuyến, thời gian và cấu hình.

- Danh sách phương án cho đơn với ETA, các chặng, điểm dừng, nhà vận tải, cấu hình chuồng, điều kiện giấy tờ, cách ly, rủi ro lịch và các điều chưa xác minh.
- Specialist đánh giá theo các nhãn: phù hợp sơ bộ, cần điều chỉnh, chưa đủ dữ liệu, không phù hợp; ghi lý do và điều kiện cần hoàn thành.
- Đánh giá không thay thế phê duyệt thương mại của Manager hay phân công tài nguyên của Coordinator.
- Khi phương án đổi, đánh giá cũ vẫn lưu; cần đánh giá lại nếu thay đổi ảnh hưởng an toàn/hồ sơ/tuyến.

## E. Fleet & Route Coordinator — Màn 39–45

### 39. Trang tổng quan điều phối hiện trường
**Mục tiêu:** theo dõi chuyến sắp chạy, nguồn lực chưa phân, xung đột và sự cố.

- KPI: kế hoạch chờ lập/duyệt, chặng sắp khởi hành, phương tiện thiếu, tài xế/hộ tống chưa phân, lịch tài nguyên trùng, kiểm tra xe còn thiếu, sự cố mở.
- Danh sách ưu tiên theo giờ dự kiến, trạng thái hồ sơ và rủi ro; hiển thị việc cần hoàn thành và người phụ trách.
- Mọi thẻ dẫn đến kế hoạch hoặc danh sách chi tiết, không chỉ hiển thị số liệu tĩnh.

### 40. Kế hoạch & Giám sát các chặng
**Mục tiêu:** tạo/sửa phiên bản kế hoạch nhiều chặng.

- Mỗi chặng: số thứ tự, điểm đi/đến, phương thức, lịch dự kiến, thời gian dự phòng, đối tác, tài sản, nhân sự, tài liệu cần có, trạng thái xác nhận.
- Kiểm tra thứ tự tuyến; thời gian di chuyển/handling/quá cảnh; cửa sổ hoạt động của nhà cung cấp; lịch cách ly; thời gian chuyển giao; thời điểm ngựa cần đến.
- ETA được tính từ thời lượng kế hoạch và mốc thủ công mới nhất, có dấu “ước tính” và thời điểm cập nhật. Không dùng GPS.
- Lưu bản nháp, gửi duyệt, so sánh phiên bản, xử lý phản hồi, phân loại “đã xác nhận” và “đang chờ xác nhận”. Không chỉnh trực tiếp kế hoạch đã duyệt mà không tạo revision.

### 41. Giám sát trạm dừng / Trực trạm
**Mục tiêu:** quản lý những điểm dừng và người chịu trách nhiệm tiếp nhận/chuyển giao.

- Điểm dừng, loại (tập kết, kiểm tra, cách ly, sân bay/cảng, nghỉ, thông quan, bàn giao), giờ dự kiến/giờ thực tế, liên hệ, trạng thái xác nhận, điều kiện tiếp nhận và checklist cần làm.
- Ghi nhận tới/rời trạm thủ công; cập nhật thời điểm, người ghi, ghi chú, tài liệu/ảnh và tình trạng ngựa.
- Nếu trễ hoặc trạm từ chối tiếp nhận, tạo cảnh báo cho Coordinator/Manager, tính ảnh hưởng tới ETA và kiểm tra các chặng phụ thuộc.
- Không coi điểm dừng đã xác nhận chỉ vì Coordinator thêm nó vào kế hoạch.

### 42. Biên bản bàn giao & Niêm phong
**Mục tiêu:** kiểm soát trách nhiệm tại điểm chuyển giao giữa người/đơn vị.

- Trước bàn giao: mã ngựa, số lượng, định danh, tình trạng bên ngoài và quan sát sức khỏe, tài liệu đi kèm, tình trạng chuồng/thiết bị, mã niêm phong nếu áp dụng.
- Thông tin hai bên: người giao, người nhận, đơn vị, địa điểm, thời gian; ghi nhận số niêm phong, tình trạng còn nguyên/hư hỏng và lý do.
- Có checklist xác nhận, ảnh/chứng cứ và trường ký/đính kèm biên bản. Nếu có bất thường, phải tạo sự cố liên kết.
- Không cho đánh dấu hoàn tất khi còn ngựa chưa đối chiếu hoặc thiếu phần bắt buộc của biên bản. Lưu bản sửa đổi nếu biên bản bị bổ sung sau đó.

### 43. Kiểm tra chuồng vận chuyển & Trang thiết bị
**Mục tiêu:** xác nhận tài sản phù hợp với chuyến và sẵn sàng sử dụng.

- Danh sách tài sản/phương tiện, mã tài sản, cấu hình chuồng, sức chứa đã cấu hình, giới hạn kích thước/khối lượng nếu có, hệ thống thông khí/đệm/neo giữ theo checklist áp dụng, vật tư cần thiết, vệ sinh/khử trùng, bảo trì và trạng thái.
- Checklist trước chuyến và sau chuyến: đạt/chưa đạt/không áp dụng, ghi chú, ảnh và người kiểm tra. Ngưỡng kỹ thuật phải đến từ cấu hình/đối tác được xác nhận, không tự bịa số đo.
- Nếu mục kiểm tra bắt buộc chưa đạt, đánh dấu tài sản không sẵn sàng cho chuyến đó cho tới khi có khắc phục/kiểm tra lại.
- Lưu lịch sử kiểm tra, sửa chữa, vệ sinh/khử trùng; không xóa kết quả thất bại trước đó.

### 44. Báo cáo sự cố hiện trường
**Mục tiêu:** ghi nhận sự cố xảy ra trong chuẩn bị/chặng/dừng/bàn giao.

- Trường: chuyến/chặng, ngựa liên quan, thời điểm, vị trí/mốc thủ công, loại sự cố (phương tiện, giao thông, sức khỏe, thông quan/giấy tờ, cơ sở dừng, thời tiết hoặc khác), mức khẩn cấp, mô tả, hành động ban đầu, ảnh/chứng cứ.
- Gửi cảnh báo tới Coordinator và Logistics Manager; nếu liên quan sức khỏe ngựa, thông báo vai trò/chuyên viên phù hợp. Không chờ đủ biểu mẫu dài mới phát cảnh báo khẩn cấp.
- Hiển thị người đã nhận, trạng thái tiếp nhận và cập nhật gần nhất. Cho phép bổ sung diễn biến nhưng không ghi đè phần gốc.
- Khi sự cố ảnh hưởng tuyến/giá/lịch, liên kết đề xuất thay đổi kế hoạch và đề nghị chi phí; không tự phê duyệt khoản ngoài quyền.

### 45. Phân bổ ngựa & Cấu hình chuồng
**Mục tiêu:** ghép ngựa với cấu hình chuồng và tài sản đáp ứng ràng buộc.

- Danh sách ngựa/chuyến kèm định danh, cân nặng/kích thước có nguồn/ngày, tính khí, lịch sử hành vi khi vận chuyển, ghi chú sức khỏe và yêu cầu đặc biệt.
- Các cấu hình có thể gồm chuồng riêng/chung 2/chung 3 nếu tài sản/nhà vận tải thực sự hỗ trợ. Hiển thị sức chứa và giới hạn theo cấu hình tài sản, không chỉ theo số lượng ngựa.
- Trước khi ghép chung: kiểm tra tương thích theo quy tắc được cấu hình, tổng khối lượng/kích thước, tuyến/mode, yêu cầu nhà vận tải và đánh giá của người có chuyên môn khi cần.
- Cùng chủ không tự động cho phép ghép chung. Tính khí hung hăng không phải tiêu chí duy nhất; xem thêm lịch sử hành vi, tuyến và cấu hình.
- Khi thay đổi phân bổ, chạy lại ước tính giá, điều kiện tài sản, sức chứa, an toàn, ETA và các yêu cầu liên quan. Hiển thị nguyên nhân khi cấu hình bị chặn.

## F. Driver / Escort — Màn 46–50

### 46. Tổng quan kíp trực
**Mục tiêu:** hiển thị chuyến và nhiệm vụ được giao hôm nay/tiếp theo.

- Danh sách chuyến được phân công: mã chuyến, vai trò của người dùng, giờ/điểm xuất phát dự kiến, các ngựa liên quan, tuyến tóm tắt, liên hệ điều phối, checklist còn thiếu, sự cố mở.
- Nút mở chi tiết chuyến, bắt đầu checklist, ghi mốc hoặc báo sự cố. UI ưu tiên điện thoại, nút lớn, tránh hiển thị dữ liệu không cần thiết.
- Không cho xem/sửa chuyến chưa được phân công. Khi phân công bị đổi, cập nhật quyền và thông báo.

### 47. Nhật ký sức khỏe ngựa
**Mục tiêu:** ghi nhận quan sát định kỳ theo quy trình chuyến.

- Chọn ngựa từ danh sách của chuyến; ghi thời điểm, người ghi, chỉ số được yêu cầu (ví dụ thân nhiệt, nhịp tim nếu quy trình sử dụng), mức ăn/uống, hành vi, biểu hiện quan sát, ghi chú và ảnh.
- Có thể hiển thị các bản ghi trước đó và mốc cần kiểm tra tiếp theo. Phân biệt dữ liệu đo trực tiếp với dữ liệu quan sát và dữ liệu nhập bù.
- Cảnh báo khi vượt ngưỡng cấu hình đã được người có thẩm quyền thiết lập, ghi rõ ngưỡng và thời điểm; không tự kết luận bệnh hoặc đề xuất điều trị tự động.
- Nếu có bất thường: cho tạo/đính kèm sự cố, gửi điều phối/Manager và vai trò chuyên môn được cấu hình; ghi trạng thái đã tiếp nhận.

### 48. Theo dõi thể trạng & Cấp cứu thú y
**Mục tiêu:** xử lý tình huống sức khỏe bất thường theo quy trình báo động.

- Hiển thị tóm tắt nhật ký gần nhất, các cảnh báo chưa xử lý, thông tin liên hệ chịu trách nhiệm và quy trình liên lạc được cấu hình.
- Driver/Escort có thể chọn mức khẩn cấp, loại biểu hiện, thời điểm, mốc/vị trí thủ công, mô tả, hành động đã làm trong phạm vi hướng dẫn và ảnh/chứng cứ.
- Gửi cảnh báo tới Coordinator/Manager và người liên hệ chuyên môn phù hợp; xác nhận gửi, trạng thái tiếp nhận và thời điểm phản hồi nếu có.
- Không biến hệ thống thành công cụ chẩn đoán/ra y lệnh. Thao tác thuốc hoặc can thiệp thú y không được tự ý đề xuất/ghi như đã được phê duyệt nếu không có người có chuyên môn xác nhận.
- Nếu ảnh hưởng khả năng tiếp tục chuyến, tạo liên kết sự cố và yêu cầu đánh giá lại kế hoạch/ETA.

### 49. Nhật ký xe & Lộ trình đường bộ
**Mục tiêu:** cập nhật các mốc di chuyển và checklist xe trong chặng đường bộ.

- Hiển thị xe được giao, người phụ trách, mã chuyến, chặng hiện tại, điểm dự kiến, chỉ dẫn liên hệ, checklist xe, tình trạng chuồng và các ngựa trên xe.
- Mốc thủ công: chuẩn bị xong, rời điểm, đến điểm dừng, rời điểm dừng, đến sân bay/cảng/nơi bàn giao, tạm dừng. Mỗi mốc có thời gian thực tế, vị trí nhập tay, người ghi, ghi chú và ảnh nếu cần.
- Ghi nhận vấn đề giao thông, xe, thời tiết, cơ sở dừng hoặc trễ dự kiến; gửi cảnh báo đến Coordinator/Manager.
- Không có GPS thời gian thực. Nếu sử dụng tọa độ/vị trí nhập tay phải thể hiện nguồn là do người dùng cung cấp.

### 50. Biên bản bàn giao & Nghiệm thu
**Mục tiêu:** kết thúc trách nhiệm của một chặng hoặc hoàn tất giao ngựa cho bên tiếp nhận.

- Đối chiếu từng ngựa bằng mã/định danh, nơi và giờ giao, người giao/nhận, tình trạng ngựa, số lượng hồ sơ, tình trạng chuồng/niêm phong, ghi chú bất thường, ảnh/biên bản và chữ ký/xác nhận nếu có.
- Nếu phát hiện khác biệt hoặc vấn đề sức khỏe, không chỉ đánh dấu “đã giao”; tạo sự cố liên kết và yêu cầu người nhận xác nhận trạng thái ngoại lệ.
- Khi tất cả mục bắt buộc hoàn tất, ghi nhận mốc bàn giao và thông báo cho khách/Manager/Coordinator theo quyền.
- Cập nhật chuyến sang “Đã bàn giao”; nếu có thời gian hồi phục tiếp theo thì chuyển sang “Đang hồi phục” chứ không nhất thiết “Hoàn thành”. Chỉ đóng cuối cùng khi quy trình hậu bàn giao và sự cố liên quan đã được xử lý.

---

## 11. Ma trận liên kết màn hình và nghiệp vụ

Z.ai phải tạo `docs/implementation-matrix.md` với một dòng cho từng màn hình và các cột tối thiểu:

| Cột | Nội dung phải ghi |
|---|---|
| Mã màn hình | 01–50 theo danh sách đã xác nhận |
| Tên hiện tại | Tên thực tế trong Stitch; không tự đổi nếu phải giữ tên |
| Vai trò | Những vai trò được phép mở và thao tác |
| Mục tiêu | Công việc người dùng cần hoàn thành |
| Dữ liệu đọc | Trường/tập dữ liệu được hiển thị |
| Dữ liệu ghi | Trường được tạo/sửa và người được phép sửa |
| Hành động | Nút/hành động có tác dụng thực tế |
| API | Endpoint/controller/service liên quan hoặc lý do chưa có |
| SQL | Bảng/cột thực tế; chỉ rõ cột nào chưa có và migration đề xuất |
| Quy tắc | Các rule kiểm tra/điều kiện chuyển trạng thái |
| Kiểm thử | Test chức năng/validation/quyền/lỗi liên quan |
| Trạng thái | Chưa làm / Đang làm / Hoàn thành / Mô phỏng / Cần xác minh |
| Bằng chứng | Test/log/ảnh hoặc cách tái hiện chứng minh trạng thái |

Không dùng một API chung giả lập cho mọi màn hình rồi đánh dấu hoàn thành. Các thao tác ghi phải đi qua backend và được xác minh quyền; dữ liệu thật của hệ thống phải lưu ở SQL Server khi cấu hình đã hoàn tất.

## 12. Kiểm thử nghiệp vụ bắt buộc

1. Khách hàng A không thể xem hoặc sửa ngựa/đơn/file của khách hàng B bằng cách đổi ID trên URL/API.
2. Nhập giờ thi đấu nhỏ hơn hoặc trùng bất hợp lý với hạn có mặt/thời gian hồi phục phải báo lỗi hoặc yêu cầu xác nhận; không im lặng chấp nhận.
3. Thiếu ETA/giờ thi đấu/hồi phục thì mức rủi ro là “Chưa đủ dữ liệu đánh giá”.
4. ETA <= latest arrival → đúng kế hoạch; ETA > latest arrival nhưng ETA + hồi phục <= giờ thi đấu → có nguy cơ trễ; ETA + hồi phục > giờ thi đấu → không đáp ứng lịch thi đấu.
5. Tải file lên không tự biến giấy tờ thành hợp lệ. Giấy hết hạn tại ngày/chặng áp dụng phải chặn tiến trình cần tài liệu đó.
6. Đổi quốc gia quá cảnh/tuyến phải đánh giá lại checklist giấy tờ/kiểm dịch, ETA, giờ hồi phục và báo giá.
7. Đổi cấu hình chuồng phải kiểm tra giới hạn tài sản, kích thước/khối lượng, tương thích và ảnh hưởng giá; cùng chủ không đủ điều kiện tự động ghép chung.
8. Không phân cùng một xe/nhân sự/cơ sở cách ly cho hai lịch trùng nhau nếu không có quy tắc giải phóng lịch hợp lệ.
9. Một mục checklist xe bắt buộc “Chưa đạt” ngăn tài sản được đánh dấu sẵn sàng cho chuyến.
10. Sự cố SOS gửi cảnh báo đúng người nhận; trạng thái đã đọc không tự đóng sự cố.
11. Chi phí phát sinh cần lý do, bằng chứng phù hợp và người có quyền duyệt; không tự sửa báo giá lịch sử.
12. Thay đổi kế hoạch đã duyệt tạo revision và lưu giá trị trước/sau.
13. Bàn giao không thể đánh dấu hoàn thành khi chưa đối chiếu hết danh sách ngựa/tài liệu bắt buộc.
14. Nhật ký sức khỏe vượt ngưỡng tạo cảnh báo theo ngưỡng được cấu hình nhưng không đưa ra chẩn đoán tự động.
15. API/SQL Server lỗi phải hiển thị lỗi hữu ích, không hiện thành công giả và không làm mất dữ liệu đã lưu.
16. Trạng thái, thông báo, lịch sử và người thao tác cập nhật nhất quán; tải lại trang/đăng nhập lại không làm mất bản ghi đã lưu.
17. Tài khoản bị vô hiệu hóa/khóa hoặc bị thay vai trò không thể tiếp tục dùng quyền cũ vượt chính sách phiên.
18. Mọi màn hình có trạng thái rỗng, đang tải, lỗi API, lỗi quyền, không tìm thấy dữ liệu và hành động thành công/thất bại.

## 13. Các tài liệu Z.ai phải tạo/cập nhật

- `docs/requirements-business.md`: bản đặc tả nghiệp vụ đã được đối chiếu với 50 màn hình thực tế.
- `docs/implementation-matrix.md`: ma trận 50 màn hình → API → schema → rule → test.
- `docs/state-machines.md`: trạng thái yêu cầu, giấy tờ, chuyến, rủi ro lịch, sự cố và điều kiện chuyển trạng thái.
- `docs/source-conflicts.md`: mâu thuẫn giữa tài liệu cũ, Stitch, REQ và SQL cùng đề xuất xử lý.
- `docs/test-scenarios.md`: kịch bản kiểm thử tích cực/tiêu cực và kết quả đã thực thi.
- `README.md`: cách cấu hình SQL Server, chạy backend Spring Boot, chạy frontend React, dữ liệu mẫu, tài khoản demo và trình diễn 4 luồng cốt lõi.

## 14. Prompt bổ sung có thể dán vào cuối prompt tổng thể

> Hãy coi file `EQUIDELI_NGHIEP_VU_CHI_TIET.md` là đặc tả nghiệp vụ bổ sung, không phải lệnh tự sửa schema một cách mù quáng. Trước khi code, hãy đọc toàn bộ bộ Stitch hiện tại, `REQ.md`, `HorseTransportManagementDB.sql` và workspace. Lập ma trận cho tất cả 50 màn hình thực tế, đối chiếu từng màn hình với nghiệp vụ, vai trò, API, bảng/cột SQL và test.
>
> Dùng chính xác 5 vai trò: Khách hàng, Logistics Manager, Transport Specialist, Fleet & Route Coordinator, Driver/Escort. Không tạo Administrator. Không có GPS thời gian thực, OCR, thanh toán trực tuyến hoặc chẩn đoán thú y tự động. Trạng thái chuyến được cập nhật thủ công. Không tạo màn hình thứ 51 và không thêm lịch thi đấu độc lập nếu thiết kế hiện tại không có màn đó.
>
> Không hardcode quy định giấy tờ/kiểm dịch như luật chung cho mọi tuyến. Danh sách phải được gắn với quốc gia, cửa khẩu, loại hình di chuyển, ngày áp dụng, nguồn và người xác minh. Tài liệu chưa xác minh phải được hiển thị rõ là tham khảo.
>
> Triển khai theo từng luồng, có test và báo cáo: (1) yêu cầu và báo giá; (2) thẩm định giấy tờ/kiểm dịch; (3) lập kế hoạch và phân bổ nguồn lực; (4) cập nhật mốc, sức khỏe, sự cố và bàn giao. Mỗi giai đoạn phải chạy được trước khi chuyển giai đoạn tiếp theo.
>
> Trước khi báo hoàn thành, hãy chạy test và báo chính xác tính năng nào hoạt động thật, tính năng nào chỉ mô phỏng, tính năng nào chưa làm hoặc chưa thể xác minh. Không tuyên bố hệ thống hoàn chỉnh nếu chỉ có giao diện tĩnh hoặc dữ liệu giả.

