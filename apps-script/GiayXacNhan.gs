/**
 * GiayXacNhan.gs — Mục 9.8 tài liệu YCNV. Đại diện mẫu "Giấy xác nhận giờ giảng
 * và hoàn thành nhiệm vụ" do Trưởng bộ môn/đơn vị lập, làm căn cứ Bước 9-10 (thanh lý).
 *
 * TODO (Mục 12, vấn đề còn mở): xác nhận với Phòng Tổ chức Cán bộ ai là người lập GCN
 * trên hệ thống và có cần thêm bước duyệt hay không. Hiện tại cho phép Đơn vị lập trực tiếp.
 */

function sinhMaSoGCN_() {
  var all = sheetToObjects_(SHEETS.GIAY_XAC_NHAN_GIO_GIANG);
  var stt = ('000' + (all.length + 1)).slice(-3);
  return stt + '/CN-ĐHYD';
}

/**
 * payload.gcn: { ID_HopDong, Thoi_Gian_Tu_Den, Nguoi_Xac_Nhan, Chuc_Vu_Nguoi_Xac_Nhan, File_DinhKem_Url,
 *                chiTietGioThucTe: [{Cap_Bac, So_Gio}] }  (Cap_Bac: 'DaiHoc'|'SauDaiHoc'|'NCKH')
 */
function api_taoGiayXacNhan(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var d = payload.gcn || {};
  if (!d.ID_HopDong) return errorResponse_('Thiếu ID_HopDong', 'INVALID_INPUT');

  var hopDong = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) { return hd.ID_HopDong === d.ID_HopDong; })[0];
  if (!hopDong) return errorResponse_('Không tìm thấy hợp đồng', 'NOT_FOUND');
  if (session.vaiTro === 'DonVi' && !coId_(hopDong.ID_DonVi, session.idDonVi)) {
    return errorResponse_('Không có quyền lập giấy xác nhận cho hợp đồng đơn vị khác', 'FORBIDDEN');
  }

  return withLock_(function () {
    var idGCN = newId_('GCN');
    var record = {
      ID_GCN: idGCN,
      Ma_So_GCN: sinhMaSoGCN_(),
      ID_HopDong: d.ID_HopDong,
      Thoi_Gian_Tu_Den: d.Thoi_Gian_Tu_Den || '',
      Nguoi_Xac_Nhan: d.Nguoi_Xac_Nhan || '',
      Chuc_Vu_Nguoi_Xac_Nhan: d.Chuc_Vu_Nguoi_Xac_Nhan || '',
      File_DinhKem_Url: d.File_DinhKem_Url || '',
      Ngay_Lap: todayStr_(),
    };
    appendRow_(SHEETS.GIAY_XAC_NHAN_GIO_GIANG, record);

    (d.chiTietGioThucTe || []).forEach(function (ct) {
      ghiChiTietGio_('GCN', idGCN, ct.Cap_Bac, ct.So_Gio);
    });

    ghiNhatKy_('GIAY_XAC_NHAN_GIO_GIANG', idGCN, 'Tao_Moi', null, record, session.tenDangNhap);
    return okResponse_(record);
  });
}

function api_layGCNTheoHopDong(payload) {
  yeuCauDangNhap_(payload.token);
  var found = sheetToObjects_(SHEETS.GIAY_XAC_NHAN_GIO_GIANG).filter(function (g) {
    return g.ID_HopDong === payload.idHopDong;
  });
  return okResponse_(found);
}
