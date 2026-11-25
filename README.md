# 🎨 Studio Màu — Chỉnh màu ảnh ngay trên trình duyệt

Ứng dụng web chỉnh sửa màu ảnh chạy hoàn toàn trên trình duyệt (React + Vite + TypeScript + WebGL + Tailwind CSS), giao diện sáng tối giản, tối ưu cho điện thoại. Ảnh gốc được xử lý ngay trên thiết bị bằng WebGL.

🌐 **Trải nghiệm online:** https://tyler-matrix221.github.io/Image-preset/

---

## ✨ Tính năng chính

- **Preset & Nhập file chuyên nghiệp:** 4 preset mặc định (*Gốc*, *Tông lạnh*, *Tông ấm*, *Film nhạt*), hỗ trợ nhập file `.xmp` (Lightroom/ACR) và 3D LUT `.cube`, tự động lưu preset cá nhân vào `localStorage` và hỗ trợ xuất ra file `.xmp`.
- **Trợ lý AI (Gemini Flash):**
  - Gợi ý màu theo **Hot Trend TikTok** (tự cập nhật theo tuần) hoặc prompt tùy chỉnh.
  - **Hút màu ảnh mẫu (AI):** Tải 1 ảnh mẫu để tạo thành Preset mới.
  - **Khớp màu ảnh mẫu (Color Match):** So sánh ảnh hiện tại với ảnh mẫu để bù trừ màu tự động.
  - Hỗ trợ **5 lượt AI miễn phí/ngày** qua Cloudflare Worker Proxy (`cloudflare-worker/`), hoặc nhập API Key cá nhân trong Cài đặt.
- **Tinh chỉnh thủ công & Lịch sử:** 10 thanh ánh sáng/màu sắc + HSL 8 dải màu + nút Hoàn tác / Làm lại (Undo / Redo).
- **So sánh & Xuất ảnh đa nền tảng:** Thanh kéo chia đôi **Trước / Sau**, nút **Giữ để xem gốc**, thanh **Cường độ (0–100%)**, và xuất ảnh theo kích thước **Ảnh gốc**, **TikTok/Reels (9:16)**, **Facebook/IG (4:5, 1:1, 16:9)** định dạng JPEG/PNG.

---

## 🚀 Chạy local

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`.

---

## 🏗️ Kiến trúc chính

- `src/lib/imageEngine.ts` — Engine WebGL (shader màu, 3D LUT trilinear, xuất ảnh đa tỷ lệ)
- `src/lib/geminiApi.ts` — Kết nối Gemini Flash & Cloudflare Worker Proxy
- `src/rules/` — Schema thông số (`params.ts`), Preset mặc định, `.xmp` import/export, `.cube` LUT parser, `customPresets.ts`, `tiktokTrends.ts`
- `src/components/` — `CanvasStage`, `PresetStrip`, `AiSuggestionPanel`, `AdjustPanel`, `ControlsPanel`, `ExportModal`, `ClonePresetModal`, `SettingsModal`
- `cloudflare-worker/` — Proxy serverless giới hạn lượt AI miễn phí theo ngày qua Cloudflare KV
