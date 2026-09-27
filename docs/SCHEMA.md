# Đối chiếu Schema Sheets ↔ Tài liệu YCNV v2.2

Toàn bộ tên sheet, tên cột được định nghĩa tập trung tại `apps-script/Config.gs`
(biến `SHEETS` và `SCHEMA`). Bảng dưới đối chiếu với Mục 9 tài liệu
`YCNV_He_thong_QL_Giang_vien_thinh_giang_va_Hop_dong_v2.2.docx`.

| Sheet (tab) | Mục trong YCNV | Ghi chú triển khai trên Sheets |
|---|---|---|
| `NGUOI_DUNG` | Mục 6 (phân quyền) | Không có trong YCNV gốc — bổ sung để phục vụ đăng nhập/phân quyền thực tế |
| `DON_VI` | 9.2 | — |
| `NAM_HOC` | 9.2 | — |
| `GIANG_VIEN` | 9.1 | `So_CCCD` cần UNIQUE nhưng Sheets không hỗ trợ thật — xem `api_taoGiangVien` (Utils `withLock_`) |
| `PHAN_CONG_THINH_GIANG` | 9.3 | — |
| `HOP_DONG` | 9.4 | `ID_QuyetDinh` là UNIQUE mô phỏng (1 hợp đồng — 1 quyết định) |
| `QUYET_DINH_HOP_DONG` | 9.5 | Mới bổ sung sau khi có ảnh Quy chế chi tiêu nội bộ |
| `DM_NOI_DUNG_GIANG_DAY` | 9.6 | Hệ số quy đổi mặc định = 1, **cần đơn vị cung cấp số thật** |
| `CHI_TIET_GIO_GIANG` | 9.7 | Dùng chung cho cả giờ dự kiến (`Nguon=HopDong`) và giờ thực tế (`Nguon=GCN`) |
| `GIAY_XAC_NHAN_GIO_GIANG` | 9.8 | — |
| `DINH_MUC_DON_GIA` | 9.9 | Nạp sẵn 5 mức theo học hàm/học vị (Mục 11.4 YCNV) khi chạy `initSheets` |
| `PHU_LUC_HOP_DONG` | 9.10 | Append-only — không có hàm sửa/xoá trong code |
| `THANH_LY_HOP_DONG` | 9.11 | `ID_HopDong` là UNIQUE mô phỏng (1 hợp đồng chỉ thanh lý 1 lần) |
| `NHAT_KY_THAO_TAC` | 9.12 | Append-only — không có hàm sửa/xoá trong code |

## Ràng buộc quan trọng KHÔNG được Sheets tự đảm bảo, phải tự kiểm tra trong code

| Ràng buộc | Nơi kiểm tra trong code |
|---|---|
| `So_CCCD` không trùng | `GiangVien.gs` → `api_taoGiangVien` (trong `withLock_`) |
| `Ma_DonVi` không trùng | `DonVi_NamHoc.gs` → `api_taoDonVi` |
| Mỗi hợp đồng có đúng 1 quyết định | `HopDong.gs` → `api_taoHopDong` (tạo đồng thời trong 1 khoá) |
| Mỗi hợp đồng chỉ thanh lý 1 lần | `ThanhLy.gs` → `api_thanhLyHopDong` (kiểm tra trước khi ghi) |
| Số giờ thực tế (GCN) ≤ số giờ hợp đồng theo từng (loại nội dung, cấp bậc) | `ThanhLy.gs` → `kiemTraDieuKienThanhLy_` |
| Không sửa/xoá nhật ký, phụ lục | Không cung cấp hàm update/delete cho 2 bảng này |

## Khác biệt so với thiết kế SQL ban đầu (tài liệu YCNV)

- Không có transaction thật: các thao tác nhiều bước (VD: tạo hợp đồng + quyết định +
  chi tiết giờ) được gói trong `withLock_` để giảm rủi ro race-condition, nhưng
  **không rollback tự động** nếu giữa chừng lỗi — cần theo dõi `NHAT_KY_THAO_TAC`
  để phát hiện dữ liệu dở dang nếu có lỗi runtime.
- Không có JOIN — mọi tổng hợp dữ liệu (VD: danh sách kèm tên giảng viên) được ghép
  bằng code JavaScript (`Array.map` + object lookup), xem `PhanCong.gs`.
- Giới hạn hiệu năng: Google Sheets phù hợp vài nghìn dòng/bảng; nếu dữ liệu lớn hơn
  đáng kể (nhiều chục nghìn hợp đồng), cần cân nhắc chuyển sang CSDL thật (Cloud SQL,
  Firestore...) ở giai đoạn sau.
