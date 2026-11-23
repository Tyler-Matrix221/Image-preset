# Bộ Prompt Phát Triển Dự Án — Studio Màu (Image Preset Web App)

Thư mục này lưu trữ tài liệu đặc tả và các prompt tiêu chuẩn theo từng giai đoạn phát triển của dự án **Studio Màu**. Mỗi file bao gồm phần **Mô tả (Description)** tổng hợp bối cảnh, mục tiêu và ràng buộc kỹ thuật, cùng với **Nội dung Prompt (Prompt Content)** nguyên bản để có thể tái tạo hoặc chuyển tiếp cho AI Agent.

---

## Danh Sách Các Prompts

| File Prompt | Tiêu Đề Giai Đoạn | Tóm Tắt Mục Tiêu Kỹ Thuật | Trạng Thái |
|---|---|---|---|
| [01-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/01-prompt.md) | **Prompt 1: Baseline Web App** | Khởi tạo web app React + Vite + TypeScript + WebGL client-side; 4 preset cơ bản; thanh Cường độ; giữ xem gốc; xuất JPEG gốc. | Hoàn thành (`Prompt 1 baseline OK`) |
| [02-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/02-prompt.md) | **Prompt 2: Rules & HSL Guards** | Tách file `params.ts` & `presets.ts`; schema thông số 3 nhóm; hàm kẹp `clampParams()`; reset đúp chuột; HSL 8 kênh; guard bảo vệ màu da cho Tông lạnh. | Hoàn thành |
| [03-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/03-prompt.md) | **Prompt 3a: Nhập Preset .XMP** | Nhập preset Adobe Camera Raw (.xmp) phía client; phân tích text/XML `src/rules/xmpImport.ts`; ánh xạ thông số & quy đổi nhiệt độ màu; kẹp qua `clampParams()`. | Hoàn thành (`Prompt 3a OK`) |
| [03-prompt.md](file:///Users/tylernguyen/Documents/TylerMatrix221/prompts/03-prompt.md#nội-dung-prompt-3b-prompt-content-3b--cube-lut) | **Prompt 3b: Nhập 3D LUT (.cube)** | Mở rộng nút nhập nhận file `.cube`; phân tích `LUT_3D_SIZE` (2–64) trong `src/rules/cubeImport.ts`; nội suy trilinear WebGL; nhãn `LUT`; vô hiệu hóa panel thông số khi chọn LUT; thanh Cường độ 0–100%. | Hoàn thành |

---

## Nguyên Tắc Cốt Lõi Dự Án
1. **100% Client-side**: Mọi tính toán, áp filter, phân tích file `.xmp` / `.cube` và xuất ảnh diễn ra hoàn toàn trên trình duyệt người dùng qua WebGL.
2. **Bảo Vệ Tính Toàn Vẹn Ảnh**: Tuyệt đối không dùng AI, không gửi ảnh lên máy chủ, không biến dạng hay crop khung hình.
3. **An Toàn Dữ Liệu**: Mọi giá trị tham số từ bất kỳ nguồn nào (preset mặc định, slider, file XMP import) đều phải đi qua `clampParams()`.
4. **Nội Suy Trilinear Mượt Mà**: File 3D LUT được giải nén thành texture atlas 2D và nội suy 3 chiều trilinear trên GPU, cho màu sắc mượt mà không bị vỡ dải gradient (banding).
