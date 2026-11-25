# Bộ Prompt Phát Triển Dự Án — Studio Màu (Image Preset Web App)

Thư mục này lưu trữ tài liệu đặc tả và các prompt tiêu chuẩn theo từng giai đoạn phát triển của dự án **Studio Màu**. Mỗi file bao gồm phần **Mô tả (Description)** tổng hợp bối cảnh, mục tiêu và ràng buộc kỹ thuật, cùng với **Nội dung Prompt (Prompt Content)** nguyên bản để có thể tái tạo hoặc chuyển tiếp cho AI Agent.

---

## Danh Sách Các Prompts

| File Prompt | Tiêu Đề Giai Đoạn | Tóm Tắt Mục Tiêu Kỹ Thuật | Trạng Thái |
|---|---|---|---|
| [01-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/01-prompt.md) | **Prompt 1: Baseline Web App** | Khởi tạo web app React + Vite + TypeScript + WebGL client-side; 4 preset cơ bản; thanh Cường độ; giữ xem gốc; xuất JPEG gốc. | Hoàn thành (`Prompt 1 baseline OK`) |
| [02-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/02-prompt.md) | **Prompt 2: Rules & HSL Guards** | Tách file `params.ts` & `presets.ts`; schema thông số 3 nhóm; hàm kẹp `clampParams()`; reset đúp chuột; HSL 8 kênh; guard bảo vệ màu da cho Tông lạnh. | Hoàn thành |
| [03-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/03-prompt.md) | **Prompt 3a: Nhập Preset .XMP** | Nhập preset Adobe Camera Raw (.xmp) phía client; phân tích text/XML `src/rules/xmpImport.ts`; ánh xạ thông số & quy đổi nhiệt độ màu; kẹp qua `clampParams()`. | Hoàn thành (`Prompt 3a OK`) |
| [03-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/03-prompt.md#nội-dung-prompt-3b-prompt-content-3b--cube-lut) | **Prompt 3b: Nhập 3D LUT (.cube)** | Mở rộng nút nhập nhận file `.cube`; phân tích `LUT_3D_SIZE` (2–64) trong `src/rules/cubeImport.ts`; nội suy trilinear WebGL; nhãn `LUT`; vô hiệu hóa panel thông số khi chọn LUT; thanh Cường độ 0–100%. | Hoàn thành (`Prompt 3b OK`) |
| [04-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/04-prompt.md) | **Prompt 4: AI Gợi Ý Màu (Gemini API)** | Cài đặt Gemini API key lưu trong `localStorage`; gửi ảnh thu nhỏ 512px; model Flash phản hồi 1.5s; lọc whitelist & kẹp `clampParams()`; banner Hot Trend TikTok theo tuần. | Hoàn thành (`Prompt 4 OK`) |
| [05-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/05-prompt.md) | **Prompt 5: AI Clone Màu & Color Match Từ Ảnh Mẫu** | Cách 1: Tích hợp vào menu Nhập Preset để tạo Preset từ 1 ảnh mẫu tải trên mạng. Cách 2: Khớp màu 2 ảnh trực tiếp (Color Match) trong Panel AI. | Đang thực hiện |

---

## Nguyên Tắc Cốt Lõi Dự Án
1. **100% Client-side**: Mọi tính toán, áp filter, phân tích file `.xmp` / `.cube` và xuất ảnh diễn ra hoàn toàn trên trình duyệt người dùng qua WebGL.
2. **Bảo Vệ Tính Toàn Vẹn Ảnh**: Tuyệt đối không dùng AI để sinh ảnh hay bóp méo hình học/khuôn mặt; AI chỉ gợi ý các con số thông số màu/ánh sáng theo schema nghiêm ngặt.
3. **An Toàn Dữ Liệu**: Mọi giá trị tham số từ bất kỳ nguồn nào (preset mặc định, slider, file XMP import, AI response) đều phải đi qua `clampParams()`.
4. **Bảo Vệ API Key & Quyền Riêng Tư**: API Key chỉ lưu trong `localStorage` máy người dùng, không bao giờ gửi đi đâu khác ngoài Google. Ảnh gửi lên AI chỉ là bản thu nhỏ tối đa 1024px và có thông báo rõ ràng cho người dùng.
