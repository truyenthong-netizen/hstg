/**
 * HopDong.gs — Bước 5, 6, 7: lập hợp đồng (Admin), vòng đời trạng thái, điều chỉnh.
 * Theo Mục 9.4, 9.5 tài liệu YCNV.
 *
 * Ràng buộc bắt buộc (đã chốt với đơn vị): mọi hợp đồng phải liên kết đồng thời
 * Giảng viên (ID_GiangVien + CCCD) + Đơn vị + Năm học — KHÔNG định danh theo tên.
 */

/**
 * Sinh số hợp đồng dạng STT/NamHoc/ĐHYD-HĐTG.
 * TODO: đơn vị xác nhận định dạng chính thức (xem Mục 12, vấn đề còn mở) trước khi lên production.
 */
function sinhMaSoHopDong_(idNamHoc, tenNamHoc) {
  var all = sheetToObjects_(SHEETS.HOP_DONG);
  var count = all.filter(function (hd) { return hd.ID_NamHoc === idNamHoc; }).length;
  var stt = ('000' + (count + 1)).slice(-3);
  return stt + '/' + tenNamHoc + '/ĐHYD-HĐTG';
}

function sinhMaSoQuyetDinh_(idNamHoc, tenNamHoc) {
  var all = sheetToObjects_(SHEETS.QUYET_DINH_HOP_DONG);
  var count = all.length; // TODO: đơn vị xác nhận có reset theo năm học hay không (Mục 12)
  var stt = ('000' + (count + 1)).slice(-3);
  return stt + '/' + tenNamHoc + '/QĐ-ĐHYD';
}

/**
 * Bước 5: Admin lập hợp đồng. Đồng thời sinh Quyết định 1-1 (đã xác nhận với đơn vị).
 * payload.hopDong: { ID_NamHoc, ID_DonVi, ID_GiangVien, ID_PhanCong, Noi_Dung_Giang_Day,
 *                     Tu_Ngay, Den_Ngay, chiTietGioDuKien: [{ID_NoiDung, Cap_Bac, So_Gio}] }
 */
function api_taoHopDong(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.hopDong || {};
  var required = ['ID_NamHoc', 'ID_DonVi', 'ID_GiangVien'];
  for (var i = 0; i < required.length; i++) {
    if (!d[required[i]]) return errorResponse_('Thiếu trường: ' + required[i], 'INVALID_INPUT');
  }

  var giangVien = sheetToObjects_(SHEETS.GIANG_VIEN).filter(function (gv) { return gv.ID_GiangVien === d.ID_GiangVien; })[0];
  if (!giangVien) return errorResponse_('Không tìm thấy giảng viên', 'NOT_FOUND');
  var namHoc = sheetToObjects_(SHEETS.NAM_HOC).filter(function (nh) { return nh.ID_NamHoc === d.ID_NamHoc; })[0];
  if (!namHoc) return errorResponse_('Không tìm thấy năm học', 'NOT_FOUND');

  return withLock_(function () {
    var idHopDong = newId_('HD');
    var maSoHopDong = sinhMaSoHopDong_(d.ID_NamHoc, namHoc.Ten_NamHoc);
    var idQuyetDinh = newId_('QD');
    var maSoQuyetDinh = sinhMaSoQuyetDinh_(d.ID_NamHoc, namHoc.Ten_NamHoc);

    var hopDong = {
      ID_HopDong: idHopDong,
      Ma_So_HopDong: maSoHopDong,
      ID_NamHoc: d.ID_NamHoc,
      ID_DonVi: d.ID_DonVi,
      ID_GiangVien: d.ID_GiangVien,
      So_CCCD: giangVien.So_CCCD, // chốt cứng theo CCCD tại thời điểm ký, không tự đổi theo sau
      ID_PhanCong: d.ID_PhanCong || '',
      ID_QuyetDinh: idQuyetDinh,
      Noi_Dung_Giang_Day: d.Noi_Dung_Giang_Day || '',
      Tu_Ngay: d.Tu_Ngay || '',
      Den_Ngay: d.Den_Ngay || '',
      Trang_Thai: 'Du_Thao',
      Ly_Do_Huy: '',
      Nguoi_Tao: session.tenDangNhap,
      Ngay_Tao: todayStr_(),
      Ngay_Ky: '',
    };
    appendRow_(SHEETS.HOP_DONG, hopDong);

    var quyetDinh = {
      ID_QuyetDinh: idQuyetDinh,
      Ma_So_QuyetDinh: maSoQuyetDinh,
      ID_HopDong: idHopDong,
      Trich_Yeu: 'Về việc hợp đồng thỉnh giảng đối với ' + giangVien.Ho_Ten,
      Ngay_Ky: '',
      Nguoi_Ky: '',
      File_DinhKem_Url: '',
    };
    appendRow_(SHEETS.QUYET_DINH_HOP_DONG, quyetDinh);

    // Ghi giờ dự kiến (Nguon = HopDong) vào CHI_TIET_GIO_GIANG, nếu có gửi kèm.
    (d.chiTietGioDuKien || []).forEach(function (ct) {
      ghiChiTietGio_('HopDong', idHopDong, ct.ID_NoiDung, ct.Cap_Bac, ct.So_Gio);
    });

    ghiNhatKy_('HOP_DONG', idHopDong, 'Tao_Moi', null, hopDong, session.tenDangNhap);
    ghiNhatKy_('QUYET_DINH_HOP_DONG', idQuyetDinh, 'Tao_Moi', null, quyetDinh, session.tenDangNhap);

    return okResponse_({ hopDong: hopDong, quyetDinh: quyetDinh });
  });
}

/**
 * Bước 6: chuyển trạng thái hợp đồng.
 * Du_Thao -> Da_Ky (chỉ Admin) | Da_Ky -> Da_Thanh_Ly (do api_thanhLy.gs thực hiện)
 * Du_Thao/Da_Ky -> Huy (chỉ Admin, bắt buộc Ly_Do_Huy)
 */
function api_chuyenTrangThaiHopDong(payload) {
  var session = yeuCauAdmin_(payload.token);
  var all = sheetToObjects_(SHEETS.HOP_DONG);
  var hd = all.filter(function (h) { return h.ID_HopDong === payload.idHopDong; })[0];
  if (!hd) return errorResponse_('Không tìm thấy hợp đồng', 'NOT_FOUND');

  var trangThaiMoi = payload.trangThaiMoi;
  var hopLe = {
    Du_Thao: ['Da_Ky', 'Huy'],
    Da_Ky: ['Huy'], // -> Da_Thanh_Ly chỉ qua api_thanhLy.gs, không cho set tay ở đây
  };
  if (!hopLe[hd.Trang_Thai] || hopLe[hd.Trang_Thai].indexOf(trangThaiMoi) === -1) {
    return errorResponse_('Không thể chuyển từ ' + hd.Trang_Thai + ' sang ' + trangThaiMoi, 'INVALID_TRANSITION');
  }
  if (trangThaiMoi === 'Huy' && !payload.lyDoHuy) {
    return errorResponse_('Phải nhập lý do huỷ', 'MISSING_LY_DO_HUY');
  }

  var before = { Trang_Thai: hd.Trang_Thai };
  var patch = { Trang_Thai: trangThaiMoi };
  if (trangThaiMoi === 'Da_Ky') patch.Ngay_Ky = todayStr_();
  if (trangThaiMoi === 'Huy') patch.Ly_Do_Huy = payload.lyDoHuy;

  updateRow_(SHEETS.HOP_DONG, hd.__row, patch);
  ghiNhatKy_('HOP_DONG', hd.ID_HopDong, 'Chuyen_Trang_Thai', before, patch, session.tenDangNhap);
  return okResponse_({});
}

/** Bước 8: đơn vị tra cứu hợp đồng đủ điều kiện thanh lý (Da_Ky, thuộc đúng đơn vị, chưa thanh lý). */
function api_layHopDongChoThanhLy(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var idDonVi = payload.idDonVi || session.idDonVi;
  if (session.vaiTro === 'DonVi' && idDonVi !== session.idDonVi) {
    return errorResponse_('Không có quyền xem hợp đồng đơn vị khác', 'FORBIDDEN');
  }

  var thanhLyDaCo = sheetToObjects_(SHEETS.THANH_LY_HOP_DONG).map(function (tl) { return tl.ID_HopDong; });
  var all = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) {
    return hd.ID_DonVi === idDonVi &&
      hd.Trang_Thai === 'Da_Ky' &&
      thanhLyDaCo.indexOf(hd.ID_HopDong) === -1 &&
      (!payload.tuKhoa || matchTuKhoaHopDong_(hd, payload.tuKhoa));
  });
  return okResponse_(all);
}

function matchTuKhoaHopDong_(hd, tuKhoa) {
  var s = (hd.Ma_So_HopDong + ' ' + hd.So_CCCD).toLowerCase();
  return s.indexOf(String(tuKhoa).toLowerCase()) !== -1;
}

function api_layHopDongTheoId(payload) {
  yeuCauDangNhap_(payload.token);
  var hd = sheetToObjects_(SHEETS.HOP_DONG).filter(function (h) { return h.ID_HopDong === payload.idHopDong; })[0];
  return okResponse_(hd || null);
}
