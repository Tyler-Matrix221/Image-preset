# Prompt 3: Nhập Preset Adobe Camera Raw (.xmp) Phía Client

## Mô tả (Description)
- **Mục tiêu**: Mở rộng khả năng tương thích của ứng dụng với hệ sinh thái nhiếp ảnh chuyên nghiệp bằng cách cho phép người dùng nạp trực tiếp file preset định dạng `.xmp` (Adobe Lightroom / Camera Raw) ngay trên trình duyệt.
- **Tính năng chính**:
  1. Nút "Nhập preset (.xmp)" đặt cạnh thanh danh sách preset.
  2. Bộ phân tích XML/XMP client-side trong `src/rules/xmpImport.ts` trích xuất các thuộc tính Camera Raw (`crs:`):
     - Ánh sáng: Exposure2012, Contrast2012, Highlights2012, Shadows2012, Whites2012, Blacks2012.
     - Màu sắc: Temperature, Tint, Vibrance, Saturation.
     - HSL 8 kênh: HueAdjustment, SaturationAdjustment, LuminanceAdjustment cho 8 kênh màu (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta).
     - Split Toning vùng tối: SplitToningShadowHue, SplitToningShadowSaturation.
     - Tên preset: Ưu tiên lấy từ `crs:Name`, nếu không có lấy tên file (bỏ đuôi `.xmp`).
  3. Quy đổi nhiệt độ màu: `Temperature` tuyệt đối trong file .xmp (ví dụ 4800K) được quy đổi sang độ lệch so với mốc trung tính 5500K ($4800 - 5500 = -700$).
  4. An toàn dữ liệu: Mọi giá trị import BẮT BUỘC phải đi qua `clampParams()`.
  5. Trải nghiệm người dùng: Preset sau khi import xuất hiện trong thanh danh sách preset, tự động kích hoạt áp lên ảnh và hiển thị lên panel; nếu file lỗi thì hiển thị thông báo thân thiện và không làm gián đoạn ứng dụng.
- **Ràng buộc**: Xử lý 100% trong trình duyệt, không gửi file lên server, không AI, chưa hỗ trợ file 3D LUT .cube ở bước này.

---

## Nội dung Prompt (Prompt Content)

Nâng cấp project hiện tại, KHÔNG làm lại từ đầu, giữ nguyên giao diện và mọi hành vi hiện có:

Thêm nút "Nhập preset (.xmp)" cạnh danh sách preset. Bấm vào thì mở hộp chọn file .xmp từ máy người dùng. Toàn bộ việc đọc và phân tích file làm ngay trong trình duyệt, không tải file lên server nào.
Viết bộ phân tích preset trong src/rules/xmpImport.ts: đọc nội dung text của file .xmp, trích các giá trị crs: của Camera Raw gồm: Exposure2012, Contrast2012, Highlights2012, Shadows2012, Whites2012, Blacks2012, Temperature, Tint, Vibrance, Saturation, HueAdjustment/SaturationAdjustment/LuminanceAdjustment cho 8 kênh (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta), SplitToningShadowHue, SplitToningShadowSaturation. Tên preset lấy từ crs:Name nếu có, không có thì lấy tên file.
Ánh xạ sang thông số của app: Exposure2012 → exposure (đúng thang của nó); Contrast/Highlights/Shadows/Whites/Blacks → các thông số cùng tên; Tint, Vibrance, Saturation → cùng tên; các giá trị Adjustment → HSL của kênh tương ứng; SplitToningShadow → split tone vùng tối. Riêng Temperature trong file .xmp là nhiệt độ màu tuyệt đối (ví dụ 4800K): quy đổi thành độ lệch so với mốc trung tính 5500K (4800 → −700). Trường nào file không có thì giữ mặc định của app.
BẮT BUỘC: mọi giá trị import đều phải đi qua clampParams() trước khi dùng, giống mọi nguồn thông số khác. Không được bypass trong bất kỳ trường hợp nào.
Preset import thành công thì xuất hiện trong danh sách preset như một preset bình thường: chọn là áp lên ảnh, panel hiển thị đúng các số đã import, thanh Cường độ và giữ-xem-gốc và xuất ảnh hoạt động y hệt preset có sẵn.
File không phải .xmp hợp lệ hoặc không đọc được giá trị nào: hiện thông báo lỗi thân thiện, app không sập, preset đang dùng không thay đổi.
Vẫn giữ các giới hạn cũ: không AI, không RAW, chưa hỗ trợ .cube ở bước này, không thay đổi hình học ảnh.
