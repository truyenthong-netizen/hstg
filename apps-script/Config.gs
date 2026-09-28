/**
 * Config.gs
 * Cấu hình trung tâm: ID Spreadsheet, tên các sheet (tab) và danh sách cột.
 * Khớp với mô hình dữ liệu trong tài liệu YCNV_He_thong_QL_Giang_vien_thinh_giang_va_Hop_dong v2.2 (Mục 9).
 *
 * QUAN TRỌNG: Sheets không có UNIQUE / FOREIGN KEY thật như SQL.
 * Mọi ràng buộc (CCCD duy nhất, mã hợp đồng không trùng, số giờ không vượt...)
 * đều phải tự kiểm tra trong code (xem Utils.gs, GiangVien.gs, HopDong.gs, ThanhLy.gs).
 */

// ID của Google Spreadsheet dùng làm CSDL. Điền sau khi tạo Sheet trống.
// Cách lấy: mở Google Sheet -> copy chuỗi giữa /d/ và /edit trên URL.
var SPREADSHEET_ID = '1UNFZcqaetDKbJ0Lsd31vQ0mPwLDu1h8foQ9xMx_rqnM';

function getDb_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Tên các sheet (tab) — mỗi sheet tương ứng 1 bảng trong tài liệu YCNV.
var SHEETS = {
  NGUOI_DUNG: 'NGUOI_DUNG',
  DON_VI: 'DON_VI',
  NAM_HOC: 'NAM_HOC',
  GIANG_VIEN: 'GIANG_VIEN',
  PHAN_CONG_THINH_GIANG: 'PHAN_CONG_THINH_GIANG',
  HOP_DONG: 'HOP_DONG',
  QUYET_DINH_HOP_DONG: 'QUYET_DINH_HOP_DONG',
  DM_NOI_DUNG_GIANG_DAY: 'DM_NOI_DUNG_GIANG_DAY',
  CHI_TIET_GIO_GIANG: 'CHI_TIET_GIO_GIANG',
  GIAY_XAC_NHAN_GIO_GIANG: 'GIAY_XAC_NHAN_GIO_GIANG',
  DINH_MUC_DON_GIA: 'DINH_MUC_DON_GIA',
  PHU_LUC_HOP_DONG: 'PHU_LUC_HOP_DONG',
  THANH_LY_HOP_DONG: 'THANH_LY_HOP_DONG',
  NHAT_KY_THAO_TAC: 'NHAT_KY_THAO_TAC',
};

// Cột theo đúng thứ tự sẽ ghi ra sheet. Dòng 1 của mỗi sheet = header này.
var SCHEMA = {
  NGUOI_DUNG: ['ID_NguoiDung', 'Ten_Dang_Nhap', 'Mat_Khau_Hash', 'Ho_Ten', 'Vai_Tro', 'ID_DonVi', 'Trang_Thai', 'Ngay_Tao'],
  // Vai_Tro: 'DonVi' | 'Admin'

  DON_VI: ['ID_DonVi', 'Ten_DonVi', 'Ma_DonVi', 'Nguoi_Phu_Trach'],

  NAM_HOC: ['ID_NamHoc', 'Ten_NamHoc', 'Ngay_BatDau', 'Ngay_KetThuc'],

  GIANG_VIEN: [
    'ID_GiangVien', 'So_CCCD', 'Ho_Ten', 'Ngay_Sinh', 'Gioi_Tinh',
    'Hoc_Ham_Hoc_Vi', 'Chuyen_Nganh', 'Don_Vi_Cong_Tac_Chinh',
    'Dia_Chi', 'So_Dien_Thoai', 'Email',
    'So_Tai_Khoan', 'Ngan_Hang', 'Chi_Nhanh', 'Ma_So_Thue',
    'Trang_Thai_Ho_So', 'Nguoi_Tao', 'Ngay_Tao',
  ],

  PHAN_CONG_THINH_GIANG: [
    'ID_PhanCong', 'ID_GiangVien', 'ID_DonVi', 'ID_NamHoc',
    'Mon_Hoc_HocPhan', 'Hoc_Ky', 'Loai_Hinh_HD',
    'So_Tiet_So_Gio', 'Thoi_Gian_Thuc_Hien', 'Trang_Thai',
    'Nguoi_Lap', 'Ngay_Lap',
  ],

  HOP_DONG: [
    'ID_HopDong', 'Ma_So_HopDong', 'ID_NamHoc', 'ID_DonVi', 'ID_GiangVien', 'So_CCCD',
    'ID_PhanCong', 'ID_QuyetDinh', 'Noi_Dung_Giang_Day',
    'Tu_Ngay', 'Den_Ngay', 'Trang_Thai', 'Ly_Do_Huy',
    'Nguoi_Tao', 'Ngay_Tao', 'Ngay_Ky',
  ],
  // Trang_Thai: 'Du_Thao' | 'Da_Ky' | 'Da_Thanh_Ly' | 'Huy'

  QUYET_DINH_HOP_DONG: [
    'ID_QuyetDinh', 'Ma_So_QuyetDinh', 'ID_HopDong', 'Trich_Yeu',
    'Ngay_Ky', 'Nguoi_Ky', 'File_DinhKem_Url',
  ],

  DM_NOI_DUNG_GIANG_DAY: ['ID_NoiDung', 'Ten_NoiDung', 'He_So_Quy_Doi_Mac_Dinh', 'Thu_Tu_Hien_Thi'],

  CHI_TIET_GIO_GIANG: [
    'ID_ChiTiet', 'Nguon', 'ID_ThamChieu', 'ID_NoiDung',
    'Cap_Bac', 'So_Gio', 'So_Gio_Chuan',
  ],
  // Nguon: 'HopDong' | 'GCN'   |   Cap_Bac: 'DaiHoc' | 'SauDaiHoc'

  GIAY_XAC_NHAN_GIO_GIANG: [
    'ID_GCN', 'Ma_So_GCN', 'ID_HopDong', 'Thoi_Gian_Tu_Den',
    'Nguoi_Xac_Nhan', 'Chuc_Vu_Nguoi_Xac_Nhan', 'File_DinhKem_Url', 'Ngay_Lap',
  ],

  DINH_MUC_DON_GIA: [
    'ID_DinhMuc', 'Hoc_Ham_Hoc_Vi', 'Don_Gia_Gio_Chuan',
    'Ngay_Hieu_Luc_Tu', 'Ngay_Hieu_Luc_Den', 'Can_Cu_Quy_Che',
  ],

  PHU_LUC_HOP_DONG: [
    'ID_PhuLuc', 'ID_HopDong', 'Noi_Dung_Dieu_Chinh',
    'GiaTri_Truoc', 'GiaTri_Sau', 'File_DinhKem_Url',
    'Ngay_DieuChinh', 'Nguoi_ThucHien',
  ],

  THANH_LY_HOP_DONG: [
    'ID_ThanhLy', 'Ma_So_BienBan', 'ID_HopDong', 'ID_GCN',
    'Tong_So_Gio_Chuan_ThucTe', 'ID_DinhMuc', 'Thanh_Tien',
    'Ngay_ThanhLy', 'Nguoi_ThucHien',
  ],

  NHAT_KY_THAO_TAC: [
    'ID_NhatKy', 'Doi_Tuong', 'ID_DoiTuong', 'Hanh_Dong',
    'Noi_Dung_Truoc', 'Noi_Dung_Sau', 'Nguoi_Thuc_Hien', 'Thoi_Gian',
  ],
};

// Các cột chứa chuỗi số nhưng PHẢI giữ nguyên dạng văn bản (không được để Sheets tự hiểu
// thành number) — vì nếu không, số 0 đứng đầu (CCCD, SĐT, số tài khoản, mã số thuế...) sẽ
// bị mất khi ghi xuống. Xem ep_ChuoiSo_ trong Utils.gs (dùng trong appendRow_/updateRow_).
var TEXT_FIELDS = ['So_CCCD', 'So_Dien_Thoai', 'So_Tai_Khoan', 'Ma_So_Thue'];

// Danh mục cố định loại nội dung giảng dạy (nạp sẵn khi initSheets chạy lần đầu).
// Hệ số quy đổi để 0 — CẦN ĐƠN VỊ CUNG CẤP số thật (xem Mục 12 tài liệu YCNV, vấn đề còn mở).
var NOI_DUNG_GIANG_DAY_MAC_DINH = [
  { ten: 'Lý thuyết', heSo: 1 },
  { ten: 'Thực hành', heSo: 1 },
  { ten: 'Duyệt đề cương/chuyên đề/tiểu luận TQ', heSo: 1 },
  { ten: 'Hướng dẫn (khóa luận, luận văn, luận án)', heSo: 1 },
  { ten: 'Công việc khác', heSo: 1 },
  { ten: 'Hội đồng đánh giá (Luận án, Luận văn, Đề án SĐH)', heSo: 1 },
];

// Định mức chi thỉnh giảng mặc định — theo ảnh Quy chế chi tiêu nội bộ (Mục 11.4 tài liệu YCNV).
var DINH_MUC_MAC_DINH = [
  { hocHamHocVi: 'GS.TS', donGia: 250000 },
  { hocHamHocVi: 'PGS.TS', donGia: 200000 },
  { hocHamHocVi: 'TS', donGia: 180000 },
  { hocHamHocVi: 'ThS', donGia: 150000 },
  { hocHamHocVi: 'Đại học', donGia: 100000 },
];
