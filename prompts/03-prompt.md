# Prompt 3: Nhập Preset Adobe Camera Raw (.xmp) & 3D LUT (.cube) Phía Client

## Mô tả (Description)
- **Mục tiêu**: Mở rộng khả năng tương thích của ứng dụng với toàn bộ hệ sinh thái preset nhiếp ảnh và chỉnh màu điện ảnh chuyên nghiệp:
  - **Phần 3a**: Nhập preset Adobe Camera Raw / Lightroom định dạng `.xmp`.
  - **Phần 3b**: Nhập bảng màu 3D LUT định dạng `.cube` (Adobe / DaVinci Resolve) với kỹ thuật nội suy trilinear mượt mà trên WebGL.
- **Tính năng chính**:
  1. Nút "Nhập preset (.xmp / .cube)" nhận cả 2 định dạng file. Xử lý 100% trong trình duyệt qua JavaScript & WebGL, không gửi dữ liệu lên bất kỳ máy chủ nào.
  2. **Bộ phân tích `.xmp`** ([src/rules/xmpImport.ts](file:///Users/tylernguyen/Documents/TylerMatrix221/src/rules/xmpImport.ts)): Trích xuất các thuộc tính Camera Raw (`crs:`), quy đổi nhiệt độ Kelvin tuyệt đối về mốc trung tính 5500K ($4800\text{K} \rightarrow -700$), và kẹp giá trị qua `clampParams()`.
  3. **Bộ phân tích `.cube`** ([src/rules/cubeImport.ts](file:///Users/tylernguyen/Documents/TylerMatrix221/src/rules/cubeImport.ts)):
     - Đọc `LUT_3D_SIZE` (chấp nhận kích thước 2–64, ví dụ 17, 33, 64).
     - Bỏ qua các dòng chú thích `#` và dòng trống.
     - Tôn trọng `DOMAIN_MIN` và `DOMAIN_MAX` (mặc định 0–1).
     - Nạp toàn bộ dữ liệu RGB $size^3$ điểm màu và đóng gói thành 2D atlas texture kích thước $(size^2 \times size)$.
     - Trích xuất tên preset từ dòng `TITLE`, nếu không có lấy tên file (bỏ đuôi `.cube`).
     - Báo lỗi thân thiện nếu file là `LUT_1D`, thiếu dòng dữ liệu hoặc sai định dạng.
  4. **Áp LUT bằng nội suy Trilinear trong WebGL** ([src/lib/imageEngine.ts](file:///Users/tylernguyen/Documents/TylerMatrix221/src/lib/imageEngine.ts)):
     - Chiều R và G được nội suy bilinear qua phần cứng GPU (`GL_LINEAR`).
     - Chiều B được nội suy tuyến tính giữa 2 lát cắt liền kề trong atlas.
     - Dùng chung một pipeline WebGL cho cả preview thời gian thực và xuất file JPEG độ phân giải gốc đầy đủ.
     - Tuyệt đối không thay đổi kích thước, vị trí hay hình học của ảnh — chỉ đổi màu sắc.
  5. **Tương tác giao diện & Thanh Cường độ**:
     - Preset LUT hiển thị huy hiệu `LUT` riêng biệt trong thanh danh sách preset.
     - Khi chọn LUT: Panel "Tinh chỉnh thủ công" bị vô hiệu hóa kèm thông báo *"LUT không có thông số"*. Khi chọn lại một preset thông số khác, LUT tự tắt và panel mở lại bình thường.
     - Thanh Cường độ điều khiển độ trộn của LUT: 0% $\rightarrow$ ảnh gốc chính xác tuyệt đối; 100% $\rightarrow$ áp toàn bộ LUT; ở giữa là hòa trộn tuyến tính.
     - Giữ xem ảnh gốc và xuất JPEG độ phân giải gốc hoạt động trơn tru.

---

## Nội dung Prompt 3a (Prompt Content 3a — .xmp)

Nâng cấp project hiện tại, KHÔNG làm lại từ đầu, giữ nguyên giao diện và mọi hành vi hiện có:

Thêm nút "Nhập preset (.xmp)" cạnh danh sách preset. Bấm vào thì mở hộp chọn file .xmp từ máy người dùng. Toàn bộ việc đọc và phân tích file làm ngay trong trình duyệt, không tải file lên server nào.
Viết bộ phân tích preset trong src/rules/xmpImport.ts: đọc nội dung text của file .xmp, trích các giá trị crs: của Camera Raw gồm: Exposure2012, Contrast2012, Highlights2012, Shadows2012, Whites2012, Blacks2012, Temperature, Tint, Vibrance, Saturation, HueAdjustment/SaturationAdjustment/LuminanceAdjustment cho 8 kênh (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta), SplitToningShadowHue, SplitToningShadowSaturation. Tên preset lấy từ crs:Name nếu có, không có thì lấy tên file.
Ánh xạ sang thông số của app: Exposure2012 → exposure (đúng thang của nó); Contrast/Highlights/Shadows/Whites/Blacks → các thông số cùng tên; Tint, Vibrance, Saturation → cùng tên; các giá trị Adjustment → HSL của kênh tương ứng; SplitToningShadow → split tone vùng tối. Riêng Temperature trong file .xmp là nhiệt độ màu tuyệt đối (ví dụ 4800K): quy đổi thành độ lệch so với mốc trung tính 5500K (4800 → −700). Trường nào file không có thì giữ mặc định của app.
BẮT BUỘC: mọi giá trị import đều phải đi qua clampParams() trước khi dùng, giống mọi nguồn thông số khác. Không được bypass trong bất kỳ trường hợp nào.
Preset import thành công thì xuất hiện trong danh sách preset như một preset bình thường: chọn là áp lên ảnh, panel hiển thị đúng các số đã import, thanh Cường độ và giữ-xem-gốc và xuất ảnh hoạt động y hệt preset có sẵn.
File không phải .xmp hợp lệ hoặc không đọc được giá trị nào: hiện thông báo lỗi thân thiện, app không sập, preset đang dùng không thay đổi.
Vẫn giữ các giới hạn cũ: không AI, không RAW, chưa hỗ trợ .cube ở bước này, không thay đổi hình học ảnh.

---

## Nội dung Prompt 3b (Prompt Content 3b — .cube LUT)

Nâng cấp project hiện tại, KHÔNG làm lại từ đầu, giữ nguyên giao diện và mọi hành vi hiện có (preset thường, import .xmp, panel, Cường độ, xem gốc, xuất ảnh):

Mở rộng nút nhập preset để nhận thêm file .cube (LUT). Toàn bộ việc đọc và phân tích file làm trong trình duyệt, không tải lên server.
Viết bộ phân tích LUT trong src/rules/cubeImport.ts: đọc LUT_3D_SIZE (chấp nhận 2–64), bỏ qua dòng chú thích bắt đầu bằng #, tôn trọng DOMAIN_MIN/DOMAIN_MAX nếu có (mặc định 0–1), và nạp toàn bộ bảng dữ liệu RGB. Tên LUT lấy từ dòng TITLE nếu có, không có thì lấy tên file. File chỉ có LUT_1D, thiếu dữ liệu, hoặc không đúng định dạng .cube: báo lỗi thân thiện, app không sập, trạng thái đang dùng không đổi.
Áp LUT trong bước render ảnh như một lớp ánh xạ màu thuần túy theo từng pixel, có nội suy trilinear để chuyển màu mượt, dùng chung một đường render cho cả ảnh xem trước và ảnh xuất (kết quả hai nơi phải giống nhau). LUT tuyệt đối không được thay đổi kích thước, vị trí hay hình học của ảnh — chỉ đổi màu.
LUT import thành công xuất hiện trong danh sách preset với nhãn riêng phân biệt với preset thông số. Khi LUT đang được chọn: panel thông số bị vô hiệu hóa kèm dòng ghi chú "LUT không có thông số", chọn một preset thông số bất kỳ thì LUT tự tắt và panel hoạt động lại bình thường.
Thanh Cường độ điều khiển độ trộn của LUT: Cường độ 0 → ảnh gốc chính xác tuyệt đối dù LUT đang chọn; 100 → áp toàn bộ LUT; ở giữa là trộn tuyến tính giữa ảnh gốc và ảnh đã áp LUT. Giữ-xem-gốc và xuất JPEG độ phân giải gốc hoạt động bình thường khi LUT đang chọn.
