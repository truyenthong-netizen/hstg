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
 * payload.hopDong: { ID_NamHoc, ID_GiangVien, danhSachIdPhanCong: [ID_PhanCong,...], Noi_Dung_Giang_Day, Tu_Ngay, Den_Ngay }
 *
 * QUAN TRỌNG (đã chốt 4/2026): 1 giảng viên chỉ có ĐÚNG 1 hợp đồng cho 1 năm học, dù được
 * NHIỀU đơn vị mời giảng — KHÔNG được tách thành nhiều hợp đồng theo từng đơn vị. Vì vậy
 * Admin chọn 1 hoặc nhiều dòng danh sách (mỗi dòng do 1 đơn vị lập) của cùng 1 giảng viên +
 * năm học để gộp vào 1 hợp đồng duy nhất; có thể lập trước với các đơn vị đã nộp giờ, đơn vị
 * nộp sau sẽ bổ sung qua Phụ lục (xem PhuLuc.gs).
 * Cột ID_DonVi/ID_PhanCong trên HOP_DONG lưu DANH SÁCH id cách nhau dấu phẩy (xem dsIdTuChuoi_,
 * coId_ trong Utils.gs) để không phải đổi tên cột đã có trên Sheet.
 *
 * Số giờ dự kiến theo loại nội dung KHÔNG do Admin tự nhập — đơn vị là nơi duy nhất lập danh
 * sách + nộp giờ dự kiến (xem api_capNhatGioDuKien trong PhanCong.gs). Ở đây chỉ ĐỌC LẠI đúng
 * số đơn vị đã nộp theo từng ID_PhanCong rồi CỘNG DỒN theo từng mục, không nhận số từ client
 * gửi lên, để tránh Admin (hoặc ai đó sửa request) tự ý đổi số giờ ngoài ý muốn đơn vị.
 */
function api_taoHopDong(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.hopDong || {};
  var dsIdPhanCong = d.danhSachIdPhanCong || (d.ID_PhanCong ? [d.ID_PhanCong] : []);
  if (!d.ID_NamHoc) return errorResponse_('Thiếu trường: ID_NamHoc', 'INVALID_INPUT');
  if (!d.ID_GiangVien) return errorResponse_('Thiếu trường: ID_GiangVien', 'INVALID_INPUT');
  if (!dsIdPhanCong.length) return errorResponse_('Chưa chọn dòng danh sách nào để lập hợp đồng', 'INVALID_INPUT');

  var giangVien = sheetToObjects_(SHEETS.GIANG_VIEN).filter(function (gv) { return gv.ID_GiangVien === d.ID_GiangVien; })[0];
  if (!giangVien) return errorResponse_('Không tìm thấy giảng viên', 'NOT_FOUND');
  var namHoc = sheetToObjects_(SHEETS.NAM_HOC).filter(function (nh) { return nh.ID_NamHoc === d.ID_NamHoc; })[0];
  if (!namHoc) return errorResponse_('Không tìm thấy năm học', 'NOT_FOUND');

  var daCoHopDong = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) {
    return hd.ID_GiangVien === d.ID_GiangVien && hd.ID_NamHoc === d.ID_NamHoc && hd.Trang_Thai !== 'Huy';
  })[0];
  if (daCoHopDong) {
    return errorResponse_(
      'Giảng viên này đã có hợp đồng ' + daCoHopDong.Ma_So_HopDong + ' cho năm học này — mỗi giảng viên chỉ 1 hợp đồng/năm học. Nếu có đơn vị mời giảng thêm, dùng Lập phụ lục trên hợp đồng đó.',
      'DA_CO_HOP_DONG'
    );
  }

  var tatCaPhanCong = sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG);
  var dsPhanCongChon = dsIdPhanCong.map(function (id) {
    return tatCaPhanCong.filter(function (pc) { return pc.ID_PhanCong === id; })[0];
  });
  if (dsPhanCongChon.some(function (pc) { return !pc; })) {
    return errorResponse_('Có dòng danh sách không tồn tại', 'NOT_FOUND');
  }
  var coDongKhongKhop = dsPhanCongChon.some(function (pc) {
    return pc.ID_GiangVien !== d.ID_GiangVien || pc.ID_NamHoc !== d.ID_NamHoc;
  });
  if (coDongKhongKhop) {
    return errorResponse_('Có dòng danh sách không khớp giảng viên/năm học đã chọn', 'MISMATCH');
  }

  // Cộng dồn giờ dự kiến theo từng mục (Đại học / Sau đại học / NCKH) từ TẤT CẢ dòng đã chọn,
  // có thể đến từ nhiều đơn vị khác nhau.
  var gomTheoCapBac = {};
  dsPhanCongChon.forEach(function (pc) {
    layChiTietTheoThamChieu_('PhanCong', pc.ID_PhanCong).forEach(function (ct) {
      gomTheoCapBac[ct.Cap_Bac] = (gomTheoCapBac[ct.Cap_Bac] || 0) + Number(ct.So_Gio || 0);
    });
  });
  if (!Object.keys(gomTheoCapBac).length) {
    return errorResponse_('Chưa có đơn vị nào nộp giờ giảng dự kiến cho giảng viên này trong năm học đã chọn — vào trang Danh sách đơn vị, dùng nút "Nhập giờ" trước khi lập hợp đồng', 'MISSING_GIO_DU_KIEN');
  }

  var dsIdDonVi = uniq_(dsPhanCongChon.map(function (pc) { return pc.ID_DonVi; }));

  return withLock_(function () {
    var idHopDong = newId_('HD');
    var maSoHopDong = sinhMaSoHopDong_(d.ID_NamHoc, namHoc.Ten_NamHoc);
    var idQuyetDinh = newId_('QD');
    var maSoQuyetDinh = sinhMaSoQuyetDinh_(d.ID_NamHoc, namHoc.Ten_NamHoc);

    var hopDong = {
      ID_HopDong: idHopDong,
      Ma_So_HopDong: maSoHopDong,
      ID_NamHoc: d.ID_NamHoc,
      ID_DonVi: dsIdDonVi.join(','), // danh sách đơn vị đã gộp vào hợp đồng này, cách nhau dấu phẩy
      ID_GiangVien: d.ID_GiangVien,
      So_CCCD: giangVien.So_CCCD, // chốt cứng theo CCCD tại thời điểm ký, không tự đổi theo sau
      ID_PhanCong: dsIdPhanCong.join(','), // danh sách dòng danh sách đã gộp, cách nhau dấu phẩy
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

    // Sao chép giờ dự kiến đơn vị đã nộp (Nguon = PhanCong, đã cộng dồn nhiều đơn vị ở trên)
    // thành Nguon = HopDong, gắn cố định vào hợp đồng này tại thời điểm lập (không đổi theo
    // nếu đơn vị sửa lại dòng danh sách gốc sau này).
    Object.keys(gomTheoCapBac).forEach(function (capBac) {
      ghiChiTietGio_('HopDong', idHopDong, capBac, gomTheoCapBac[capBac]);
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
    return coId_(hd.ID_DonVi, idDonVi) &&
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

/**
 * Admin: liet ke toan bo hop dong (tuy chon loc theo don vi/nam hoc/trang thai),
 * kem ten giang vien va ten don vi de hien thi o giao dien quan ly hop dong.
 */
function api_danhSachHopDong(payload) {
  yeuCauAdmin_(payload.token);
  var giangViens = sheetToObjects_(SHEETS.GIANG_VIEN);
  var donVis = sheetToObjects_(SHEETS.DON_VI);
  var gvMap = {};
  giangViens.forEach(function (gv) { gvMap[gv.ID_GiangVien] = gv; });
  var dvMap = {};
  donVis.forEach(function (dv) { dvMap[dv.ID_DonVi] = dv; });

  var all = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) {
    return (!payload.idDonVi || coId_(hd.ID_DonVi, payload.idDonVi)) &&
      (!payload.idNamHoc || hd.ID_NamHoc === payload.idNamHoc) &&
      (!payload.trangThai || hd.Trang_Thai === payload.trangThai);
  });

  var result = all.map(function (hd) {
    var gv = gvMap[hd.ID_GiangVien] || {};
    var tenCacDonVi = dsIdTuChuoi_(hd.ID_DonVi).map(function (id) { return (dvMap[id] || {}).Ten_DonVi || id; });
    return Object.assign({}, hd, {
      Ho_Ten_GiangVien: gv.Ho_Ten,
      Hoc_Ham_Hoc_Vi: gv.Hoc_Ham_Hoc_Vi,
      Ten_DonVi: tenCacDonVi.join(', '),
    });
  });
  result.sort(function (a, b) { return new Date(b.Ngay_Tao) - new Date(a.Ngay_Tao); });
  return okResponse_(result);
}
