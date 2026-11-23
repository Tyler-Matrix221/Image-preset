# Prompt 4: Cân Chỉnh Preset Tự Nhiên & Chuẩn Hóa Thang Đo HSL

## Bối cảnh & Hiện tượng lỗi
Người dùng phản ánh: "Khi chọn tông lạnh thì thông số được đẩy lên 100% nhìn rất ghê. Expected là thông số vừa phải để ảnh vẫn giữ được chất tự nhiên."

## Nguyên nhân gốc rễ (Root Cause)
1. **Lệch thang đo Uniform HSL trong WebGL**:
   - Trong `src/lib/imageEngine.ts`, các giá trị thuộc tính HSL từ `params.hsl` có dải giá trị từ `-100` đến `+100`.
   - Tuy nhiên, trong shader GLSL, giá trị delta mong đợi nằm trong khoảng chuẩn hóa `[-1.0, 1.0]`.
   - Code cũ truyền trực tiếp `p.hsl[k[i]][f]` vào uniform mảng float mà quên chia cho `100.0`.
   - Hậu quả: Độ lệch màu bị khuếch đại gấp 100 lần trong shader, biến vùng màu da thành màu xanh cyan chói lóa (`[0, 107, 253]`) và bão hòa màu bị đẩy lên kịch trần.

2. **Thông số preset Tông lạnh quá cực đoan**:
   - `temperature: -650` và tint lệch mạnh tạo cảm giác ảnh bị ám xanh tím giả tạo, mất chi tiết màu da người thực tế.

## Yêu cầu tinh chỉnh & Khắc phục
1. **Chuẩn hóa giá trị HSL khi truyền vào Uniform**:
   - Trong `setUniforms` của `src/lib/imageEngine.ts`:
     ```ts
     hslData[idx * 3 + f] = p.hsl[k[i]][f] / 100;
     ```
   - Đảm bảo giá trị truyền vào shader nằm đúng dải `[-1.0, 1.0]`.

2. **Cân chỉnh lại bộ thông số preset cho ảnh tự nhiên, nịnh mắt**:
   - **Tông lạnh (Cool)**:
     - `temperature`: `-160` (thay vì -650, vừa đủ lạnh thanh thoát).
     - `tint`: `+4`.
     - `highlights`: `-8`, `shadows`: `+6`, `contrast`: `+3`.
     - Split tone shadow: hue 190 (teal mờ), saturation 10.
     - HSL: Orange sat `-4` (guard max = 0), Yellow sat `-10`, Green sat `-15`, Blue sat `+8`.
   - **Tông ấm (Warm)**:
     - `temperature`: `+140`, `tint`: `-2`, `vibrance`: `+8`.
     - `shadows`: `+8`, `highlights`: `-6`.
     - Split tone highlight: hue 40, saturation 8.
   - **Film nhạt (Muted Film)**:
     - `contrast`: `-12`, `blacks`: `+16`, `whites`: `-8`.
     - `saturation`: `-15`, `vibrance`: `+5`.

## Kết quả kiểm tra
Ảnh giữ được độ trong trẻo, da người tự nhiên hồng hào không bị biến sắc hay bết màu, các chi tiết vùng sáng/tối được bảo toàn nguyên vẹn.
