# Prompt 2: Tách Kiến Trúc Rules, Schema Thông Số, HSL 8 Kênh & Guard Màu Da

## Mô tả (Description)
- **Mục tiêu**: Tách biệt tầng dữ liệu cấu hình thông số và preset ra khỏi logic giao diện (`src/rules/params.ts`, `src/rules/presets.ts`), xây dựng hệ thống kiểm soát giá trị an toàn tuyệt đối và mở rộng bộ công cụ màu chuyên nghiệp.
- **Tính năng chính**:
  1. Định nghĩa `ParamSchema` cho từng thông số (min, max, def, step, label tiếng Việt, nhóm hiển thị).
  2. Ba nhóm thông số: **Ánh sáng** (6 thông số), **Màu sắc** (4 thông số), và **HSL** (8 kênh màu: Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta; mỗi kênh có Hue, Saturation, Luminance).
  3. Hàm kẹp bắt buộc `clampParams()`: Đảm bảo mọi giá trị từ preset, slider hay can thiệp file đều được kẹp chuẩn trong khoảng hợp lệ, không gây crash hoặc áp sai dải màu.
  4. Panel thông số 3 nhóm có hỗ trợ reset từng thanh trượt bằng thao tác **bấm đúp (double-click)** và nút "Đặt lại tất cả".
  5. Định nghĩa rõ công thức liên kết giữa Panel và thanh Cường độ: $\text{effective} = \text{default} + (\text{panel} - \text{default}) \times \frac{\text{intensity}}{100}$.
  6. Guard cứng bảo vệ màu da cho preset Tông lạnh: Orange saturation không bao giờ được dương ($\max = 0$).

---

## Nội dung Prompt (Prompt Content)

Nâng cấp project hiện tại, KHÔNG làm lại từ đầu và giữ nguyên giao diện, theme màu hiện tại:

Tách toàn bộ preset và định nghĩa thông số ra file riêng src/rules/params.ts và src/rules/presets.ts. Trong params.ts, định nghĩa schema cho từng thông số: tên khóa, nhãn tiếng Việt, giá trị min, max, mặc định, bước nhảy, và nhóm hiển thị. Các nhóm: "Ánh sáng" (exposure -2..2, contrast, highlights, shadows, whites, blacks: -100..100), "Màu sắc" (temperature tính theo độ K lệch -1000..1000, tint -100..100, saturation, vibrance: -100..100), "HSL" gồm 8 kênh màu (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta), mỗi kênh có hue -100..100, saturation -100..100, luminance -100..100.
Viết hàm clampParams() dùng schema trên để kẹp mọi giá trị về trong khoảng min–max. BẮT BUỘC mọi thông số đi vào app đều qua hàm này: chọn preset, kéo slider, và cả khi file rule bị sửa tay thành giá trị lố (ví dụ 999) thì app vẫn tự kẹp về max, không lỗi, không áp giá trị sai.
Xây panel thông số đầy đủ theo 3 nhóm trên: mỗi thông số là một slider kèm ô số hiển thị giá trị hiện tại, bấm đúp vào slider để reset riêng thông số đó về mặc định, và một nút "Đặt lại tất cả". Nhóm HSL hiển thị dạng danh sách thu gọn, bấm vào từng kênh màu mới mở 3 slider của kênh đó.
Quan hệ giữa panel và thanh Cường độ phải rõ ràng: panel giữ giá trị preset gốc, thông số hiệu lực khi áp lên ảnh = mặc định + (giá trị panel − mặc định) × Cường độ/100. Kéo Cường độ không làm thay đổi số hiển thị trong panel.
Chuyển preset Tông lạnh trong presets.ts sang bộ số đầy đủ: temperature −650, tint +5, vùng tối ám teal qua split tone shadow (hue 190, saturation 12), HSL: Orange saturation không bao giờ dương (guard bảo vệ màu da, đặt −8), Yellow saturation −20, Green saturation −25, Blue saturation +10. Đánh dấu trong file rule đây là guard cứng: clamp riêng cho Orange saturation của preset lạnh, max = 0.
Giữ nguyên các hành vi cũ: upload 1 ảnh JPEG/PNG, giữ để xem gốc, xuất JPEG độ phân giải gốc bằng đúng thông số hiệu lực. Vẫn tuyệt đối không AI, không import preset, không RAW, không thay đổi hình học ảnh ở bước này.
