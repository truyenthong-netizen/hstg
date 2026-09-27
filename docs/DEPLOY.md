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
Dán URL Worker ở bước 5 vào `frontend/assets/js/api.js` (biến `API_BASE_URL`), sau đó:
```bash
wrangler pages deploy frontend --project-name=qlgv-thinhgiang
```
Hoặc: kết nối repo GitHub với Cloudflare Pages qua dashboard (Pages → Create project →
Connect to Git), đặt build output directory = `frontend`, không cần build command
(toàn bộ là HTML/CSS/JS tĩnh).

## 7. Kiểm tra
1. Mở URL Cloudflare Pages vừa deploy.
2. Đăng nhập bằng `admin` / mật khẩu đã đặt ở Bước 3.
3. Vào Apps Script Sheet, tạo vài dòng dữ liệu mẫu ở `DON_VI`, `NAM_HOC`,
   và 1 tài khoản `Vai_Tro=DonVi` trong `NGUOI_DUNG` để thử luồng Đơn vị.
4. Chạy thử toàn bộ luồng: tra cứu CCCD → tạo giảng viên → lập danh sách →
   (Admin) lập hợp đồng → (Đơn vị) thanh lý.

## Khi sửa code sau này
```bash
npm run clasp:push     # đẩy code Apps Script mới nhất
npm run worker:deploy   # nếu có sửa Worker
npm run pages:deploy    # nếu có sửa frontend (hoặc để Cloudflare Pages tự build khi push GitHub)
```

## Việc còn thiếu để lên production thật (xem thêm Mục 12 tài liệu YCNV)
- Mẫu Google Doc thật cho Hợp đồng/Quyết định/GCN/Biên bản thanh lý (đang là placeholder
  trong `ExportUtils.gs`, cần đơn vị chuyển các file .docx đã cung cấp sang Google Docs
  và đặt đúng vị trí `{{...}}`).
- Hệ số quy đổi thật cho từng loại nội dung giảng dạy (đang mặc định = 1 trong `Config.gs`).
- Xác nhận định dạng chính thức số hợp đồng/quyết định (đang tạm STT/NamHoc/ĐHYD-...).
- Cơ chế bảo mật mạnh hơn cho đăng nhập (hiện là mật khẩu băm SHA-256 + token CacheService,
  phù hợp làm bản thử nghiệm, chưa đạt chuẩn production thật sự).
