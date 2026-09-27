/**
 * Sheets_Seed.gs — nạp DỮ LIỆU MẪU để chạy thử toàn bộ luồng ngay, không phải nhập tay
 * từng bước qua giao diện. Chạy sau initSheets() và taoTaiKhoanAdminDauTien().
 *
 * Cách dùng: mở Apps Script editor, chọn hàm napDuLieuMauDeThuNghiem, bấm Run.
 * Chạy lại nhiều lần vẫn an toàn (không tạo trùng, vì themNeuChuaCo_ tự kiểm tra),
 * nhưng chỉ nên dùng trên môi trường thử nghiệm, KHÔNG chạy trên dữ liệu thật.
 */
function napDuLieuMauDeThuNghiem() {
  // 1) Đơn vị mẫu
  var donVi1 = themNeuChuaCo_(SHEETS.DON_VI, 'Ma_DonVi', 'KHOA_YHCT', {
    ID_DonVi: newId_('DV'), Ten_DonVi: 'Khoa Y học cổ truyền', Ma_DonVi: 'KHOA_YHCT', Nguoi_Phu_Trach: 'donvi1',
  });
  var donVi2 = themNeuChuaCo_(SHEETS.DON_VI, 'Ma_DonVi', 'KHOA_DUOC', {
    ID_DonVi: newId_('DV'), Ten_DonVi: 'Khoa Dược', Ma_DonVi: 'KHOA_DUOC', Nguoi_Phu_Trach: 'donvi2',
  });

  // 2) Năm học mẫu
  themNeuChuaCo_(SHEETS.NAM_HOC, 'Ten_NamHoc', '2026-2027', {
    ID_NamHoc: newId_('NH'), Ten_NamHoc: '2026-2027', Ngay_BatDau: '2026-07-01', Ngay_KetThuc: '2027-06-30',
  });

  // 3) Tài khoản Đơn vị mẫu (mật khẩu: 123456 — CHỈ dùng để thử nghiệm, đổi ngay khi dùng thật)
  themNeuChuaCo_(SHEETS.NGUOI_DUNG, 'Ten_Dang_Nhap', 'donvi1', {
    ID_NguoiDung: newId_('U'), Ten_Dang_Nhap: 'donvi1', Mat_Khau_Hash: hashPassword_('123456'),
    Ho_Ten: 'Người phụ trách Khoa YHCT', Vai_Tro: 'DonVi', ID_DonVi: donVi1.ID_DonVi,
    Trang_Thai: 'Hoat_Dong', Ngay_Tao: todayStr_(),
  });
  themNeuChuaCo_(SHEETS.NGUOI_DUNG, 'Ten_Dang_Nhap', 'donvi2', {
    ID_NguoiDung: newId_('U'), Ten_Dang_Nhap: 'donvi2', Mat_Khau_Hash: hashPassword_('123456'),
    Ho_Ten: 'Người phụ trách Khoa Dược', Vai_Tro: 'DonVi', ID_DonVi: donVi2.ID_DonVi,
    Trang_Thai: 'Hoat_Dong', Ngay_Tao: todayStr_(),
  });

  // 4) Giảng viên mẫu — đủ các mức học hàm/học vị để thử tính thù lao
  themNeuChuaCo_(SHEETS.GIANG_VIEN, 'So_CCCD', '079001000001', {
    ID_GiangVien: newId_('GV'), So_CCCD: '079001000001', Ho_Ten: 'Nguyễn Văn A', Ngay_Sinh: '1975-05-10',
    Gioi_Tinh: 'Nam', Hoc_Ham_Hoc_Vi: 'PGS.TS', Chuyen_Nganh: 'Y học cổ truyền',
    Don_Vi_Cong_Tac_Chinh: 'Bệnh viện Y học cổ truyền Trung ương', Dia_Chi: 'TP.HCM',
    So_Dien_Thoai: '0900000001', Email: 'nguyenvana@example.com',
    So_Tai_Khoan: '1000000001', Ngan_Hang: 'Vietcombank', Chi_Nhanh: 'HCM', Ma_So_Thue: '',
    Trang_Thai_Ho_So: 'Dang_Hoat_Dong', Nguoi_Tao: 'seed', Ngay_Tao: todayStr_(),
  });
  themNeuChuaCo_(SHEETS.GIANG_VIEN, 'So_CCCD', '079001000002', {
    ID_GiangVien: newId_('GV'), So_CCCD: '079001000002', Ho_Ten: 'Trần Thị B', Ngay_Sinh: '1980-08-20',
    Gioi_Tinh: 'Nữ', Hoc_Ham_Hoc_Vi: 'ThS', Chuyen_Nganh: 'Dược học',
    Don_Vi_Cong_Tac_Chinh: 'Bệnh viện Chợ Rẫy', Dia_Chi: 'TP.HCM',
    So_Dien_Thoai: '0900000002', Email: 'tranthib@example.com',
    So_Tai_Khoan: '1000000002', Ngan_Hang: 'BIDV', Chi_Nhanh: 'HCM', Ma_So_Thue: '',
    Trang_Thai_Ho_So: 'Dang_Hoat_Dong', Nguoi_Tao: 'seed', Ngay_Tao: todayStr_(),
  });

  Logger.log('Đã nạp dữ liệu mẫu: 2 đơn vị, 1 năm học, 2 tài khoản đơn vị (donvi1/donvi2, mật khẩu 123456), 2 giảng viên.');
  Logger.log('Đăng nhập thử: admin (đã tạo ở taoTaiKhoanAdminDauTien) hoặc donvi1 / 123456.');
  Logger.log('CCCD để tra cứu thử: 079001000001 (PGS.TS) hoặc 079001000002 (ThS).');
}

/** Thêm 1 dòng nếu chưa tồn tại bản ghi nào có cột `colName` = `value`. Trả về bản ghi (mới hoặc đã có). */
function themNeuChuaCo_(sheetName, colName, value, record) {
  var all = sheetToObjects_(sheetName);
  var existed = all.filter(function (r) { return r[colName] === value; })[0];
  if (existed) return existed;
  appendRow_(sheetName, record);
  return record;
}
