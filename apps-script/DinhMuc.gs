/**
 * DinhMuc.gs — Mục 9.9 tài liệu YCNV.
 * Định mức chi thỉnh giảng theo học hàm/học vị (Quy chế chi tiêu nội bộ),
 * KHÔNG phải một mức chung theo năm học.
 */

/** Tìm định mức đang có hiệu lực tại 1 ngày cụ thể cho 1 học hàm/học vị. */
function timDinhMucHieuLuc_(hocHamHocVi, ngay) {
  var all = sheetToObjects_(SHEETS.DINH_MUC_DON_GIA);
  var d = ngay ? new Date(ngay) : new Date();
  return all.filter(function (dm) {
    if (dm.Hoc_Ham_Hoc_Vi !== hocHamHocVi) return false;
    var tu = dm.Ngay_Hieu_Luc_Tu ? new Date(dm.Ngay_Hieu_Luc_Tu) : null;
    var den = dm.Ngay_Hieu_Luc_Den ? new Date(dm.Ngay_Hieu_Luc_Den) : null;
    if (tu && d < tu) return false;
    if (den && d > den) return false;
    return true;
  })[0] || null;
}

function api_danhSachDinhMuc(payload) {
  yeuCauDangNhap_(payload.token);
  return okResponse_(sheetToObjects_(SHEETS.DINH_MUC_DON_GIA));
}

/** Admin cập nhật định mức mới (khi Quy chế chi tiêu nội bộ thay đổi qua các năm). */
function api_taoDinhMuc(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.dinhMuc || {};
  if (!d.Hoc_Ham_Hoc_Vi || !d.Don_Gia_Gio_Chuan) return errorResponse_('Thiếu học hàm/học vị hoặc đơn giá', 'INVALID_INPUT');

  var record = {
    ID_DinhMuc: newId_('DM'),
    Hoc_Ham_Hoc_Vi: d.Hoc_Ham_Hoc_Vi,
    Don_Gia_Gio_Chuan: Number(d.Don_Gia_Gio_Chuan),
    Ngay_Hieu_Luc_Tu: d.Ngay_Hieu_Luc_Tu || todayStr_(),
    Ngay_Hieu_Luc_Den: d.Ngay_Hieu_Luc_Den || '',
    Can_Cu_Quy_Che: d.Can_Cu_Quy_Che || '',
  };
  appendRow_(SHEETS.DINH_MUC_DON_GIA, record);
  ghiNhatKy_('DINH_MUC_DON_GIA', record.ID_DinhMuc, 'Tao_Moi', null, record, session.tenDangNhap);
  return okResponse_(record);
}
