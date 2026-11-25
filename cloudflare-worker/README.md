# Cloudflare Worker Proxy cho Studio Màu

Proxy siêu nhẹ (miễn phí 100.000 request/ngày trên Cloudflare Workers) giúp:
1. Giấu `GEMINI_API_KEY` demo an toàn trên server Cloudflare (không lộ ra trình duyệt/GitHub).
2. Giới hạn số lượt AI miễn phí mỗi ngày (mặc định `5 lượt/ngày/IP`, reset lúc 00:00 giờ VN).
3. Khi hết lượt miễn phí, trả về `429 DAILY_LIMIT_REACHED` để Frontend tự động mở hộp thoại cho người dùng nhập API Key cá nhân.

## Cài đặt & Deploy (chỉ làm 1 lần duy nhất)

```bash
cd cloudflare-worker
npm install

# 1. Đăng nhập Cloudflare (mở trình duyệt xác nhận 1 lần)
npx wrangler login

# 2. Tạo KV namespace để đếm lượt theo ngày (copy id dán vào wrangler.toml)
npx wrangler kv namespace create RATE_LIMIT_KV

# 3. Lưu API Key demo bí mật lên Cloudflare (không lưu vào code)
npx wrangler secret put GEMINI_API_KEY

# 4. Deploy Worker
npx wrangler deploy
```

Sau khi deploy xong, copy URL dạng `https://studio-mau-gemini-proxy.<subdomain>.workers.dev` gắn vào GitHub Repository Variable `VITE_DEMO_PROXY_URL` (Settings → Secrets and variables → Actions → Variables). Từ đó về sau, mỗi lần push code lên `main`, GitHub Pages tự động build & dùng proxy này mà không cần cấu hình lại.
