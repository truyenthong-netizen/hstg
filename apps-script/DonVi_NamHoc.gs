/**
 * DonVi_NamHoc.gs — danh mục Đơn vị và Năm học (Mục 9.2 tài liệu YCNV).
 * Theo Bước 0: người dùng phải chọn năm học trước khi thao tác dữ liệu khác.
 */

function api_danhSachDonVi(payload) {
  yeuCauDangNhap_(payload.token);
  return okResponse_(sheetToObjects_(SHEETS.DON_VI));
}

function api_danhSachNamHoc(payload) {
  yeuCauDangNhap_(payload.token);
  var all = sheetToObjects_(SHEETS.NAM_HOC);
  all.sort(function (a, b) { return new Date(b.Ngay_BatDau) - new Date(a.Ngay_BatDau); });
  return okResponse_(all);
}

/** Admin tạo năm học mới, ví dụ "2026-2027", 01/7/2026 - 30/6/2027. */
function api_taoNamHoc(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.namHoc || {};
  if (!d.Ten_NamHoc || !d.Ngay_BatDau || !d.Ngay_KetThuc) {
    return errorResponse_('Thiếu thông tin năm học', 'INVALID_INPUT');
  }
  var record = {
    ID_NamHoc: newId_('NH'),
    Ten_NamHoc: d.Ten_NamHoc,
    Ngay_BatDau: d.Ngay_BatDau,
    Ngay_KetThuc: d.Ngay_KetThuc,
  };
  appendRow_(SHEETS.NAM_HOC, record);
  ghiNhatKy_('NAM_HOC', record.ID_NamHoc, 'Tao_Moi', null, record, session.tenDangNhap);
  return okResponse_(record);
}

/** Admin tạo/sửa đơn vị. */
function api_taoDonVi(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.donVi || {};
  if (!d.Ten_DonVi || !d.Ma_DonVi) return errorResponse_('Thiếu tên hoặc mã đơn vị', 'INVALID_INPUT');

  var all = sheetToObjects_(SHEETS.DON_VI);
  var trung = all.filter(function (dv) { return dv.Ma_DonVi === d.Ma_DonVi; })[0];
  if (trung) return errorResponse_('Mã đơn vị đã tồn tại', 'DUPLICATE_MA_DONVI');

  var record = {
    ID_DonVi: newId_('DV'),
    Ten_DonVi: d.Ten_DonVi,
    Ma_DonVi: d.Ma_DonVi,
    Nguoi_Phu_Trach: d.Nguoi_Phu_Trach || '',
  };
  appendRow_(SHEETS.DON_VI, record);
  ghiNhatKy_('DON_VI', record.ID_DonVi, 'Tao_Moi', null, record, session.tenDangNhap);
  return okResponse_(record);
}
