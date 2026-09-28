# Hệ thống Quản lý Giảng viên Thỉnh giảng và Hợp đồng theo Năm học

Mã nguồn cho hệ thống, xây dựng theo tài liệu yêu cầu nghiệp vụ
`YCNV_He_thong_QL_Giang_vien_thinh_giang_va_Hop_dong_v2.2.docx`.

## Kiến trúc

```
Trình duyệt (Cloudflare Pages/Workers Build — frontend tĩnh HTML/JS)
        │  fetch (JSON)
        ▼
Cloudflare Worker (proxy — giải quyết CORS)
        │  fetch (server-to-server)
        ▼
Apps Script Web App (backend/API — Code.gs)
        │
        ▼
Google Sheets (CSDL — 1 sheet = 1 bảng)
```

## Cấu trúc thư mục

```
apps-script/         Backend Apps Script (.gs) — API + logic nghiệp vụ + CSDL Sheets
frontend/             Frontend tĩnh triển khai trên Cloudflare (Workers Build)
cloudflare-worker/    Worker proxy giữa frontend và Apps Script Web App
docs/                 Tài liệu triển khai & đối chiếu schema
```

## Bắt đầu nhanh

1. Xem hướng dẫn chi tiết từng bước tại [`docs/DEPLOY.md`](docs/DEPLOY.md).
2. Sau khi chạy `initSheets()` và `taoTaiKhoanAdminDauTien()`, chạy thêm
   `napDuLieuMauDeThuNghiem()` (trong `Sheets_Seed.gs`) để có sẵn dữ liệu mẫu
   (2 đơn vị, 1 năm học, 2 tài khoản Đơn vị, 2 giảng viên) — chạy thử toàn bộ
   luồng ngay mà không cần nhập tay từng bước.
3. Đối chiếu cấu trúc dữ liệu với tài liệu nghiệp vụ tại [`docs/SCHEMA.md`](docs/SCHEMA.md).

## Tài khoản chạy thử (sau khi seed dữ liệu mẫu)

| Vai trò | Tên đăng nhập | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | `admin` | mật khẩu bạn đặt trong `taoTaiKhoanAdminDauTien` | Toàn quyền: Hợp đồng, Danh mục, Người dùng |
| Đơn vị | `donvi1` | `123456` | Gắn với "Khoa Y học cổ truyền" |
| Đơn vị | `donvi2` | `123456` | Gắn với "Khoa Dược" |

CCCD mẫu để tra cứu thử: `079001000001` (PGS.TS) hoặc `079001000002` (ThS).

**Đổi ngay mật khẩu mẫu trước khi đưa cho người dùng thật** — đây chỉ là dữ liệu chạy thử nội bộ.

**Nếu bảng Người dùng đang có tài khoản `admin` bị hiện trùng 2 dòng** (do trước đây hàm tạo tài khoản Admin đầu tiên từng bị chạy nhiều lần): mở Apps Script editor, chọn hàm `gomTaiKhoanTrungTenDangNhap` (trong `Sheets_Init.gs`), bấm **Run** — hệ thống tự xoá các dòng trùng, chỉ giữ lại dòng đầu tiên. Chạy lại nhiều lần vẫn an toàn. Từ nay `taoTaiKhoanAdminDauTien` cũng đã tự chống trùng.

## Trạng thái hiện tại

Đã có, chạy được đầy đủ luồng chính, đủ vai trò:

**Chung**
- Đăng nhập/phân quyền Đơn vị – Admin (`Auth.gs`), token qua `CacheService`
- Menu và điều hướng tự ẩn/hiện đúng theo vai trò đăng nhập (`api.js` → `requireRole`, `initNav`)
- Nhật ký thao tác append-only cho mọi nghiệp vụ quan trọng (`NhatKy.gs`)

**Vai trò Đơn vị**
- Tra cứu CCCD, tạo hồ sơ giảng viên chống trùng (`GiangVien.gs`, trang `tra-cuu-giang-vien.html`)
- Lập danh sách thỉnh giảng theo đơn vị + năm học; chọn từng người trong danh sách để nhập trực tiếp giờ chuẩn quy đổi (Đại học/Sau đại học/Nghiên cứu khoa học) — đây là **nguồn duy nhất** của giờ dự kiến, tự động có sẵn cho Admin ngay khi lưu (không cần thao tác gửi riêng); Admin không tự nhập tay số này khi lập hợp đồng, chỉ xem lại để xác nhận (`api_capNhatGioDuKien` trong `PhanCong.gs`, trang `danh-sach-don-vi.html`)
- Xuất danh sách trình ký (.xlsx, tạo ngay trên trình duyệt bằng thư viện SheetJS) để in ký duyệt sau khi đã hoàn thiện giờ cho cả danh sách
- Thanh lý hợp đồng: chọn hợp đồng, nhập giờ thực tế qua Giấy xác nhận, hệ thống tự kiểm tra không vượt giờ (gồm cả phần tăng thêm do phụ lục) và tính thù lao (`ThanhLy.gs`, `GiayXacNhan.gs`, trang `thanh-ly.html`)

**Vai trò Admin**
- Lập hợp đồng + tự sinh Quyết định 1-1; giờ dự kiến hiển thị chỉ-đọc (tổng số giờ chuẩn quy đổi, trong đó Đại học/Sau đại học/NCKH), lấy đúng theo số đơn vị đã nhập — không có ô nhập tay (`HopDong.gs`, trang `hop-dong.html`)
- Lập phụ lục điều chỉnh giờ hợp đồng, tự động nới giới hạn thanh lý tương ứng (`PhuLuc.gs`)
- Quản lý danh mục: thêm/sửa/xoá đơn vị, thêm/sửa/xoá năm học (xoá bị chặn nếu đã có hợp đồng/danh sách gắn kèm), thêm định mức chi thỉnh giảng theo học hàm/học vị — riêng định mức chỉ cho thêm mới, không sửa/xoá, để giữ đúng lịch sử tính thù lao (`DonVi_NamHoc.gs`, `DinhMuc.gs`, trang `danh-muc.html`)
- Quản lý tài khoản người dùng: tạo/sửa (họ tên, vai trò, đơn vị)/khoá-mở/xoá tài khoản; luôn giữ lại ít nhất 1 tài khoản Admin đang hoạt động (`NguoiDung.gs`, trang `nguoi-dung.html`)

**Trải nghiệm thao tác**
- Mọi nút submit đều chuyển sang trạng thái "Đang xử lý..." và tự vô hiệu hoá trong lúc gọi API, để tránh bấm nhiều lần gây gửi trùng dữ liệu, và luôn có thông báo thành công/lỗi rõ ràng sau khi xong (`api.js` → `chayVoiNutBan`, `baoThongDiep`).

Còn là khung/placeholder, cần hoàn thiện thêm trước khi dùng dữ liệu thật:
- Xuất PDF hợp đồng/quyết định/GCN/biên bản thanh lý từ mẫu Google Docs thật (`ExportUtils.gs` — đang là TODO với ID mẫu giả, cần đơn vị chuyển các file .docx đã cung cấp sang Google Docs và đặt placeholder)
- Hệ số quy đổi giờ chuẩn theo từng loại nội dung (đang mặc định = 1, cần số thật từ Quy chế chi tiêu nội bộ)
- Bảo mật đăng nhập ở mức phù hợp production (giới hạn số lần sai, refresh token...) — xem ghi chú trong `Auth.gs`

Danh sách đầy đủ các vấn đề còn mở: xem Mục 12, tài liệu YCNV v2.2.
