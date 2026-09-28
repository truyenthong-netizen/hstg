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

/** true nếu định mức này đã được dùng để tính thù lao ít nhất 1 lần thanh lý. */
function dinhMucDaDuocDung_(idDinhMuc) {
  return sheetToObjects_(SHEETS.THANH_LY_HOP_DONG).some(function (tl) { return tl.ID_DinhMuc === idDinhMuc; });
}

/**
 * Admin sửa định mức. Nếu định mức đã được dùng để thanh lý ít nhất 1 hợp đồng,
 * KHÔNG cho đổi Học hàm/học vị hoặc Đơn giá (sẽ làm sai lệch cách hiểu số liệu đã tính) —
 * chỉ cho sửa Ngày hiệu lực đến / Căn cứ trong trường hợp đó. Muốn đổi đơn giá, thêm dòng mới.
 */
function api_suaDinhMuc(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.DINH_MUC_DON_GIA);
  var target = all.filter(function (dm) { return dm.ID_DinhMuc === payload.idDinhMuc; })[0];
  if (!target) return errorResponse_('Không tìm thấy định mức', 'NOT_FOUND');

  var p = payload.patch || {};
  var daDung = dinhMucDaDuocDung_(target.ID_DinhMuc);
  if (daDung && ((p.Don_Gia_Gio_Chuan !== undefined && Number(p.Don_Gia_Gio_Chuan) !== Number(target.Don_Gia_Gio_Chuan)) ||
    (p.Hoc_Ham_Hoc_Vi && p.Hoc_Ham_Hoc_Vi !== target.Hoc_Ham_Hoc_Vi))) {
    return errorResponse_('Định mức này đã được dùng để thanh lý ít nhất 1 hợp đồng — không thể đổi học hàm/học vị hoặc đơn giá. Chỉ có thể sửa ngày hiệu lực đến/căn cứ, hoặc thêm dòng định mức mới.', 'IN_USE');
  }

  var patch = {};
  if (!daDung && p.Hoc_Ham_Hoc_Vi) patch.Hoc_Ham_Hoc_Vi = p.Hoc_Ham_Hoc_Vi;
  if (!daDung && p.Don_Gia_Gio_Chuan !== undefined) patch.Don_Gia_Gio_Chuan = Number(p.Don_Gia_Gio_Chuan);
  if (!daDung && p.Ngay_Hieu_Luc_Tu) patch.Ngay_Hieu_Luc_Tu = p.Ngay_Hieu_Luc_Tu;
  if (p.Ngay_Hieu_Luc_Den !== undefined) patch.Ngay_Hieu_Luc_Den = p.Ngay_Hieu_Luc_Den;
  if (p.Can_Cu_Quy_Che !== undefined) patch.Can_Cu_Quy_Che = p.Can_Cu_Quy_Che;

  var before = { Hoc_Ham_Hoc_Vi: target.Hoc_Ham_Hoc_Vi, Don_Gia_Gio_Chuan: target.Don_Gia_Gio_Chuan, Ngay_Hieu_Luc_Tu: target.Ngay_Hieu_Luc_Tu, Ngay_Hieu_Luc_Den: target.Ngay_Hieu_Luc_Den, Can_Cu_Quy_Che: target.Can_Cu_Quy_Che };
  updateRow_(SHEETS.DINH_MUC_DON_GIA, target.__row, patch);
  ghiNhatKy_('DINH_MUC_DON_GIA', target.ID_DinhMuc, 'Chinh_Sua', before, patch, session.tenDangNhap);
  return okResponse_({});
}

/** Xoá định mức — chỉ cho phép nếu chưa từng được dùng để thanh lý hợp đồng nào. */
function api_xoaDinhMuc(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.DINH_MUC_DON_GIA);
  var target = all.filter(function (dm) { return dm.ID_DinhMuc === payload.idDinhMuc; })[0];
  if (!target) return errorResponse_('Không tìm thấy định mức', 'NOT_FOUND');

  if (dinhMucDaDuocDung_(target.ID_DinhMuc)) {
    return errorResponse_('Định mức này đã được dùng để thanh lý ít nhất 1 hợp đồng — không thể xoá (sẽ mất căn cứ tính thù lao đã có). Có thể sửa Ngày hiệu lực đến để ngừng dùng.', 'IN_USE');
  }

  deleteRow_(SHEETS.DINH_MUC_DON_GIA, target.__row);
  ghiNhatKy_('DINH_MUC_DON_GIA', target.ID_DinhMuc, 'Xoa', { Hoc_Ham_Hoc_Vi: target.Hoc_Ham_Hoc_Vi, Don_Gia_Gio_Chuan: target.Don_Gia_Gio_Chuan }, null, session.tenDangNhap);
  return okResponse_({});
}
