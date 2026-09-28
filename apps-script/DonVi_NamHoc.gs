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

/** Admin sửa tên/người phụ trách đơn vị. Không cho đổi Mã đơn vị (dùng làm khoá tự nhiên ổn định). */
function api_suaDonVi(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.DON_VI);
  var target = all.filter(function (dv) { return dv.ID_DonVi === payload.idDonVi; })[0];
  if (!target) return errorResponse_('Không tìm thấy đơn vị', 'NOT_FOUND');

  var p = payload.patch || {};
  var patch = {};
  if (p.Ten_DonVi) patch.Ten_DonVi = p.Ten_DonVi;
  if (p.Nguoi_Phu_Trach !== undefined) patch.Nguoi_Phu_Trach = p.Nguoi_Phu_Trach;

  var before = { Ten_DonVi: target.Ten_DonVi, Nguoi_Phu_Trach: target.Nguoi_Phu_Trach };
  updateRow_(SHEETS.DON_VI, target.__row, patch);
  ghiNhatKy_('DON_VI', target.ID_DonVi, 'Chinh_Sua', before, patch, session.tenDangNhap);
  return okResponse_({});
}

/** Xoá đơn vị — chỉ cho phép nếu chưa có hợp đồng, danh sách thỉnh giảng hoặc tài khoản nào gắn với đơn vị này. */
function api_xoaDonVi(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.DON_VI);
  var target = all.filter(function (dv) { return dv.ID_DonVi === payload.idDonVi; })[0];
  if (!target) return errorResponse_('Không tìm thấy đơn vị', 'NOT_FOUND');

  var dangDung =
    sheetToObjects_(SHEETS.HOP_DONG).some(function (r) { return r.ID_DonVi === target.ID_DonVi; }) ||
    sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG).some(function (r) { return r.ID_DonVi === target.ID_DonVi; }) ||
    sheetToObjects_(SHEETS.NGUOI_DUNG).some(function (r) { return r.ID_DonVi === target.ID_DonVi; });
  if (dangDung) {
    return errorResponse_('Đơn vị đang được dùng (có hợp đồng, danh sách hoặc tài khoản gắn kèm) — không thể xoá', 'IN_USE');
  }

  deleteRow_(SHEETS.DON_VI, target.__row);
  ghiNhatKy_('DON_VI', target.ID_DonVi, 'Xoa', { Ten_DonVi: target.Ten_DonVi, Ma_DonVi: target.Ma_DonVi }, null, session.tenDangNhap);
  return okResponse_({});
}

/** Admin sửa năm học. */
function api_suaNamHoc(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.NAM_HOC);
  var target = all.filter(function (nh) { return nh.ID_NamHoc === payload.idNamHoc; })[0];
  if (!target) return errorResponse_('Không tìm thấy năm học', 'NOT_FOUND');

  var p = payload.patch || {};
  var patch = {};
  if (p.Ten_NamHoc) patch.Ten_NamHoc = p.Ten_NamHoc;
  if (p.Ngay_BatDau) patch.Ngay_BatDau = p.Ngay_BatDau;
  if (p.Ngay_KetThuc) patch.Ngay_KetThuc = p.Ngay_KetThuc;

  var before = { Ten_NamHoc: target.Ten_NamHoc, Ngay_BatDau: target.Ngay_BatDau, Ngay_KetThuc: target.Ngay_KetThuc };
  updateRow_(SHEETS.NAM_HOC, target.__row, patch);
  ghiNhatKy_('NAM_HOC', target.ID_NamHoc, 'Chinh_Sua', before, patch, session.tenDangNhap);
  return okResponse_({});
}

/** Xoá năm học — chỉ cho phép nếu chưa có hợp đồng hoặc danh sách thỉnh giảng nào gắn với năm học này. */
function api_xoaNamHoc(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.NAM_HOC);
  var target = all.filter(function (nh) { return nh.ID_NamHoc === payload.idNamHoc; })[0];
  if (!target) return errorResponse_('Không tìm thấy năm học', 'NOT_FOUND');

  var dangDung =
    sheetToObjects_(SHEETS.HOP_DONG).some(function (r) { return r.ID_NamHoc === target.ID_NamHoc; }) ||
    sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG).some(function (r) { return r.ID_NamHoc === target.ID_NamHoc; });
  if (dangDung) {
    return errorResponse_('Năm học đang được dùng (có hợp đồng hoặc danh sách gắn kèm) — không thể xoá', 'IN_USE');
  }

  deleteRow_(SHEETS.NAM_HOC, target.__row);
  ghiNhatKy_('NAM_HOC', target.ID_NamHoc, 'Xoa', { Ten_NamHoc: target.Ten_NamHoc }, null, session.tenDangNhap);
  return okResponse_({});
}
