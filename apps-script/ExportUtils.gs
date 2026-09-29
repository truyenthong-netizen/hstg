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
  HOP_DONG: '14MEU6Tz6qxaWgQhLUoqJk-NosgXkCB4nq2eQjfC0JPA',
  QUYET_DINH: 'PUT_GOOGLE_DOC_TEMPLATE_ID_QUYET_DINH',
  GIAY_XAC_NHAN: 'PUT_GOOGLE_DOC_TEMPLATE_ID_GCN',
  BIEN_BAN_THANH_LY: 'PUT_GOOGLE_DOC_TEMPLATE_ID_THANH_LY',
};

var EXPORT_FOLDER_ID = '1-zWADRHRjiSJBb_NCZDRqzppLPl_uOvE';

// Người đại diện Bên A ký hợp đồng thỉnh giảng, theo Giấy ủy quyền/Quyết định hiện hành của
// Hiệu trưởng ĐHYD. Khi có Quyết định ủy quyền mới, chỉ cần sửa 4 dòng này rồi Deploy lại —
// không phải sửa từng hợp đồng.
var DAI_DIEN_BEN_A = {
  hoTen: 'PGS.TS. Nguyễn Văn Chinh',
  chucVu: 'Phó Hiệu trưởng',
  soGiayUyQuyen: '3558/QĐ-ĐHYD',
  ngayGiayUyQuyen: '13/7/2026',
};

/** Đổi 'yyyy-mm-dd' (input type=date của trình duyệt) sang 'dd/mm/yyyy' để hiển thị đúng văn phong hợp đồng. */
function formatNgayVN_(yyyyMmDd) {
  if (!yyyyMmDd) return '';
  var p = String(yyyyMmDd).split('-');
  if (p.length !== 3) return String(yyyyMmDd);
  return p[2] + '/' + p[1] + '/' + p[0];
}

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

/**
 * Bước 5: xuất file hợp đồng theo đúng mẫu BM-HĐTG-45 (mail-merge tự động toàn bộ các
 * trường hệ thống đã có sẵn). Các trường KHÔNG có trong dữ liệu hệ thống (đại diện Bên A,
 * số/ngày giấy ủy quyền, nơi sinh, nơi cấp CCCD, điện thoại cơ quan...) để trống trong file
 * xuất ra — vẫn đúng như quy trình cũ, Phòng TCCB điền tay các mục này khi trình ký.
 */
function api_xuatFileHopDong(payload) {
  yeuCauAdmin_(payload.token);
  var hopDong = sheetToObjects_(SHEETS.HOP_DONG).filter(function (hd) { return hd.ID_HopDong === payload.idHopDong; })[0];
  if (!hopDong) return errorResponse_('Không tìm thấy hợp đồng', 'NOT_FOUND');
  var gv = sheetToObjects_(SHEETS.GIANG_VIEN).filter(function (g) { return g.ID_GiangVien === hopDong.ID_GiangVien; })[0];
  if (!gv) return errorResponse_('Không tìm thấy hồ sơ giảng viên', 'NOT_FOUND');
  var namHoc = sheetToObjects_(SHEETS.NAM_HOC).filter(function (nh) { return nh.ID_NamHoc === hopDong.ID_NamHoc; })[0];

  var gioHopDong = {};
  layChiTietTheoThamChieu_('HopDong', hopDong.ID_HopDong).forEach(function (ct) {
    gioHopDong[ct.Cap_Bac] = (gioHopDong[ct.Cap_Bac] || 0) + Number(ct.So_Gio || 0);
  });
  var gDaiHoc = gioHopDong.DaiHoc || 0, gSauDaiHoc = gioHopDong.SauDaiHoc || 0, gNCKH = gioHopDong.NCKH || 0;
  var ngayLap = new Date();

  var placeholders = {
    '{{HocHamHocVi}}': gv.Hoc_Ham_Hoc_Vi,
    '{{HoTen}}': gv.Ho_Ten,
    '{{NgaySinh}}': formatNgayVN_(gv.Ngay_Sinh),
    '{{TrinhDo}}': gv.Hoc_Ham_Hoc_Vi,
    '{{ChuyenNganh}}': gv.Chuyen_Nganh,
    '{{DiaChi}}': gv.Dia_Chi,
    '{{SoDienThoai}}': gv.So_Dien_Thoai,
    '{{SoCCCD}}': gv.So_CCCD,
    '{{SoTaiKhoan}}': gv.So_Tai_Khoan,
    '{{NganHang}}': gv.Ngan_Hang,
    '{{ChiNhanh}}': gv.Chi_Nhanh,
    '{{MaSoThue}}': gv.Ma_So_Thue,
    '{{NoiSinh}}': '', '{{DienThoaiCoQuan}}': '', '{{NgayCapCCCD}}': '', '{{NoiCapCCCD}}': '',
    '{{NguoiDaiDienBenA}}': DAI_DIEN_BEN_A.hoTen,
    '{{ChucVuDaiDienBenA}}': DAI_DIEN_BEN_A.chucVu,
    '{{SoGiayUyQuyen}}': DAI_DIEN_BEN_A.soGiayUyQuyen,
    '{{NgayGiayUyQuyen}}': DAI_DIEN_BEN_A.ngayGiayUyQuyen,
    '{{MaSoHopDong}}': hopDong.Ma_So_HopDong,
    '{{TenNamHoc}}': namHoc ? namHoc.Ten_NamHoc : '',
    '{{NgayLap_Ngay}}': ngayLap.getDate(),
    '{{NgayLap_Thang}}': ngayLap.getMonth() + 1,
    '{{NgayLap_Nam}}': ngayLap.getFullYear(),
    '{{TuNgay}}': formatNgayVN_(hopDong.Tu_Ngay),
    '{{DenNgay}}': formatNgayVN_(hopDong.Den_Ngay),
    '{{TongSoGio}}': gDaiHoc + gSauDaiHoc + gNCKH,
    '{{SoGioDaiHoc}}': gDaiHoc,
    '{{SoGioSauDaiHoc}}': gSauDaiHoc,
    '{{SoGioNCKH}}': gNCKH,
    '{{NoiDungGiangDay}}': hopDong.Noi_Dung_Giang_Day,
  };

  var url = xuatPdfTuTemplate_(TEMPLATE_DOC_IDS.HOP_DONG, placeholders, 'HopDong_' + hopDong.Ma_So_HopDong.replace(/\//g, '-'));
  return okResponse_({ url: url });
}

// TODO: viết tương tự api_xuatFileQuyetDinh, api_xuatFileGiayXacNhan, api_xuatBienBanThanhLy
// (cấu trúc giống hệt api_xuatFileHopDong ở trên, khác template + danh sách placeholder) —
// cần thêm mẫu Quyết định/GCN/Thanh lý dạng .docx thật để làm tương tự.

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
