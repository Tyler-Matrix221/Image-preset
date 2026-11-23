# Bộ Prompt Phát Triển Dự Án — Studio Màu (Image Preset Web App)

Thư mục này lưu trữ toàn bộ các prompt và yêu cầu kỹ thuật theo trình tự thời gian trong quá trình xây dựng, nâng cấp và tinh chỉnh dự án **Studio Màu**.

---

## Danh Sách Các Giai Đoạn (Prompts)

| STT | File Prompt | Mục Tiêu Chính | Kết Quả Đạt Được |
|---|---|---|---|
| **01** | [01-prompt-baseline.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/01-prompt-baseline.md) | Khởi tạo baseline WebGL client-side, 4 preset cơ bản, cường độ, so sánh trước/sau & xuất ảnh JPEG. | App chạy trơn tru, xử lý client-side không qua server, hoàn thành commit `Prompt 1 baseline OK`. |
| **02** | [02-prompt-rules-params-hsl.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/02-prompt-rules-params-hsl.md) | Tách schema thông số `params.ts`, `presets.ts`, xây dựng hàm kẹp `clampParams()`, HSL 8 kênh & guard da cam. | Phân tách kiến trúc logic/rules rõ ràng; bảo vệ màu da không bị cháy/ám màu khi áp preset. |
| **03** | [03-prompt-fix-original-comparison.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/03-prompt-fix-original-comparison.md) | Khắc phục lỗi hiển thị lệch màu giữa preset "Gốc" và nút "Xem ảnh gốc". | Sửa lỗi typo thuật toán `rgb2hsv` trong shader và loại bỏ offset Bayer 0.5. |
| **04** | [04-prompt-natural-presets-tuning.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/04-prompt-natural-presets-tuning.md) | Cân chỉnh lại thông số các preset (Tông lạnh, Tông ấm, Film nhạt) để ảnh trông tự nhiên, không bị gắt 100%. | Chuẩn hóa tỉ lệ HSL uniform 1/100, tinh chỉnh nhiệt độ K và tint cho ảnh tự nhiên, nịnh mắt. |
| **05** | [05-prompt-light-mode.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/05-prompt-light-mode.md) | Chuyển đổi toàn bộ theme từ Dark Mode sang Light Mode hiện đại, sáng sủa, độ tương phản cao. | Giao diện Light Mode phong cách Lightroom / Apple sạch sẽ, dễ nhìn, thanh trượt trực quan. |

---

## Hướng Dẫn Sử Dụng
- Các file prompt được viết theo dạng chỉ thị chi tiết, có thể copy trực tiếp vào các Agent hoặc mô hình AI (Claude, GPT, Gemini) để tái tạo hoặc mở rộng dự án.
- Mọi nguyên tắc cốt lõi: **Không AI, Không Server/Cloud xử lý ảnh, Không crop/thay đổi hình học, 100% WebGL Client-side**.
