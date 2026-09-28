/**
 * PhuLuc.gs — Bước 7, Mục 9.10 tài liệu YCNV.
 * Chỉ dùng khi hợp đồng đã ở trạng thái Da_Ky (không sửa trực tiếp nội dung chính).
 * Nguyên tắc bắt buộc: chỉ APPEND, không ghi đè dữ liệu gốc của HOP_DONG.
 */

/**
 * payload.phuLuc: { ID_HopDong, Noi_Dung_Dieu_Chinh, GiaTri_Truoc, GiaTri_Sau, File_DinhKem_Url,
 *                    dieuChinhGio: { Cap_Bac, So_Gio_Tang } }  (tuỳ chọn, Cap_Bac: 'DaiHoc'|'SauDaiHoc'|'NCKH')
 *
 * Nếu phụ lục làm TĂNG số giờ chuẩn được phép cho 1 mục cụ thể (Đại học/Sau đại học/NCKH),
 * truyền kèm dieuChinhGio — hệ thống sẽ ghi thêm 1 dòng vào CHI_TIET_GIO_GIANG (Nguon='HopDong')
 * với đúng số giờ tăng thêm. Vì kiemTraDieuKienThanhLy_ (ThanhLy.gs) CỘNG DỒN tất cả các
 * dòng Nguon='HopDong' của cùng hợp đồng, giới hạn thanh lý sẽ tự động được nới ra đúng
 * theo phụ lục mà không cần sửa lại dữ liệu gốc — đúng nguyên tắc "chỉ thêm, không ghi đè"
 * đã nêu ở Mục 9.10 tài liệu YCNV.
 */
function api_taoPhuLuc(payload) {
  var session = yeuCauAdmin_(payload.token);
  var d = payload.phuLuc || {};
  if (!d.ID_HopDong || !d.Noi_Dung_Dieu_Chinh) return errorResponse_('Thiếu ID_HopDong hoặc nội dung điều chỉnh', 'INVALID_INPUT');

  var hopDong = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) { return hd.ID_HopDong === d.ID_HopDong; })[0];
  if (!hopDong) return errorResponse_('Không tìm thấy hợp đồng', 'NOT_FOUND');
  if (hopDong.Trang_Thai !== 'Da_Ky') {
    return errorResponse_('Chỉ lập phụ lục cho hợp đồng đã ở trạng thái Đã ký/Có hiệu lực', 'INVALID_STATE');
  }

  return withLock_(function () {
    var record = {
      ID_PhuLuc: newId_('PL'),
      ID_HopDong: d.ID_HopDong,
      Noi_Dung_Dieu_Chinh: d.Noi_Dung_Dieu_Chinh,
      GiaTri_Truoc: d.GiaTri_Truoc || '',
      GiaTri_Sau: d.GiaTri_Sau || '',
      File_DinhKem_Url: d.File_DinhKem_Url || '',
      Ngay_DieuChinh: todayStr_(),
      Nguoi_ThucHien: session.tenDangNhap,
    };
    appendRow_(SHEETS.PHU_LUC_HOP_DONG, record);

    if (d.dieuChinhGio && d.dieuChinhGio.So_Gio_Tang) {
      ghiChiTietGio_('HopDong', d.ID_HopDong, d.dieuChinhGio.Cap_Bac, d.dieuChinhGio.So_Gio_Tang);
    }

    ghiNhatKy_('PHU_LUC_HOP_DONG', record.ID_PhuLuc, 'Tao_Moi', null, record, session.tenDangNhap);
    return okResponse_(record);
  });
}

function api_layPhuLucTheoHopDong(payload) {
  yeuCauDangNhap_(payload.token);
  return okResponse_(
    sheetToObjects_(SHEETS.PHU_LUC_HOP_DONG).filter(function (pl) { return pl.ID_HopDong === payload.idHopDong; })
  );
}
