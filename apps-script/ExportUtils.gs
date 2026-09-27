/**
 * ExportUtils.gs — khung xuất file. Đây là phần CẦN HOÀN THIỆN THÊM khi có:
 *  1) ID của Google Doc mẫu hợp đồng (chuyển từ file .docx BM-HĐTG-45 người dùng đã cung cấp
 *     sang Google Docs, đặt các placeholder dạng {{TenTruong}} tương ứng cột dữ liệu).
 *  2) ID Google Doc mẫu Quyết định, mẫu Biên bản thanh lý, mẫu Giấy xác nhận giờ giảng.
 *
 * Cơ chế chung: copy file mẫu -> DocumentApp mở bản copy -> replaceText các placeholder
 * bằng dữ liệu thật -> xuất PDF bằng DriveApp -> trả về URL file PDF.
 */

var TEMPLATE_DOC_IDS = {
  HOP_DONG: 'PUT_GOOGLE_DOC_TEMPLATE_ID_HOP_DONG',
  QUYET_DINH: 'PUT_GOOGLE_DOC_TEMPLATE_ID_QUYET_DINH',
  GIAY_XAC_NHAN: 'PUT_GOOGLE_DOC_TEMPLATE_ID_GCN',
  BIEN_BAN_THANH_LY: 'PUT_GOOGLE_DOC_TEMPLATE_ID_THANH_LY',
};

var EXPORT_FOLDER_ID = 'PUT_GOOGLE_DRIVE_FOLDER_ID_DE_LUU_FILE_XUAT_RA';

/**
 * Hàm dùng chung: copy template, thay placeholder, xuất PDF.
 * placeholders: { '{{HoTen}}': 'Nguyễn Văn A', ... }
 */
function xuatPdfTuTemplate_(templateId, placeholders, tenFileMoi) {
  var templateFile = DriveApp.getFileById(templateId);
  var folder = DriveApp.getFolderById(EXPORT_FOLDER_ID);
  var copy = templateFile.makeCopy(tenFileMoi, folder);
  var doc = DocumentApp.openById(copy.getId());
  var body = doc.getBody();

  Object.keys(placeholders).forEach(function (key) {
    body.replaceText(key.replace(/[{}]/g, '\\$&'), String(placeholders[key] || ''));
  });
  doc.saveAndClose();

  var pdf = DriveApp.getFileById(copy.getId()).getAs('application/pdf');
  var pdfFile = folder.createFile(pdf).setName(tenFileMoi + '.pdf');
  return pdfFile.getUrl();
}

/** Bước 5: xuất file hợp đồng đã điền sẵn thông tin giảng viên (mail-merge tự động). */
function api_xuatFileHopDong(payload) {
  yeuCauAdmin_(payload.token);
  var hopDong = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) { return hd.ID_HopDong === payload.idHopDong; })[0];
  if (!hopDong) return errorResponse_('Không tìm thấy hợp đồng', 'NOT_FOUND');
  var gv = sheetToObjects_(SHEETS.GIANG_VIEN).filter(function (g) { return g.ID_GiangVien === hopDong.ID_GiangVien; })[0];

  // TODO: bổ sung đầy đủ placeholder khớp mẫu BM-HĐTG-45 thật (xem file gốc người dùng cung cấp).
  var placeholders = {
    '{{HoTen}}': gv.Ho_Ten,
    '{{NgaySinh}}': gv.Ngay_Sinh,
    '{{SoCCCD}}': gv.So_CCCD,
    '{{DiaChi}}': gv.Dia_Chi,
    '{{SoTaiKhoan}}': gv.So_Tai_Khoan,
    '{{NganHang}}': gv.Ngan_Hang,
    '{{ChiNhanh}}': gv.Chi_Nhanh,
    '{{MaSoThue}}': gv.Ma_So_Thue,
    '{{MaSoHopDong}}': hopDong.Ma_So_HopDong,
    '{{NoiDungGiangDay}}': hopDong.Noi_Dung_Giang_Day,
  };

  var url = xuatPdfTuTemplate_(TEMPLATE_DOC_IDS.HOP_DONG, placeholders, 'HopDong_' + hopDong.Ma_So_HopDong.replace(/\//g, '-'));
  return okResponse_({ url: url });
}

// TODO: viết tương tự api_xuatFileQuyetDinh, api_xuatFileGiayXacNhan, api_xuatBienBanThanhLy
// (cấu trúc giống hệt api_xuatFileHopDong ở trên, khác template + danh sách placeholder).

/** Bước 4: xuất danh sách giảng viên của đơn vị ra Google Sheet mới (đơn giản hơn PDF). */
function api_xuatDanhSachExcel(payload) {
  yeuCauDangNhap_(payload.token);
  var ds = api_layDanhSachDonVi(payload); // tái sử dụng logic đã có
  var data = JSON.parse(ds.getContent()).data;

  var ssMoi = SpreadsheetApp.create('DanhSachThinhGiang_' + todayStr_());
  var sh = ssMoi.getActiveSheet();
  var headers = ['Họ tên', 'CCCD', 'Học hàm/học vị', 'Môn học/học phần', 'Học kỳ', 'Số tiết/giờ', 'Trạng thái'];
  sh.appendRow(headers);
  data.forEach(function (r) {
    sh.appendRow([r.Ho_Ten_GiangVien, r.So_CCCD, r.Hoc_Ham_Hoc_Vi, r.Mon_Hoc_HocPhan, r.Hoc_Ky, r.So_Tiet_So_Gio, r.Trang_Thai]);
  });
  return okResponse_({ url: ssMoi.getUrl() });
}
