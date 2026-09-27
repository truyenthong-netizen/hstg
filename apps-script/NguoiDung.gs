/**
 * NguoiDung.gs — Admin quản lý tài khoản đăng nhập (vai trò DonVi/Admin).
 * Đây là phần bị thiếu trong khung ban đầu: có schema NGUOI_DUNG nhưng chưa có
 * API để Admin tự tạo thêm tài khoản cho từng đơn vị (trước đó chỉ có
 * taoTaiKhoanAdminDauTien chạy tay 1 lần trong Apps Script editor).
 */

function api_danhSachNguoiDung(payload) {
  yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.NGUOI_DUNG);
  // Không trả mật khẩu đã băm ra ngoài.
  return okResponse_(all.map(function (u) {
    return {
      ID_NguoiDung: u.ID_NguoiDung,
      Ten_Dang_Nhap: u.Ten_Dang_Nhap,
      Ho_Ten: u.Ho_Ten,
      Vai_Tro: u.Vai_Tro,
      ID_DonVi: u.ID_DonVi,
      Trang_Thai: u.Trang_Thai,
    };
  }));
}

/** payload.nguoiDung: { Ten_Dang_Nhap, MatKhau, Ho_Ten, Vai_Tro, ID_DonVi } */
function api_taoNguoiDung(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.nguoiDung || {};
  if (!d.Ten_Dang_Nhap || !d.MatKhau || !d.Vai_Tro) {
    return errorResponse_('Thiếu tên đăng nhập, mật khẩu hoặc vai trò', 'INVALID_INPUT');
  }
  if (d.Vai_Tro === 'DonVi' && !d.ID_DonVi) {
    return errorResponse_('Tài khoản vai trò Đơn vị phải chọn đơn vị', 'INVALID_INPUT');
  }

  return withLock_(function () {
    var all = sheetToObjects_(SHEETS.NGUOI_DUNG);
    var trung = all.filter(function (u) { return u.Ten_Dang_Nhap === d.Ten_Dang_Nhap; })[0];
    if (trung) return errorResponse_('Tên đăng nhập đã tồn tại', 'DUPLICATE_USERNAME');

    var record = {
      ID_NguoiDung: newId_('U'),
      Ten_Dang_Nhap: d.Ten_Dang_Nhap,
      Mat_Khau_Hash: hashPassword_(d.MatKhau),
      Ho_Ten: d.Ho_Ten || d.Ten_Dang_Nhap,
      Vai_Tro: d.Vai_Tro,
      ID_DonVi: d.Vai_Tro === 'DonVi' ? d.ID_DonVi : '',
      Trang_Thai: 'Hoat_Dong',
      Ngay_Tao: todayStr_(),
    };
    appendRow_(SHEETS.NGUOI_DUNG, record);
    ghiNhatKy_('NGUOI_DUNG', record.ID_NguoiDung, 'Tao_Moi', null, { Ten_Dang_Nhap: record.Ten_Dang_Nhap, Vai_Tro: record.Vai_Tro }, session.tenDangNhap);

    var out = Object.assign({}, record);
    delete out.Mat_Khau_Hash;
    return okResponse_(out);
  });
}

/** Khoá/mở tài khoản, đổi mật khẩu. payload.patch có thể gồm Trang_Thai và/hoặc MatKhauMoi. */
function api_suaNguoiDung(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.NGUOI_DUNG);
  var target = all.filter(function (u) { return u.ID_NguoiDung === payload.idNguoiDung; })[0];
  if (!target) return errorResponse_('Không tìm thấy tài khoản', 'NOT_FOUND');

  var patch = {};
  if (payload.patch && payload.patch.Trang_Thai) patch.Trang_Thai = payload.patch.Trang_Thai;
  if (payload.patch && payload.patch.MatKhauMoi) patch.Mat_Khau_Hash = hashPassword_(payload.patch.MatKhauMoi);

  updateRow_(SHEETS.NGUOI_DUNG, target.__row, patch);
  ghiNhatKy_('NGUOI_DUNG', target.ID_NguoiDung, 'Chinh_Sua', { Trang_Thai: target.Trang_Thai }, { Trang_Thai: patch.Trang_Thai }, session.tenDangNhap);
  return okResponse_({});
}

/** Người dùng tự đổi mật khẩu của chính mình (không cần quyền Admin). */
function api_doiMatKhauCuaToi(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var all = sheetToObjects_(SHEETS.NGUOI_DUNG);
  var target = all.filter(function (u) { return u.ID_NguoiDung === session.idNguoiDung; })[0];
  if (!target) return errorResponse_('Không tìm thấy tài khoản', 'NOT_FOUND');
  if (hashPassword_(payload.matKhauCu || '') !== target.Mat_Khau_Hash) {
    return errorResponse_('Mật khẩu cũ không đúng', 'WRONG_PASSWORD');
  }
  updateRow_(SHEETS.NGUOI_DUNG, target.__row, { Mat_Khau_Hash: hashPassword_(payload.matKhauMoi) });
  ghiNhatKy_('NGUOI_DUNG', target.ID_NguoiDung, 'Doi_Mat_Khau', null, null, session.tenDangNhap);
  return okResponse_({});
}
