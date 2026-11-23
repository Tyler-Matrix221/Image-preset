# Prompt 3: Kiểm Tra & Khắc Phục Lệch Màu Preset "Gốc" vs "Xem Ảnh Gốc"

## Bối cảnh & Hiện tượng lỗi
Người dùng phản ánh: "Khi tôi chọn profile là Gốc, tuy nhiên khi nhấn giữ button Xem ảnh Gốc thì lại ra 2 filter khác nhau".
- Khi chọn preset `Gốc`, tất cả thông số đều ở mức mặc định (0).
- Khi nhấn giữ nút "Xem ảnh gốc", app vẽ texture ảnh gốc lên canvas.
- Tuy nhiên, 2 hình ảnh này lại có màu sắc và độ sáng khác nhau (ảnh qua preset Gốc bị sáng hơn và hơi ngả vàng/xanh bất thường).

## Yêu cầu kiểm tra & Sửa lỗi
1. **Kiểm tra shader WebGL trong `src/lib/imageEngine.ts`**:
   - Kiểm tra ma trận cân bằng trắng Bayer (Bayer white balance offset):
     - Lỗi tìm thấy: `vec3 b = BAYER * vec3(0.5, uTemperature * 0.5, uTint * 0.5);` khiến ngay cả khi `temperature = 0` và `tint = 0`, giá trị kênh đỏ vẫn bị cộng offset cơ sở `0.5`, làm ảnh sáng lên 50% so với ảnh gốc.
     - Khắc phục: Đưa base offset về `0.0`: `vec3 b = BAYER * vec3(0.0, uTemperature * 0.5, uTint * 0.5);`.
2. **Kiểm tra hàm biến đổi màu RGB sang HSV (`rgb2hsv`)**:
   - Lỗi tìm thấy trong công thức tính độ bão hòa (Chroma Delta):
     `float d = q.x - min(q.w, q.x);` — biến thứ hai bị viết nhầm thành `q.x` thay vì `q.y`.
     Điều này khiến delta $d = q.x - q.x = 0$ khi $q.w \ge q.x$, dẫn đến tính sai hoàn toàn góc Hue và Saturation trong không gian HSV, làm biến sắc màu da người sang vàng chanh/xanh lá.
     - Khắc phục: Sửa lại đúng công thức chuẩn: `float d = q.x - min(q.w, q.y);`.
3. **Bypass HSL khi delta = 0**:
   - Thêm cờ hoặc điều kiện kiểm tra nếu tổng độ lệch các kênh HSL bằng 0 thì bỏ qua bước chuyển đổi RGB $\leftrightarrow$ HSV để giữ nguyên 100% độ chính xác của điểm ảnh gốc.

## Kết quả kiểm tra
Khi chọn preset `Gốc` và nhấn giữ "Xem ảnh gốc", 2 khung hình trùng khớp từng pixel, không còn hiện tượng đổi tông màu hay đổi độ sáng.
