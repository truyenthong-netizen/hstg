# Hệ thống Quản lý Giảng viên Thỉnh giảng và Hợp đồng theo Năm học

Khung mã nguồn (skeleton) cho hệ thống, xây dựng theo tài liệu yêu cầu nghiệp vụ
`YCNV_He_thong_QL_Giang_vien_thinh_giang_va_Hop_dong_v2.2.docx`.

## Kiến trúc

```
Trình duyệt (Cloudflare Pages — frontend tĩnh HTML/JS)
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
frontend/             Frontend tĩnh triển khai trên Cloudflare Pages
cloudflare-worker/    Worker proxy giữa frontend và Apps Script Web App
docs/                 Tài liệu triển khai & đối chiếu schema
```

## Bắt đầu nhanh

Xem hướng dẫn chi tiết từng bước tại [`docs/DEPLOY.md`](docs/DEPLOY.md).
Đối chiếu cấu trúc dữ liệu với tài liệu nghiệp vụ tại [`docs/SCHEMA.md`](docs/SCHEMA.md).

## Trạng thái hiện tại — đây là KHUNG (skeleton), chưa phải bản hoàn thiện

Đã có, chạy được đầy đủ luồng chính:
- Đăng nhập/phân quyền Đơn vị – Admin (Auth.gs)
- Tra cứu CCCD, tạo hồ sơ giảng viên chống trùng (GiangVien.gs)
- Lập danh sách thỉnh giảng theo đơn vị + năm học (PhanCong.gs)
- Lập hợp đồng + tự sinh Quyết định 1-1 (HopDong.gs)
- Ghi nhận Giấy xác nhận giờ giảng, chi tiết theo ma trận Đại học/Sau đại học × loại nội dung (GiayXacNhan.gs, ChiTietGioGiang.gs)
- Thanh lý hợp đồng: kiểm tra không vượt số giờ theo từng loại, tính thù lao tự động theo học hàm/học vị (ThanhLy.gs, DinhMuc.gs)
- Nhật ký thao tác append-only (NhatKy.gs)
- Frontend đủ 4 trang thao tác chính, gọi API qua Worker proxy

Còn là khung/placeholder, cần hoàn thiện thêm trước khi dùng thật:
- Xuất PDF hợp đồng/quyết định/GCN/biên bản thanh lý từ mẫu Google Docs thật (ExportUtils.gs — đang là TODO với ID mẫu giả)
- Hệ số quy đổi giờ chuẩn theo từng loại nội dung (đang mặc định = 1)
- Phân hệ phụ lục hợp đồng đầy đủ có ảnh hưởng tới giới hạn thanh lý (đang mới ghi nhận, chưa cộng vào giới hạn kiểm tra)
- Giao diện quản trị danh mục (đơn vị, năm học, định mức, người dùng) — hiện chỉ có API, chưa có trang UI riêng

Danh sách đầy đủ các vấn đề còn mở: xem Mục 12, tài liệu YCNV v2.2.
