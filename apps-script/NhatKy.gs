/**
 * NhatKy.gs — nhật ký thao tác (audit trail), theo Mục 7 tài liệu YCNV.
 * Bảng NHAT_KY_THAO_TAC chỉ được APPEND, không có hàm sửa/xoá nào được cung cấp
 * để tránh vô tình xoá lịch sử.
 */

function ghiNhatKy_(doiTuong, idDoiTuong, hanhDong, noiDungTruoc, noiDungSau, nguoiThucHien) {
  appendRow_(SHEETS.NHAT_KY_THAO_TAC, {
    ID_NhatKy: newId_('LOG'),
    Doi_Tuong: doiTuong,
    ID_DoiTuong: idDoiTuong,
    Hanh_Dong: hanhDong,
    Noi_Dung_Truoc: noiDungTruoc ? JSON.stringify(noiDungTruoc) : '',
    Noi_Dung_Sau: noiDungSau ? JSON.stringify(noiDungSau) : '',
    Nguoi_Thuc_Hien: nguoiThucHien,
    Thoi_Gian: nowStr_(),
  });
}

/** API: lấy nhật ký của 1 đối tượng cụ thể, mới nhất trước. */
function api_layNhatKy(payload) {
  var all = sheetToObjects_(SHEETS.NHAT_KY_THAO_TAC);
  var filtered = all.filter(function (r) {
    return (!payload.doiTuong || r.Doi_Tuong === payload.doiTuong) &&
           (!payload.idDoiTuong || r.ID_DoiTuong === payload.idDoiTuong);
  });
  filtered.sort(function (a, b) { return new Date(b.Thoi_Gian) - new Date(a.Thoi_Gian); });
  return filtered;
}
