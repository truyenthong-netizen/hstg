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
  var ketQua = _taoMotHopDong_(session, payload.hopDong || {});
  if (!ketQua.ok) return errorResponse_(ketQua.loi, ketQua.ma);
  return okResponse_({ hopDong: ketQua.hopDong, quyetDinh: ketQua.quyetDinh });
}

/**
 * Lõi xử lý lập 1 hợp đồng — tách riêng khỏi api_taoHopDong (giữ NGUYÊN logic/thứ tự kiểm
 * tra cũ, không đổi hành vi) để api_taoHopDongHangLoat bên dưới gọi lại được cho nhiều giảng
 * viên liên tiếp, thay vì Admin phải tra cứu + lập tay từng người một (không khả thi khi có
 * hàng trăm/nghìn giảng viên nộp cùng lúc — xem api_danhSachGiangVienChoLapHopDong).
 * Trả về { ok:true, hopDong, quyetDinh } hoặc { ok:false, loi, ma }.
 */
function _taoMotHopDong_(session, d) {
  var dsIdPhanCong = d.danhSachIdPhanCong || (d.ID_PhanCong ? [d.ID_PhanCong] : []);
  if (!d.ID_NamHoc) return { ok: false, loi: 'Thiếu trường: ID_NamHoc', ma: 'INVALID_INPUT' };
  if (!d.ID_GiangVien) return { ok: false, loi: 'Thiếu trường: ID_GiangVien', ma: 'INVALID_INPUT' };
  if (!dsIdPhanCong.length) return { ok: false, loi: 'Chưa chọn dòng danh sách nào để lập hợp đồng', ma: 'INVALID_INPUT' };

  var giangVien = sheetToObjects_(SHEETS.GIANG_VIEN).filter(function (gv) { return gv.ID_GiangVien === d.ID_GiangVien; })[0];
  if (!giangVien) return { ok: false, loi: 'Không tìm thấy giảng viên', ma: 'NOT_FOUND' };
  var namHoc = sheetToObjects_(SHEETS.NAM_HOC).filter(function (nh) { return nh.ID_NamHoc === d.ID_NamHoc; })[0];
  if (!namHoc) return { ok: false, loi: 'Không tìm thấy năm học', ma: 'NOT_FOUND' };

  var daCoHopDong = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) {
    return hd.ID_GiangVien === d.ID_GiangVien && hd.ID_NamHoc === d.ID_NamHoc && hd.Trang_Thai !== 'Huy';
  })[0];
  if (daCoHopDong) {
    return {
      ok: false,
      loi: 'Giảng viên ' + giangVien.Ho_Ten + ' đã có hợp đồng ' + daCoHopDong.Ma_So_HopDong + ' cho năm học này — mỗi giảng viên chỉ 1 hợp đồng/năm học. Nếu có đơn vị mời giảng thêm, dùng Lập phụ lục trên hợp đồng đó.',
      ma: 'DA_CO_HOP_DONG',
    };
  }

  var tatCaPhanCong = sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG);
  var dsPhanCongChon = dsIdPhanCong.map(function (id) {
    return tatCaPhanCong.filter(function (pc) { return pc.ID_PhanCong === id; })[0];
  });
  if (dsPhanCongChon.some(function (pc) { return !pc; })) {
    return { ok: false, loi: 'Có dòng danh sách không tồn tại', ma: 'NOT_FOUND' };
  }
  var coDongKhongKhop = dsPhanCongChon.some(function (pc) {
    return pc.ID_GiangVien !== d.ID_GiangVien || pc.ID_NamHoc !== d.ID_NamHoc;
  });
  if (coDongKhongKhop) {
    return { ok: false, loi: 'Có dòng danh sách không khớp giảng viên/năm học đã chọn', ma: 'MISMATCH' };
  }

  // Cộng dồn giờ dự kiến theo từng mục (Đại học / Sau đại học / NCKH) từ TẤT CẢ dòng đã chọn,
  // có thể đến từ nhiều đơn vị khác nhau.
  var gomTheoCapBac = {};
  dsPhanCongChon.forEach(function (pc) {
    layChiTietTheoThamChieu_('PhanCong', pc.ID_PhanCong).forEach(function (ct) {
      gomTheoCapBac[ct.Cap_Bac] = (gomTheoCapBac[ct.Cap_Bac] || 0) + soGioAnToan_(ct.So_Gio);
    });
  });
  if (!Object.keys(gomTheoCapBac).length) {
    return {
      ok: false,
      loi: 'Chưa có đơn vị nào nộp giờ giảng dự kiến cho giảng viên ' + giangVien.Ho_Ten + ' trong năm học đã chọn — vào trang Danh sách đơn vị, dùng nút "Nhập giờ" trước khi lập hợp đồng',
      ma: 'MISSING_GIO_DU_KIEN',
    };
  }

  var dsIdDonVi = uniq_(dsPhanCongChon.map(function (pc) { return pc.ID_DonVi; }));

  return withLock_(function () {
    // Kiểm tra lại lần cuối TRONG khoá — tránh 2 request lập hợp đồng cho cùng 1 giảng viên
    // chạy song song (đặc biệt khi lập hàng loạt) đều lọt qua kiểm tra "đã có hợp đồng" ở trên.
    var daCoLai = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) {
      return hd.ID_GiangVien === d.ID_GiangVien && hd.ID_NamHoc === d.ID_NamHoc && hd.Trang_Thai !== 'Huy';
    })[0];
    if (daCoLai) {
      return { ok: false, loi: 'Giảng viên ' + giangVien.Ho_Ten + ' đã có hợp đồng ' + daCoLai.Ma_So_HopDong + ' (vừa được tạo)', ma: 'DA_CO_HOP_DONG' };
    }

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

    return { ok: true, hopDong: hopDong, quyetDinh: quyetDinh };
  });
}

/**
 * Lập hợp đồng HÀNG LOẠT — trả lời câu hỏi "cả nghìn giảng viên thì Admin tra tay từng người
 * sao nổi": Admin chọn năm học + tick chọn nhiều giảng viên (lấy từ danh sách
 * api_danhSachGiangVienChoLapHopDong trả về — đã lọc sẵn CHỈ những giảng viên có ít nhất 1
 * đơn vị nộp giờ VÀ chưa có hợp đồng), hệ thống tự lấy TẤT CẢ phân công (mọi đơn vị) của từng
 * giảng viên trong năm học đó rồi lập hợp đồng lần lượt — không phải tra CCCD từng người.
 * "Nội dung giảng dạy" tự động ghép từ Môn_Hoc_HocPhan của các phân công gộp vào (đúng dữ liệu
 * đơn vị đã nộp, Admin không phải gõ tay — xem veDsGiangVienHangLoat trong hop-dong.html).
 * payload: { ID_NamHoc, danhSachGiangVien: [ID_GiangVien,...], Tu_Ngay, Den_Ngay }
 * (Tu_Ngay/Den_Ngay áp dụng chung cho cả đợt lập — có thể để trống, bổ sung sau bằng Phụ lục
 * hoặc sửa tay từng hợp đồng nếu cần khác nhau theo giảng viên.)
 */
/**
 * CHÚ Ý HIỆU NĂNG (10/2026): hàm này KHÔNG gọi lại _taoMotHopDong_ theo từng giảng viên như
 * bản cũ nữa. Lý do: _taoMotHopDong_ đọc lại TOÀN BỘ nhiều sheet (GIANG_VIEN, HOP_DONG,
 * PHAN_CONG_THINH_GIANG, CHI_TIET_GIO_GIANG...) + tự sinh mã số bằng cách quét lại HOP_DONG/
 * QUYET_DINH_HOP_DONG MỖI LẦN gọi, và ghi từng dòng bằng appendRow_ (1 lệnh Sheets API/dòng).
 * Với vài trăm/nghìn giảng viên chọn cùng lúc ("lập hợp đồng hàng loạt"), việc này cộng dồn
 * thành hàng phút chạy — vượt quá thời gian Cloudflare Worker proxy chờ phản hồi, trả về lỗi
 * "error code: 524" ở trình duyệt dù Apps Script vẫn còn đang chạy tiếp ở phía sau.
 * Hàm bên dưới đọc MỖI sheet liên quan đúng 1 LẦN, xử lý hoàn toàn trong bộ nhớ, rồi ghi tất
 * cả dòng mới bằng appendRows_ (1 lệnh ghi/sheet) — nhanh hơn nhiều lần, nhưng PHẢI giữ ĐÚNG
 * các điều kiện kiểm tra như _taoMotHopDong_ (đã có hợp đồng chưa, đã nộp giờ chưa...) để
 * không đổi hành vi. _taoMotHopDong_/api_taoHopDong (Bước 5b lập từng người) giữ NGUYÊN,
 * không đổi — chỉ đường lập hàng loạt này được viết lại.
 */
function api_taoHopDongHangLoat(payload) {
  var session = yeuCauAdmin_(payload.token);
  var idNamHoc = payload.ID_NamHoc;
  var dsIdGiangVien = payload.danhSachGiangVien || [];
  if (!idNamHoc) return errorResponse_('Thiếu trường: ID_NamHoc', 'INVALID_INPUT');
  if (!dsIdGiangVien.length) return errorResponse_('Chưa chọn giảng viên nào để lập hợp đồng', 'INVALID_INPUT');

  var namHoc = sheetToObjects_(SHEETS.NAM_HOC).filter(function (nh) { return nh.ID_NamHoc === idNamHoc; })[0];
  if (!namHoc) return errorResponse_('Không tìm thấy năm học', 'NOT_FOUND');

  var giangVienMap = {};
  sheetToObjects_(SHEETS.GIANG_VIEN).forEach(function (gv) { giangVienMap[gv.ID_GiangVien] = gv; });

  var tatCaPhanCong = sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG).filter(function (pc) {
    return pc.ID_NamHoc === idNamHoc;
  });
  var phanCongTheoGiangVien = {};
  tatCaPhanCong.forEach(function (pc) {
    (phanCongTheoGiangVien[pc.ID_GiangVien] = phanCongTheoGiangVien[pc.ID_GiangVien] || []).push(pc);
  });

  // Gom CHI_TIET_GIO_GIANG (nguồn PhanCong) theo ID_ThamChieu — đọc 1 lần thay vì mỗi dòng
  // phân công lại quét lại cả sheet (layChiTietTheoThamChieu_ gọi riêng rất tốn khi lặp nhiều).
  var chiTietTheoPhanCong = {};
  sheetToObjects_(SHEETS.CHI_TIET_GIO_GIANG).forEach(function (ct) {
    if (ct.Nguon !== 'PhanCong') return;
    (chiTietTheoPhanCong[ct.ID_ThamChieu] = chiTietTheoPhanCong[ct.ID_ThamChieu] || []).push(ct);
  });

  var danhSachHopDong = sheetToObjects_(SHEETS.HOP_DONG);
  var idGiangVienDaCoHopDong = {};
  danhSachHopDong.forEach(function (hd) {
    if (hd.Trang_Thai !== 'Huy') idGiangVienDaCoHopDong[hd.ID_NamHoc + '|' + hd.ID_GiangVien] = hd;
  });
  var demHopDongNamHocNay = danhSachHopDong.filter(function (hd) { return hd.ID_NamHoc === idNamHoc; }).length;
  var demQuyetDinh = sheetToObjects_(SHEETS.QUYET_DINH_HOP_DONG).length;

  var thanhCong = [];
  var loi = [];
  var moiHopDong = [];
  var moiQuyetDinh = [];
  var moiChiTiet = [];
  var moiNhatKy = [];
  var daChonTrongLuotNay = {}; // phòng trường hợp payload gửi trùng 1 giảng viên nhiều lần

  dsIdGiangVien.forEach(function (idGiangVien) {
    if (daChonTrongLuotNay[idGiangVien]) return;
    daChonTrongLuotNay[idGiangVien] = true;

    var giangVien = giangVienMap[idGiangVien];
    if (!giangVien) {
      loi.push({ idGiangVien: idGiangVien, loi: 'Không tìm thấy giảng viên', ma: 'NOT_FOUND' });
      return;
    }
    if (idGiangVienDaCoHopDong[idNamHoc + '|' + idGiangVien]) {
      var hdCu = idGiangVienDaCoHopDong[idNamHoc + '|' + idGiangVien];
      loi.push({ idGiangVien: idGiangVien, loi: 'Giảng viên ' + giangVien.Ho_Ten + ' đã có hợp đồng ' + hdCu.Ma_So_HopDong + ' cho năm học này', ma: 'DA_CO_HOP_DONG' });
      return;
    }

    var phanCongCuaGV = phanCongTheoGiangVien[idGiangVien] || [];
    var phanCongCoGio = phanCongCuaGV.filter(function (pc) {
      return (chiTietTheoPhanCong[pc.ID_PhanCong] || []).some(function (ct) { return soGioAnToan_(ct.So_Gio) > 0; });
    });
    if (!phanCongCoGio.length) {
      loi.push({ idGiangVien: idGiangVien, loi: 'Chưa có đơn vị nào nộp giờ cho giảng viên này trong năm học đã chọn', ma: 'MISSING_GIO_DU_KIEN' });
      return;
    }

    var gomTheoCapBac = {};
    phanCongCoGio.forEach(function (pc) {
      (chiTietTheoPhanCong[pc.ID_PhanCong] || []).forEach(function (ct) {
        gomTheoCapBac[ct.Cap_Bac] = (gomTheoCapBac[ct.Cap_Bac] || 0) + soGioAnToan_(ct.So_Gio);
      });
    });
    var noiDungGiangDay = uniq_(phanCongCoGio.map(function (pc) { return pc.Mon_Hoc_HocPhan; }).filter(Boolean)).join('; ');
    var dsIdDonVi = uniq_(phanCongCoGio.map(function (pc) { return pc.ID_DonVi; }));

    demHopDongNamHocNay += 1;
    demQuyetDinh += 1;
    var idHopDong = newId_('HD');
    var maSoHopDong = ('000' + demHopDongNamHocNay).slice(-3) + '/' + namHoc.Ten_NamHoc + '/ĐHYD-HĐTG';
    var idQuyetDinh = newId_('QD');
    var maSoQuyetDinh = ('000' + demQuyetDinh).slice(-3) + '/' + namHoc.Ten_NamHoc + '/QĐ-ĐHYD';

    var hopDong = {
      ID_HopDong: idHopDong, Ma_So_HopDong: maSoHopDong, ID_NamHoc: idNamHoc,
      ID_DonVi: dsIdDonVi.join(','), ID_GiangVien: idGiangVien, So_CCCD: giangVien.So_CCCD,
      ID_PhanCong: phanCongCoGio.map(function (pc) { return pc.ID_PhanCong; }).join(','),
      ID_QuyetDinh: idQuyetDinh, Noi_Dung_Giang_Day: noiDungGiangDay,
      Tu_Ngay: payload.Tu_Ngay || '', Den_Ngay: payload.Den_Ngay || '',
      Trang_Thai: 'Du_Thao', Ly_Do_Huy: '',
      Nguoi_Tao: session.tenDangNhap, Ngay_Tao: todayStr_(), Ngay_Ky: '',
    };
    var quyetDinh = {
      ID_QuyetDinh: idQuyetDinh, Ma_So_QuyetDinh: maSoQuyetDinh, ID_HopDong: idHopDong,
      Trich_Yeu: 'Về việc hợp đồng thỉnh giảng đối với ' + giangVien.Ho_Ten,
      Ngay_Ky: '', Nguoi_Ky: '', File_DinhKem_Url: '',
    };
    moiHopDong.push(hopDong);
    moiQuyetDinh.push(quyetDinh);
    Object.keys(gomTheoCapBac).forEach(function (capBac) {
      moiChiTiet.push({
        ID_ChiTiet: newId_('CT'), Nguon: 'HopDong', ID_ThamChieu: idHopDong,
        ID_NoiDung: '', Cap_Bac: capBac, So_Gio: gomTheoCapBac[capBac], So_Gio_Chuan: gomTheoCapBac[capBac],
      });
    });
    moiNhatKy.push({
      ID_NhatKy: newId_('LOG'), Doi_Tuong: 'HOP_DONG', ID_DoiTuong: idHopDong, Hanh_Dong: 'Tao_Moi',
      Noi_Dung_Truoc: '', Noi_Dung_Sau: JSON.stringify(hopDong), Nguoi_Thuc_Hien: session.tenDangNhap, Thoi_Gian: nowStr_(),
    });
    moiNhatKy.push({
      ID_NhatKy: newId_('LOG'), Doi_Tuong: 'QUYET_DINH_HOP_DONG', ID_DoiTuong: idQuyetDinh, Hanh_Dong: 'Tao_Moi',
      Noi_Dung_Truoc: '', Noi_Dung_Sau: JSON.stringify(quyetDinh), Nguoi_Thuc_Hien: session.tenDangNhap, Thoi_Gian: nowStr_(),
    });

    // Đánh dấu ngay trong bộ nhớ để nếu (trường hợp dữ liệu lỗi) payload có 2 dòng cùng
    // 1 giảng viên vẫn không tạo trùng 2 hợp đồng trong cùng 1 lượt chạy.
    idGiangVienDaCoHopDong[idNamHoc + '|' + idGiangVien] = hopDong;
    thanhCong.push({ idGiangVien: idGiangVien, hopDong: hopDong, quyetDinh: quyetDinh });
  });

  if (moiHopDong.length) {
    withLock_(function () {
      // Kiểm tra lại lần cuối TRONG khoá — phòng trường hợp 1 phiên Admin khác vừa lập hợp
      // đồng cho cùng giảng viên/năm học này trong lúc hàm này đang xử lý ở trên (trước khi
      // giữ được khoá). Chỉ đọc lại HOP_DONG đúng 1 lần (không lặp theo từng dòng) nên vẫn nhanh.
      var hopDongMoiNhat = {};
      sheetToObjects_(SHEETS.HOP_DONG).forEach(function (hd) {
        if (hd.Trang_Thai !== 'Huy') hopDongMoiNhat[hd.ID_NamHoc + '|' + hd.ID_GiangVien] = hd;
      });
      var ghiHopDong = [];
      var idHopDongGhiDuoc = {};
      var idQuyetDinhGhiDuoc = {};
      moiHopDong.forEach(function (hd) {
        var key = hd.ID_NamHoc + '|' + hd.ID_GiangVien;
        var vaChay = hopDongMoiNhat[key] && hopDongMoiNhat[key].ID_HopDong !== hd.ID_HopDong;
        if (vaChay) {
          // Đổi kết quả tương ứng trong thanhCong -> loi.
          var tc = thanhCong.filter(function (t) { return t.hopDong.ID_HopDong === hd.ID_HopDong; })[0];
          if (tc) {
            thanhCong.splice(thanhCong.indexOf(tc), 1);
            loi.push({ idGiangVien: hd.ID_GiangVien, loi: 'Giảng viên vừa được lập hợp đồng ' + hopDongMoiNhat[key].Ma_So_HopDong + ' ở phiên khác trong lúc xử lý', ma: 'DA_CO_HOP_DONG' });
          }
          return;
        }
        ghiHopDong.push(hd);
        idHopDongGhiDuoc[hd.ID_HopDong] = true;
        idQuyetDinhGhiDuoc[hd.ID_QuyetDinh] = true;
      });
      var ghiQuyetDinh = moiQuyetDinh.filter(function (qd) { return idQuyetDinhGhiDuoc[qd.ID_QuyetDinh]; });
      var ghiChiTiet = moiChiTiet.filter(function (ct) { return idHopDongGhiDuoc[ct.ID_ThamChieu]; });
      var ghiNhatKyBatch = moiNhatKy.filter(function (lg) {
        return (lg.Doi_Tuong === 'HOP_DONG' && idHopDongGhiDuoc[lg.ID_DoiTuong]) ||
          (lg.Doi_Tuong === 'QUYET_DINH_HOP_DONG' && idQuyetDinhGhiDuoc[lg.ID_DoiTuong]);
      });

      appendRows_(SHEETS.HOP_DONG, ghiHopDong);
      appendRows_(SHEETS.QUYET_DINH_HOP_DONG, ghiQuyetDinh);
      appendRows_(SHEETS.CHI_TIET_GIO_GIANG, ghiChiTiet);
      appendRows_(SHEETS.NHAT_KY_THAO_TAC, ghiNhatKyBatch);
    });
  }

  return okResponse_({ thanhCong: thanhCong, loi: loi });
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
