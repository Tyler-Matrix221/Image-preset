# Prompt 5: Chuyển Đổi Toàn Bộ Giao Diện Sang Light Mode

## Bối cảnh & Yêu cầu
Người dùng phản ánh: "Giao diện Darkmode hiện tại khó nhìn quá, chỉnh giúp tôi qua giao diện lightmode".

Yêu cầu chuyển đổi toàn diện giao diện từ Dark Mode (`zinc-950`) sang **Light Mode** sáng sủa, thanh lịch, dễ nhìn, độ tương phản cao (phong cách Apple / Adobe Lightroom / Figma), đồng thời giữ nguyên 100% logic xử lý ảnh và các tính năng hiện tại.

## Chi tiết các thay đổi theo file

1. **`index.html`**:
   - Chuyển `theme-color` từ `#09090b` sang `#f4f4f5`.
   - Chuyển `apple-mobile-web-app-status-bar-style` sang `default`.

2. **`src/index.css`**:
   - `body`: Đổi sang `bg-zinc-100 text-zinc-900`.
   - Tùy chỉnh lại CSS của thanh trượt `.param-range`:
     - Rãnh trượt (track): Màu xám nhạt `bg-zinc-300` thay vì nền tối.
     - Nút trượt (thumb): Màu trắng sáng `bg-white`, viền cam amber (`border-amber-500`), đổ bóng mềm `shadow-sm`.

3. **`src/App.tsx`**:
   - Thân trang: `bg-zinc-100 text-zinc-900`.
   - Header: `bg-white/80 backdrop-blur-md border-b border-zinc-200/80`.
   - Bottom Dock chứa các bảng điều khiển: `bg-white/95 border-t border-zinc-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]`.
   - Badge thông báo lỗi WebGL: `bg-red-100/90 text-red-700 border-red-300`.

4. **`src/components/CanvasStage.tsx`**:
   - Vùng chứa canvas: `bg-zinc-200/50`.
   - Khung canvas: Đổ bóng nổi `shadow-[0_6px_30px_rgba(0,0,0,0.12)]`, viền nhẹ `border border-zinc-300/60`.
   - Badge "Ảnh gốc": `bg-zinc-900/85 text-white shadow-md`.

5. **`src/components/UploadZone.tsx`**:
   - Khung kéo thả ảnh: `bg-white border-2 border-dashed border-zinc-300 shadow-sm`.
   - Icon tải ảnh: Nền vàng nhạt `bg-amber-100 text-amber-600`.
   - Tiêu đề & mô tả: Chữ xám đậm `text-zinc-800` và `text-zinc-500`.

6. **`src/components/PresetStrip.tsx`**:
   - Preset button thường: `bg-white border-zinc-200 text-zinc-700 shadow-xs hover:border-zinc-300`.
   - Preset button đang chọn (Active): `border-amber-500 bg-amber-500/15 text-amber-900 font-semibold shadow-xs`.

7. **`src/components/AdjustPanel.tsx` & `src/components/ParamSlider.tsx` & `src/components/HslSection.tsx`**:
   - Khung bảng thông số: Nền trắng `bg-white border-zinc-200 shadow-xs`.
   - Nút "Đặt lại tất cả": `bg-zinc-50 border-zinc-300 text-zinc-700 hover:bg-zinc-100`.
   - Thêm thanh cuộn linh hoạt `max-h-[45vh] overflow-y-auto` để tránh che khuất nút thao tác phía dưới khi mở nhiều nhóm.
   - Thanh trượt và ô số: Nền trắng, nhãn đen đậm `text-zinc-900`, ô số viền cam `border-amber-500 bg-white text-amber-700`.
   - Thẻ HSL: Accordion nền trắng viền xám sáng, từng ô màu có nút reset và badge trực quan.

8. **`src/components/ControlsPanel.tsx`**:
   - Nút "Giữ để xem gốc": Nền trắng `bg-white border-zinc-200 text-zinc-700`, khi nhấn giữ chuyển sang `border-amber-500 bg-amber-500/15 text-amber-900`.
   - Nút "Xuất ảnh JPEG": Nền vàng cam `bg-amber-400 text-zinc-950 font-bold hover:bg-amber-300`.

## Tiêu chí nghiệm thu
- Không phát sinh lỗi TypeScript (`npm run typecheck`).
- Bản build production hoàn tất sạch sẽ (`npm run build`).
- Trực quan giao diện: Sáng, rõ nét, các nút bấm và thanh trượt có độ tương phản cao, thao tác nhạy bén trên cả desktop lẫn mobile.
