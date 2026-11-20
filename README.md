# Studio Màu — Web app chỉnh màu ảnh chạy phía client

Ứng dụng chỉnh sửa màu ảnh hoàn toàn trong trình duyệt (React + Vite + TypeScript + Tailwind CSS), tối ưu cho điện thoại, nền tối. Ảnh không được gửi đi đâu — mọi xử lý diễn ra trên thiết bị bằng WebGL.

## Tính năng

- Upload ảnh JPEG/PNG, hiển thị lớn giữa màn hình
- 4 preset: **Gốc**, **Tông lạnh** (ám teal nhẹ vùng tối), **Tông ấm**, **Film nhạt**
- Thanh trượt **Cường độ** 0–100 pha trộn ảnh gốc với ảnh đã chỉnh
- Nút **giữ để xem gốc** so sánh trước/sau
- **Xuất ảnh** JPEG ở độ phân giải gốc
- Panel tinh chỉnh thủ công 10 thông số: exposure, temperature, tint, contrast, highlights, shadows, whites, blacks, saturation, vibrance — cập nhật preview ngay lập tức
- Preview dùng bản thu nhỏ tối đa 2048px; khi xuất ảnh, bộ thông số được áp lên ảnh gốc độ phân giải đầy đủ

## Chạy local

```bash
npm install
npm run dev
```

Mở địa chỉ hiển thị trong terminal (mặc định `http://localhost:5173`).

## Deploy lên Vercel

Cách 1 — qua giao diện Vercel:

1. Đẩy code lên GitHub
2. Vào [vercel.com](https://vercel.com) → **Add New Project** → chọn repository
3. Vercel tự nhận Vite, để mặc định và bấm **Deploy**

Cách 2 — qua terminal:

```bash
npm i -g vercel
vercel        # deploy preview
vercel --prod # deploy production
```

## Kiến trúc

- `src/types.ts` — kiểu `EditParams`, metadata slider, định nghĩa preset
- `src/lib/imageEngine.ts` — engine WebGL: shader biến đổi màu/ánh sáng theo `EditParams` (không thay đổi hình học), xuất ảnh độ phân giải gốc
- `src/components/` — `CanvasStage`, `PresetStrip`, `AdjustPanel`, `ControlsPanel`, `ParamSlider`, `UploadZone`
