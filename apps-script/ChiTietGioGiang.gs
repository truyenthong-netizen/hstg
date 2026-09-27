/**
 * ChiTietGioGiang.gs — Mục 9.7 tài liệu YCNV.
 * Dùng chung 1 bảng cho cả giờ dự kiến (Nguon='HopDong') và giờ thực tế (Nguon='GCN'),
 * theo đúng cấu trúc ma trận 2 hàng (Đại học/Sau đại học) × 6 loại nội dung
 * trong mẫu Giấy xác nhận giờ giảng / Thanh lý hợp đồng thực tế.
 */

function ghiChiTietGio_(nguon, idThamChieu, idNoiDung, capBac, soGio) {
  var dmNoiDung = sheetToObjects_(SHEETS.DM_NOI_DUNG_GIANG_DAY).filter(function (nd) { return nd.ID_NoiDung === idNoiDung; })[0];
  var heSo = dmNoiDung ? Number(dmNoiDung.He_So_Quy_Doi_Mac_Dinh || 1) : 1;
  var record = {
    ID_ChiTiet: newId_('CT'),
    Nguon: nguon,
    ID_ThamChieu: idThamChieu,
    ID_NoiDung: idNoiDung,
    Cap_Bac: capBac,
    So_Gio: Number(soGio) || 0,
    So_Gio_Chuan: (Number(soGio) || 0) * heSo,
  };
  appendRow_(SHEETS.CHI_TIET_GIO_GIANG, record);
  return record;
}

function layChiTietTheoThamChieu_(nguon, idThamChieu) {
  return sheetToObjects_(SHEETS.CHI_TIET_GIO_GIANG).filter(function (ct) {
    return ct.Nguon === nguon && ct.ID_ThamChieu === idThamChieu;
  });
}

/** Tổng số giờ chuẩn của 1 nguồn (hợp đồng hoặc GCN), gộp tất cả loại nội dung + cấp bậc. */
function tongGioChuan_(nguon, idThamChieu) {
  return layChiTietTheoThamChieu_(nguon, idThamChieu)
    .reduce(function (sum, ct) { return sum + Number(ct.So_Gio_Chuan || 0); }, 0);
}

function api_danhMucNoiDungGiangDay(payload) {
  yeuCauDangNhap_(payload.token);
  return okResponse_(sheetToObjects_(SHEETS.DM_NOI_DUNG_GIANG_DAY));
}

function api_layChiTietGio(payload) {
  yeuCauDangNhap_(payload.token);
  return okResponse_(layChiTietTheoThamChieu_(payload.nguon, payload.idThamChieu));
}
