# Prompt 2: Tách Rules, Định Nghĩa Schema, Panel HSL & Cơ Chế Guard

## Mục tiêu
Nâng cấp project hiện tại, KHÔNG làm lại từ đầu và giữ nguyên giao diện, theme màu hiện tại:

1. **Tách toàn bộ preset và định nghĩa thông số ra file riêng**:
   - `src/rules/params.ts`: Định nghĩa schema cho từng thông số gồm: tên khóa (`key`), nhãn tiếng Việt (`label`), giá trị nhỏ nhất (`min`), lớn nhất (`max`), mặc định (`default`), bước nhảy (`step`), và nhóm hiển thị (`group`).
     - Nhóm **Ánh sáng**: `exposure` (-2..2, step 0.05, default 0), `contrast`, `highlights`, `shadows`, `whites`, `blacks` (-100..100, step 1, default 0).
     - Nhóm **Màu sắc**: `temperature` lệch theo độ K (-1000..1000, step 10, default 0), `tint` (-100..100, step 1, default 0), `saturation` (-100..100, step 1, default 0), `vibrance` (-100..100, step 1, default 0).
     - Nhóm **HSL**: gồm 8 kênh màu (`Red`, `Orange`, `Yellow`, `Green`, `Aqua`, `Blue`, `Purple`, `Magenta`), mỗi kênh có 3 thuộc tính `hue` (-100..100), `saturation` (-100..100), `luminance` (-100..100).
   - `src/rules/presets.ts`: Định nghĩa danh sách các preset và giá trị cấu hình tương ứng.

2. **Hàm kẹp giá trị `clampParams()`**:
   - Viết hàm `clampParams()` dựa trên schema đã định nghĩa để kẹp mọi giá trị về trong khoảng `[min, max]`.
   - **BẮT BUỘC** mọi thông số đi vào app đều qua hàm này: khi chọn preset, khi kéo slider, và cả khi file rule bị sửa tay thành giá trị lố (ví dụ 999) thì app vẫn tự kẹp về max, không lỗi, không áp giá trị sai.

3. **Panel thông số 3 nhóm & Reset đúp chuột**:
   - Xây dựng panel thông số đầy đủ theo 3 nhóm trên.
   - Mỗi thông số là một slider kèm ô số hiển thị giá trị hiện tại.
   - Bấm đúp vào slider để reset riêng thông số đó về mặc định.
   - Có nút "Đặt lại tất cả" để đưa toàn bộ thông số về mặc định.
   - Nhóm HSL hiển thị dạng danh sách thu gọn (accordion), bấm vào từng kênh màu mới mở 3 slider (`Sắc độ`, `Độ bão hòa`, `Độ sáng`) của kênh đó.

4. **Quan hệ giữa Panel thông số và thanh Cường độ**:
   - Panel giữ nguyên giá trị cấu hình preset gốc.
   - Thông số hiệu lực (effective params) khi áp lên ảnh:
     $$\text{effective} = \text{default} + (\text{panel} - \text{default}) \times \frac{\text{Cường độ}}{100}$$
   - Kéo thanh Cường độ KHÔNG làm thay đổi số hiển thị trong panel.

5. **Bộ số đầy đủ cho preset Tông lạnh & Guard bảo vệ màu da**:
   - Cập nhật preset Tông lạnh:
     - `temperature`: -650 (hoặc hiệu chỉnh phù hợp)
     - `tint`: +5
     - Vùng tối ám teal qua split tone shadow (`hue`: 190, `saturation`: 12)
     - HSL: `Orange saturation` không bao giờ dương (guard bảo vệ màu da, đặt -8), `Yellow saturation` -20, `Green saturation` -25, `Blue saturation` +10.
   - Đánh dấu trong file rule đây là guard cứng (`applyPresetGuards`): clamp riêng cho `Orange saturation` của preset lạnh, $\max = 0$.

6. **Duy trì hành vi cũ**:
   - Upload ảnh JPEG/PNG, giữ để so sánh ảnh gốc, xuất JPEG độ phân giải gốc bằng đúng thông số hiệu lực.
   - Không AI, không import preset ngoài, không RAW, không thay đổi hình học ảnh.
