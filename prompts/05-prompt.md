# Đặc Tả Prompt 5: AI Clone Màu & Color Match Từ Ảnh Mẫu

## Mục Tiêu & Phạm Vi
Nâng cấp ứng dụng `Studio Màu` với 2 tính năng sao chép tone màu từ ảnh tham chiếu (ảnh tải trên TikTok, Facebook, Pinterest, Instagram, v.v.):
1. **Cách 1: Tạo Preset mới từ 1 ảnh mẫu (AI Clone Color to Preset)**:
   - Tích hợp trực tiếp vào nút/menu "Nhập preset".
   - Người dùng tải lên 1 ảnh mẫu bất kỳ (`.jpg`, `.png`, `.webp`, ảnh chụp màn hình).
   - Cho phép đặt tên preset (hoặc lấy tên file / AI tự gợi ý tên ngắn gọn).
   - AI phân tích màu sắc, ánh sáng, HSL của ảnh mẫu và trích xuất thành bộ thông số chuẩn `EditParams`.
   - Kết quả: Tạo thành một Preset mới xuất hiện trên thanh `PresetStrip` kèm nhãn `AI`, có thể áp dụng cho nhiều bức ảnh khác nhau.
2. **Cách 2: Khớp màu 2 ảnh trực tiếp (Color Match 2 Images)**:
   - Tích hợp trong thẻ "AI gợi ý chỉnh màu" của màn hình biên tập.
   - Cho phép người dùng đính kèm 1 ảnh tham chiếu mong muốn học theo màu.
   - Gửi đồng thời bản thu nhỏ của **Ảnh đang chỉnh (Target Image A)** và **Ảnh mẫu (Reference Image B)** tới Gemini.
   - AI tính toán độ chênh lệch ánh sáng, nhiệt độ K và sắc độ từng kênh HSL để đề xuất bộ thông số áp trực tiếp vào ảnh đang chỉnh, giúp ảnh đạt mood màu khớp nhất với ảnh mẫu.

---

## Tiêu Chuẩn Kỹ Thuật & An Toàn
1. **100% Giữ nguyên chất lượng ảnh gốc**:
   - AI tuyệt đối không sinh ảnh mới, không can thiệp vào bố cục, độ phân giải hay khuôn mặt.
   - AI chỉ trả về một chuỗi JSON thuần chứa các con số thông số theo schema chuẩn trong `src/rules/params.ts`.
2. **Payload nhẹ & Tốc độ cao**:
   - Cả ảnh đang chỉnh và ảnh mẫu đều được nén thành bản thu nhỏ tối đa 512px (JPEG 75%), dung lượng chỉ ~30–40KB/ảnh.
   - Sử dụng chuỗi model Flash (`gemini-2.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.5-flash`) cho thời gian phản hồi siêu nhanh (~1.5s).
3. **Lọc Whitelist & Kẹp `clampParams()`**:
   - Toàn bộ kết quả từ AI bắt buộc đi qua bộ lọc whitelist và hàm `clampParams()` trước khi nạp vào preset/panel.
4. **Giữ nguyên 100% tính năng hiện có**:
   - Preset mặc định, import `.xmp` / `.cube`, panel thanh trượt, HSL 8 kênh, thanh Cường độ, giữ xem gốc, xuất ảnh JPEG độ phân giải gốc.
