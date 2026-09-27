/**
 * ThanhLy.gs — Bước 8, 9, 10, 11 tài liệu YCNV. Đây là phần kiểm soát chặt nhất hệ thống:
 * - Số giờ thực tế (GCN) theo từng (loại nội dung, cấp bậc) KHÔNG được vượt số giờ
 *   dự kiến trong hợp đồng gốc CỘNG với phần tăng thêm từ phụ lục (nếu có) — xem
 *   ghi chú trong PhuLuc.gs: phụ lục ghi thêm dòng CHI_TIET_GIO_GIANG (Nguon='HopDong'),
 *   nên hàm gomTheoLoaiVaCapBac_ dưới đây tự động cộng dồn đúng mà không cần xử lý riêng.
 * - Mỗi hợp đồng chỉ thanh lý đúng 1 lần (ràng buộc UNIQUE ID_HopDong ở THANH_LY_HOP_DONG,
 *   tự kiểm tra vì Sheets không có UNIQUE thật).
 * - Thù lao = Tổng giờ chuẩn thực tế × Định mức theo học hàm/học vị của giảng viên (Mục 9.9).
 */

function sinhMaSoBienBan_() {
  var all = sheetToObjects_(SHEETS.THANH_LY_HOP_DONG);
  var stt = ('000' + (all.length + 1)).slice(-3);
  return stt + '/ĐHYD-TLHĐ';
}

/** Gom chi tiết giờ theo khoá "idNoiDung|capBac" -> tổng So_Gio_Chuan. */
function gomTheoLoaiVaCapBac_(chiTietList) {
  var map = {};
  chiTietList.forEach(function (ct) {
    var key = ct.ID_NoiDung + '|' + ct.Cap_Bac;
    map[key] = (map[key] || 0) + Number(ct.So_Gio_Chuan || 0);
  });
  return map;
}

/**
 * Bước 10: kiểm tra từng (loại nội dung, cấp bậc): giờ GCN <= giờ hợp đồng.
 * Trả về { hopLe: boolean, chiTietVuot: [...] }
 */
function kiemTraDieuKienThanhLy_(idHopDong, idGCN) {
  var gioHopDong = gomTheoLoaiVaCapBac_(layChiTietTheoThamChieu_('HopDong', idHopDong));
  var gioGCN = gomTheoLoaiVaCapBac_(layChiTietTheoThamChieu_('GCN', idGCN));

  var chiTietVuot = [];
  Object.keys(gioGCN).forEach(function (key) {
    var gioiHan = gioHopDong[key] || 0;
    if (gioGCN[key] > gioiHan) {
      var parts = key.split('|');
      chiTietVuot.push({ idNoiDung: parts[0], capBac: parts[1], gioThucTe: gioGCN[key], gioHopDong: gioiHan });
    }
  });
  return { hopLe: chiTietVuot.length === 0, chiTietVuot: chiTietVuot };
}

/** Bước 9-11: thực hiện thanh lý. payload: { idHopDong, idGCN } */
function api_thanhLyHopDong(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var hopDong = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) { return hd.ID_HopDong === payload.idHopDong; })[0];
  if (!hopDong) return errorResponse_('Không tìm thấy hợp đồng', 'NOT_FOUND');
  if (session.vaiTro === 'DonVi' && hopDong.ID_DonVi !== session.idDonVi) {
    return errorResponse_('Không có quyền thanh lý hợp đồng đơn vị khác', 'FORBIDDEN');
  }
  if (hopDong.Trang_Thai !== 'Da_Ky') {
    return errorResponse_('Hợp đồng phải ở trạng thái Đã ký/Có hiệu lực mới được thanh lý', 'INVALID_STATE');
  }

  var gcn = sheetToObjects_(SHEETS.GIAY_XAC_NHAN_GIO_GIANG).filter(function (g) { return g.ID_GCN === payload.idGCN; })[0];
  if (!gcn) return errorResponse_('Không tìm thấy Giấy xác nhận giờ giảng', 'NOT_FOUND');

  return withLock_(function () {
    // Chặn thanh lý 2 lần cho cùng 1 hợp đồng (ràng buộc 1-1 mô phỏng UNIQUE).
    var daThanhLy = sheetToObjects_(SHEETS.THANH_LY_HOP_DONG).filter(function (tl) { return tl.ID_HopDong === payload.idHopDong; })[0];
    if (daThanhLy) return errorResponse_('Hợp đồng này đã được thanh lý trước đó', 'ALREADY_LIQUIDATED');

    var kiemTra = kiemTraDieuKienThanhLy_(payload.idHopDong, payload.idGCN);
    if (!kiemTra.hopLe) {
      var vuot = kiemTra.chiTietVuot[0];
      return errorResponse_(
        'Số giờ thực tế không được vượt quá số giờ theo hợp đồng (' + vuot.gioHopDong + ' giờ)',
        'VUOT_SO_GIO'
      );
    }

    var giangVien = sheetToObjects_(SHEETS.GIANG_VIEN).filter(function (gv) { return gv.ID_GiangVien === hopDong.ID_GiangVien; })[0];
    var dinhMuc = timDinhMucHieuLuc_(giangVien.Hoc_Ham_Hoc_Vi, hopDong.Ngay_Ky || todayStr_());
    if (!dinhMuc) {
      return errorResponse_('Chưa có định mức đơn giá cho học hàm/học vị: ' + giangVien.Hoc_Ham_Hoc_Vi, 'MISSING_DINH_MUC');
    }

    var tongGioChuanThucTe = tongGioChuan_('GCN', payload.idGCN);
    var thanhTien = tongGioChuanThucTe * Number(dinhMuc.Don_Gia_Gio_Chuan);

    var record = {
      ID_ThanhLy: newId_('TL'),
      Ma_So_BienBan: sinhMaSoBienBan_(),
      ID_HopDong: payload.idHopDong,
      ID_GCN: payload.idGCN,
      Tong_So_Gio_Chuan_ThucTe: tongGioChuanThucTe,
      ID_DinhMuc: dinhMuc.ID_DinhMuc,
      Thanh_Tien: thanhTien,
      Ngay_ThanhLy: todayStr_(),
      Nguoi_ThucHien: session.tenDangNhap,
    };
    appendRow_(SHEETS.THANH_LY_HOP_DONG, record);

    updateRow_(SHEETS.HOP_DONG, hopDong.__row, { Trang_Thai: 'Da_Thanh_Ly' });

    ghiNhatKy_('THANH_LY_HOP_DONG', record.ID_ThanhLy, 'Thanh_Ly', null, record, session.tenDangNhap);
    ghiNhatKy_('HOP_DONG', hopDong.ID_HopDong, 'Chuyen_Trang_Thai', { Trang_Thai: 'Da_Ky' }, { Trang_Thai: 'Da_Thanh_Ly' }, session.tenDangNhap);

    return okResponse_(record);
  });
}

function api_layThanhLyTheoHopDong(payload) {
  yeuCauDangNhap_(payload.token);
  var found = sheetToObjects_(SHEETS.THANH_LY_HOP_DONG).filter(function (tl) { return tl.ID_HopDong === payload.idHopDong; })[0];
  return okResponse_(found || null);
}

// TODO Bước 11 — xuất biên bản PDF/in 04 bản: xem ExportUtils.gs (cần Google Doc mẫu
// đã đặt placeholder tương ứng file "TLHĐ_đã_thêm_ngày_tháng_năm" người dùng cung cấp).
