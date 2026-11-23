# Prompt 4: AI Gợi Ý Chỉnh Màu Bằng Google Gemini API

## Mô tả (Description)
- **Mục tiêu**: Tích hợp trí tuệ nhân tạo (Google Gemini 2.5 Flash) để gợi ý bộ thông số màu và ánh sáng phù hợp dựa trên nội dung bức ảnh và phong cách người dùng mong muốn, hoàn toàn tôn trọng triết lý cốt lõi của ứng dụng (AI chỉ đề xuất thông số, WebGL client-side tự render trên ảnh gốc, không dùng AI sinh ảnh hay biến dạng khuôn mặt).
- **Tính năng chính**:
  1. **Khu vực Cài đặt (Settings)**:
     - Ô nhập Google Gemini API Key.
     - Lưu duy nhất trong `localStorage` trình duyệt của người dùng.
     - Hiển thị che mờ (`password`), có nút bật/tắt hiển thị, nút xóa key.
     - Cam kết bảo mật: Key chỉ lưu trên máy cá nhân, chỉ gửi trực tiếp tới API của Google, không ghi vào mã nguồn, không gửi qua bất kỳ trung gian nào.
  2. **Bảng điều khiển AI Gợi Ý Chỉnh Màu**:
     - Nút kích hoạt "AI gợi ý chỉnh màu" với icon Sparkles.
     - Ô nhập phong cách (ví dụ: *"tông lạnh, da vẫn hồng hào"*, *"cổ điển thập niên 90"*...).
     - Các nút chọn nhanh (Quick chips): **Tông lạnh**, **Tông ấm**, **Film nhạt**, **Trong sáng**.
     - Thông báo minh bạch quyền riêng tư: *"Ảnh (bản thu nhỏ) sẽ được gửi tới Google Gemini để phân tích khi bạn dùng tính năng này."*
     - Kiểm tra key: Nếu chưa có key, thông báo hướng dẫn mở Cài đặt để nhập key trước.
  3. **Quy trình gọi Gemini API (`gemini-2.5-flash`)**:
     - **Bảo vệ ảnh gốc**: Chỉ tạo một bản thu nhỏ tối đa 1024px (JPEG) để gửi đi phân tích — file gốc giữ nguyên tuyệt đối trên máy.
     - **Sinh Prompt động từ Schema**: Tự động trích xuất các thông số hợp lệ từ `src/rules/params.ts` (Ánh sáng, Màu sắc, HSL 8 kênh) kèm dải `[min, max]`.
     - **Ép kiểu JSON chuẩn**: Sử dụng cấu hình `response_mime_type: "application/json"`.
     - **Ràng buộc nghiêm ngặt**: Cấm AI can thiệp hình học, khuôn mặt, hay sinh ảnh; AI chỉ trả về một JSON chứa các giá trị số trong whitelist.
  4. **Kiểm duyệt & An toàn dữ liệu**:
     - Lọc whitelist các trường hợp lệ từ kết quả của AI, loại bỏ mọi trường lạ.
     - BẮT BUỘC đi qua `clampParams()` để đảm bảo an toàn 100%.
     - Tạo preset mới tên **"AI gợi ý"**, tự động kích hoạt và hiển thị đầy đủ lên panel.
     - Người dùng tiếp tục kéo slider, chỉnh Cường độ, so sánh trước/sau và xuất ảnh JPEG độ phân giải gốc như bình thường.
  5. **Trạng thái & Xử lý lỗi**:
     - Hiệu ứng loading xoay tròn khi đang chờ AI phản hồi.
     - Bắt lỗi mạng, key sai, hạn mức quota, hoặc phản hồi không hợp lệ $\rightarrow$ hiện thông báo popup thân thiện, app không sập, giữ nguyên preset đang dùng.

---

## Nội dung Prompt (Prompt Content)

Nâng cấp project hiện tại, KHÔNG làm lại từ đầu, giữ nguyên mọi tính năng hiện có (preset, import .xmp/.cube, panel, Cường độ, xem gốc, xuất ảnh):

Thêm màn hình/khu vực "Cài đặt" với một ô nhập Gemini API key. Key được lưu duy nhất trong localStorage của trình duyệt, hiển thị dạng che mờ, có nút xóa key, và kèm dòng ghi chú: key chỉ lưu trên máy người dùng, chỉ dùng để gọi Google Gemini. Tuyệt đối không ghi key vào code, không gửi key đi nơi nào khác ngoài API của Google.
Thêm nút "AI gợi ý chỉnh màu" trong màn hình chỉnh ảnh, kèm một ô nhập phong cách mong muốn (ví dụ: "tông lạnh, da vẫn hồng hào") và vài nút chọn nhanh: Tông lạnh, Tông ấm, Film nhạt, Trong sáng. Khi bấm: nếu chưa có API key thì hiện thông báo hướng dẫn vào Cài đặt nhập key trước, không gọi API.
Khi gọi Gemini: chỉ gửi một bản sao thu nhỏ của ảnh (cạnh dài tối đa 1024px, JPEG) — không gửi file gốc. Kèm theo là bản mô tả rule được sinh tự động từ schema trong src/rules/params.ts (danh sách thông số được phép kèm min–max của từng thông số) và yêu cầu bắt buộc: chỉ trả về một JSON duy nhất chứa các thông số màu/ánh sáng trong danh sách cho phép, không kèm giải thích hay markdown; cấm mọi thay đổi hình học, bố cục, khuôn mặt hay chi tiết — AI chỉ đề xuất thông số, app sẽ tự áp lên ảnh gốc.
Dùng model gemini-2.5-flash qua Gemini API, yêu cầu response dạng JSON. Khi nhận kết quả: chỉ giữ các khóa có trong whitelist của schema (bỏ qua khóa lạ), sau đó BẮT BUỘC cho toàn bộ đi qua clampParams() rồi mới nạp vào panel như một trạng thái preset tên "AI gợi ý". Người dùng kéo chỉnh tiếp các slider, đổi Cường độ, xem gốc và xuất ảnh như bình thường.
Trạng thái và lỗi: có trạng thái đang tải khi chờ AI; key sai, lỗi mạng, hoặc AI trả về không phải JSON hợp lệ thì hiện thông báo lỗi thân thiện và giữ nguyên trạng thái ảnh/preset đang dùng, app không sập. Có một dòng thông báo nhỏ cạnh nút AI: "Ảnh (bản thu nhỏ) sẽ được gửi tới Google Gemini để phân tích khi bạn dùng tính năng này.
