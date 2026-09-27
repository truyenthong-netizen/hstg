# Hướng dẫn triển khai

Kiến trúc: **Google Sheets** (CSDL) ← **Apps Script Web App** (backend/API) ← **Cloudflare Worker** (proxy, tránh CORS) ← **Cloudflare Pages** (frontend tĩnh).

## 0. Chuẩn bị công cụ
```bash
npm install -g @google/clasp wrangler
clasp login      # đăng nhập tài khoản Google sẽ sở hữu Apps Script + Sheet
wrangler login    # đăng nhập tài khoản Cloudflare
```

## 1. Tạo Google Sheet trống làm CSDL
1. Tạo 1 Google Sheet mới, đặt tên tuỳ ý (VD: "CSDL_ThinhGiang").
2. Copy ID trong URL (chuỗi giữa `/d/` và `/edit`).
3. Dán ID đó vào biến `SPREADSHEET_ID` trong `apps-script/Config.gs`.

## 2. Tạo project Apps Script và đẩy code lên
```bash
cd apps-script
clasp create --type webapp --title "QLGV Thinh Giang API" --rootDir .
# Lệnh trên tự ghi scriptId vào .clasp.json, ghi đè placeholder có sẵn.
clasp push
```

## 3. Khởi tạo schema + tài khoản Admin đầu tiên
1. `clasp open` để mở trình soạn thảo Apps Script trên trình duyệt.
2. Chọn hàm `initSheets`, bấm **Run** — hệ thống tự tạo toàn bộ tab + danh mục mặc định
   (loại nội dung giảng dạy, định mức đơn giá theo học hàm/học vị).
3. Mở file `Sheets_Init.gs`, sửa mật khẩu mặc định trong `taoTaiKhoanAdminDauTien`,
   chọn hàm này, bấm **Run** để tạo tài khoản `admin`.
4. Cấp quyền lần đầu Apps Script sẽ hỏi xin quyền truy cập Sheets — đồng ý.
5. (Tuỳ chọn, khuyến nghị khi chạy thử) Mở file `Sheets_Seed.gs`, chọn hàm
   `napDuLieuMauDeThuNghiem`, bấm **Run** — tự tạo sẵn 2 đơn vị, 1 năm học,
   2 tài khoản Đơn vị (`donvi1`/`donvi2`, mật khẩu `123456`) và 2 giảng viên mẫu,
   để chạy thử toàn bộ luồng ngay mà không cần nhập tay. Xem README mục
   "Tài khoản chạy thử". **Không chạy hàm này trên dữ liệu thật.**

## 4. Deploy Apps Script thành Web App
Trong trình soạn thảo: **Deploy → New deployment → Web app**.
- Execute as: **Me** (người deploy).
- Who has access: **Anyone** (bảo mật thật sự nằm ở lớp token đăng nhập trong `Auth.gs`,
  không phải ở quyền truy cập Apps Script — cân nhắc thêm xác thực mạnh hơn trước khi
  dùng cho dữ liệu thật).
- Copy **Web app URL** vừa tạo (dạng `.../macros/s/XXXX/exec`).

## 5. Deploy Cloudflare Worker (proxy)
```bash
cd cloudflare-worker
# Dán Web app URL ở bước 4 vào wrangler.toml (biến APPS_SCRIPT_URL)
wrangler deploy
```
Copy URL Worker vừa deploy (dạng `https://qlgv-thinhgiang-proxy.<subdomain>.workers.dev`).

## 6. Deploy Cloudflare Pages (frontend)

**Lưu ý (2026):** Cloudflare đã gộp Pages vào nền tảng Workers ("Workers Build"). Deploy
site tĩnh giờ dùng `wrangler deploy` với 1 file cấu hình khai báo `assets.directory`
(đã có sẵn tại `frontend/wrangler.jsonc` trong project này) — **thiếu file này hoặc
thiếu trường `directory` sẽ làm deploy fail ngay** với lỗi dạng
`The 'assets' property in your configuration is missing the required 'directory' property`.

Dán URL Worker ở bước 5 vào `frontend/assets/js/api.js` (biến `API_BASE_URL`), sau đó:
```bash
cd frontend
wrangler deploy
```
Hoặc qua dashboard: **Workers & Pages → Create → Connect to Git**, chọn repo, để
Cloudflare tự nhận diện `frontend/wrangler.jsonc` (chọn đúng thư mục gốc build là
`frontend` nếu dashboard hỏi "Root directory").

## 7. Kiểm tra
1. Mở URL frontend vừa deploy (project Workers ứng với thư mục `frontend`).
2. Đăng nhập bằng `admin` / mật khẩu đã đặt ở Bước 3, hoặc `donvi1` / `123456`
   nếu đã chạy `napDuLieuMauDeThuNghiem` ở Bước 3.5.
3. Chạy thử toàn bộ luồng theo đúng phân quyền:
   - **Đơn vị** (`donvi1`): tra cứu CCCD `079001000001` → chọn hồ sơ → lập vào danh sách
     → (sau khi Admin lập + chuyển Đã ký hợp đồng) vào Thanh lý để nhập giờ thực tế.
   - **Admin** (`admin`): vào Hợp đồng → tra cứu CCCD `079001000001` → lập hợp đồng
     (sinh kèm Quyết định) → ở khung "Quản lý hợp đồng đã lập" phía dưới cùng trang,
     bấm "Chuyển Đã ký" cho hợp đồng vừa tạo → có thể "Lập phụ lục" hoặc "Huỷ" ngay
     từ bảng đó → vào Danh mục để thêm/sửa định mức, đơn vị, năm học nếu cần
     → vào Người dùng để tạo thêm tài khoản cho các đơn vị khác.

## Khi sửa code sau này
```bash
npm run clasp:push      # đẩy code Apps Script mới nhất
npm run worker:deploy   # nếu có sửa Worker
npm run frontend:deploy # nếu có sửa frontend (hoặc để Cloudflare tự build khi push GitHub)
```

## Việc còn thiếu để lên production thật (xem thêm Mục 12 tài liệu YCNV)
- Mẫu Google Doc thật cho Hợp đồng/Quyết định/GCN/Biên bản thanh lý (đang là placeholder
  trong `ExportUtils.gs`, cần đơn vị chuyển các file .docx đã cung cấp sang Google Docs
  và đặt đúng vị trí `{{...}}`).
- Hệ số quy đổi thật cho từng loại nội dung giảng dạy (đang mặc định = 1 trong `Config.gs`).
- Xác nhận định dạng chính thức số hợp đồng/quyết định (đang tạm STT/NamHoc/ĐHYD-...).
- Cơ chế bảo mật mạnh hơn cho đăng nhập (hiện là mật khẩu băm SHA-256 + token CacheService,
  phù hợp làm bản thử nghiệm, chưa đạt chuẩn production thật sự).
