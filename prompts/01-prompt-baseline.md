# Prompt 1: Khởi Tạo Dự Án & Baseline Ứng Dụng Chỉnh Màu

## Mục tiêu
Xây dựng ứng dụng web chỉnh màu ảnh chạy hoàn toàn phía client (React + Vite + TypeScript + Tailwind CSS), tối ưu cho thiết bị di động, render bằng WebGL shader. Ảnh không được gửi đi bất kỳ đâu — toàn bộ quá trình xử lý diễn ra trực tiếp trên trình duyệt.

## Yêu cầu kỹ thuật & Tính năng
1. **Upload & Hiển thị ảnh**:
   - Cho phép tải lên 1 file ảnh định dạng JPEG hoặc PNG.
   - Vùng canvas hiển thị lớn ở trung tâm màn hình, hỗ trợ responsive, giữ đúng tỉ lệ khung hình (aspect ratio) gốc.
2. **Preset & Cường độ (Intensity)**:
   - Cung cấp sẵn 4 preset cơ bản:
     - `Gốc`: Giữ nguyên thông số mặc định.
     - `Tông lạnh`: Ám xanh lạnh nhẹ, vùng tối phủ tông teal.
     - `Tông ấm`: Tăng sắc vàng ấm, cảm giác nắng chiều.
     - `Film nhạt`: Giảm tương phản, nâng nhẹ shadow mang phong cách ảnh film analog.
   - Thanh trượt Cường độ từ `0` đến `100` để pha trộn giữa ảnh gốc và ảnh đã qua xử lý preset.
3. **So sánh Trước / Sau**:
   - Nút "Giữ để xem gốc" (Hold to compare): Khi nhấn giữ chuột hoặc chạm ngón tay, canvas lập tức hiển thị ảnh gốc; khi nhả tay ra lập tức quay về ảnh đã áp preset/thông số. Bố cục và vị trí khuôn mặt phải đứng yên tuyệt đối, không nhảy giật.
4. **Bộ thông số chỉnh thủ công (10 thông số cơ bản)**:
   - Ánh sáng: Exposure (-2..2), Contrast (-100..100), Highlights (-100..100), Shadows (-100..100), Whites (-100..100), Blacks (-100..100).
   - Màu sắc: Temperature (-1000..1000), Tint (-100..100), Saturation (-100..100), Vibrance (-100..100).
   - Thay đổi thanh trượt cập nhật preview tức thì qua WebGL shader.
5. **Xuất ảnh chất lượng cao**:
   - Preview hiển thị bằng bản thu nhỏ tối đa 2048px để đảm bảo 60fps mượt mà.
   - Khi bấm nút "Xuất ảnh JPEG", render bằng bộ thông số hiệu lực trên độ phân giải gốc của file ảnh người dùng tải lên, tự động tải xuống máy.
6. **Ràng buộc cốt lõi**:
   - Tuyệt đối không dùng AI, không gửi ảnh lên cloud/server.
   - Không crop hay làm biến dạng hình học ảnh.

## Lệnh kiểm tra chất lượng Baseline
```bash
npm install
npm run dev
npm run typecheck
npm run build
```
Commit đánh dấu mốc: `Prompt 1 baseline OK` trên nhánh `image-develop`.
