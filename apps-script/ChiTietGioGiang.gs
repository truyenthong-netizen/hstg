/**
 * ChiTietGioGiang.gs.
 * Dùng chung 1 bảng cho cả giờ dự kiến (Nguon='PhanCong' rồi 'HopDong') và giờ thực tế (Nguon='GCN'),
 * theo đúng mẫu thực tế đơn vị nộp: "Tổng số giờ chuẩn quy đổi, trong đó: Đại học / Sau đại học /
 * Nghiên cứu khoa học" — KHÔNG còn chia nhỏ theo 6 loại nội dung giảng dạy như bản trước.
 * Cap_Bac giờ mang 1 trong 3 giá trị: 'DaiHoc' | 'SauDaiHoc' | 'NCKH'.
 * Đơn vị nhập trực tiếp SỐ GIỜ CHUẨN đã quy đổi (không cần hệ số quy đổi nữa),
 * nên So_Gio_Chuan luôn bằng So_Gio. Cột ID_NoiDung giữ lại trong schema cho tương thích
 * ngược nhưng không còn dùng (luôn để trống).
 */

function ghiChiTietGio_(nguon, idThamChieu, capBac, soGio) {
  var record = {
    ID_ChiTiet: newId_('CT'),
    Nguon: nguon,
    ID_ThamChieu: idThamChieu,
    ID_NoiDung: '',
    Cap_Bac: capBac,
    So_Gio: Number(soGio) || 0,
    So_Gio_Chuan: Number(soGio) || 0,
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
