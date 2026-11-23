# Prompt 1: Khởi Tạo Web App Chỉnh Màu Ảnh Phía Client (Baseline)

## Mô tả (Description)
- **Mục tiêu**: Thiết lập nền tảng dự án web app Studio Màu chạy 100% phía client bằng React, Vite, TypeScript, Tailwind CSS, render ảnh tức thì qua WebGL shader.
- **Tính năng chính**:
  1. Tải lên 1 ảnh JPEG/PNG, hiển thị canvas trung tâm, giữ nguyên tỉ lệ gốc.
  2. 4 preset nền tảng: Gốc, Tông lạnh (ám teal nhẹ vùng tối), Tông ấm, Film nhạt.
  3. Thanh trượt Cường độ 0–100 pha trộn ảnh gốc và ảnh hiệu chỉnh.
  4. Nút giữ/thả "Xem gốc" so sánh trực tiếp, vị trí ảnh và khuôn mặt đứng yên.
  5. Xuất ảnh JPEG ở độ phân giải gốc đầy đủ.
  6. Panel tinh chỉnh thủ công 10 thông số cơ bản (EditParams).
- **Ràng buộc kiến trúc**: Hoàn toàn không backend, không AI, không lưu trữ server, không thay đổi hình học ảnh.

---

## Nội dung Prompt (Prompt Content)

Hãy tạo một web app chỉnh sửa ảnh chạy hoàn toàn phía client (không backend), dùng React + Vite + TypeScript + Tailwind CSS, giao diện mobile-first, nền tối, tối ưu cho màn hình iPhone.

Luồng chính: (1) Người dùng upload 1 ảnh JPEG/PNG. (2) Ảnh hiển thị lớn ở giữa màn hình. (3) Bên dưới là danh sách preset dạng thẻ ngang: "Gốc", "Tông lạnh", "Tông ấm", "Film nhạt". (4) Chọn preset sẽ áp một bộ thông số màu lên ảnh. (5) Một thanh trượt "Cường độ" 0–100 để pha trộn ảnh gốc với ảnh đã chỉnh. (6) Nút giữ/thả "Xem gốc" để so sánh trước/sau. (7) Nút "Xuất ảnh" tải xuống file JPEG ở độ phân giải gốc.

Yêu cầu kỹ thuật bắt buộc:

Định nghĩa type EditParams gồm: exposure (-2..2), temperature (-100..100), tint (-100..100), contrast (-100..100), highlights (-100..100), shadows (-100..100), whites (-100..100), blacks (-100..100), saturation (-100..100), vibrance (-100..100). Mỗi preset là một object EditParams.
Việc chỉnh ảnh PHẢI thực hiện bằng cách biến đổi màu/ánh sáng theo EditParams trên Canvas/WebGL. TUYỆT ĐỐI không dùng AI sinh ảnh, không thay đổi kích thước, bố cục hay bất kỳ chi tiết hình học nào của ảnh.
Preview có thể dùng ảnh thu nhỏ tối đa 2048px cho mượt, nhưng khi xuất ảnh phải áp đúng thông số lên ảnh độ phân giải gốc.
Có thêm panel slider cho từng thông số trong EditParams để người dùng tinh chỉnh tay sau khi chọn preset; mọi slider thay đổi phải cập nhật preview ngay.
Preset mẫu: Tông lạnh = temperature -45, tint +5, saturation -10, highlights -15, shadows +10 kèm ám teal nhẹ ở vùng tối; Tông ấm = temperature +40, saturation +5; Film nhạt = contrast -20, highlights -25, blacks +25, saturation -20.
Chưa làm ở bước này: không AI, không upload preset, không RAW, không tài khoản, không lưu trữ server. Ảnh không được gửi đi đâu, chỉ xử lý trong trình duyệt.
Hãy tạo project hoàn chỉnh chạy được, kèm hướng dẫn ngắn cách chạy local và cách deploy lên Vercel.

## Lệnh kiểm tra chất lượng Baseline
```bash
npm install
npm run dev
npm run typecheck
npm run build
```
Commit đánh dấu mốc: `Prompt 1 baseline OK` trên nhánh `image-develop`.
