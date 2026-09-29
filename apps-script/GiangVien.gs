/**
 * GiangVien.gs — hồ sơ giảng viên dùng chung toàn hệ thống.
 * Theo Bước 1, 2a, 2b của quy trình (tài liệu YCNV) và Mục 9.1.
 * CCCD là khoá chống trùng chính — vì Sheets không có UNIQUE thật,
 * MỌI thao tác tạo mới đều phải kiểm tra trùng bên trong withLock_().
 */

/** Bước 1: tra cứu theo CCCD. Trả về hồ sơ nếu có, hoặc null. */
function api_traCuuGiangVienTheoCCCD(payload) {
  yeuCauDangNhap_(payload.token);
  var cccd = (payload.soCCCD || '').trim();
  if (!cccd) return errorResponse_('Thiếu số CCCD', 'MISSING_CCCD');

  var all = sheetToObjects_(SHEETS.GIANG_VIEN);
  var found = all.filter(function (gv) { return String(gv.So_CCCD).trim() === cccd; })[0];
  return okResponse_(found || null);
}

/** Bước 2b: tạo hồ sơ giảng viên mới, có kiểm tra trùng lần cuối trong khoá. */
function api_taoGiangVien(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var d = payload.giangVien || {};
  if (!d.So_CCCD || !d.Ho_Ten) return errorResponse_('Thiếu CCCD hoặc Họ tên', 'INVALID_INPUT');

  return withLock_(function () {
    var all = sheetToObjects_(SHEETS.GIANG_VIEN);
    var trung = all.filter(function (gv) { return String(gv.So_CCCD).trim() === String(d.So_CCCD).trim(); })[0];
    if (trung) {
      return errorResponse_('CCCD đã tồn tại trong hệ thống — không tạo hồ sơ mới, hãy chọn hồ sơ hiện có', 'DUPLICATE_CCCD');
    }

    var record = {
      ID_GiangVien: newId_('GV'),
      So_CCCD: d.So_CCCD,
      Ho_Ten: d.Ho_Ten,
      Ngay_Sinh: d.Ngay_Sinh || '',
      Gioi_Tinh: d.Gioi_Tinh || '',
      Hoc_Ham_Hoc_Vi: d.Hoc_Ham_Hoc_Vi || '',
      Chuyen_Nganh: d.Chuyen_Nganh || '',
      Don_Vi_Cong_Tac_Chinh: d.Don_Vi_Cong_Tac_Chinh || '',
      Dia_Chi: d.Dia_Chi || '',
      So_Dien_Thoai: d.So_Dien_Thoai || '',
      Email: d.Email || '',
      So_Tai_Khoan: d.So_Tai_Khoan || '',
      Ngan_Hang: d.Ngan_Hang || '',
      Chi_Nhanh: d.Chi_Nhanh || '',
      Ma_So_Thue: d.Ma_So_Thue || '',
      Trang_Thai_Ho_So: 'Dang_Hoat_Dong',
      Nguoi_Tao: session.tenDangNhap,
      Ngay_Tao: todayStr_(),
      // Dùng khi xuất hợp đồng (xem ExportUtils.gs) — không bắt buộc lúc tạo mới, có thể bổ
      // sung sau bằng api_suaGiangVien.
      Chuc_Vu_Chuc_Danh: d.Chuc_Vu_Chuc_Danh || '',
      Dien_Thoai_Co_Quan: d.Dien_Thoai_Co_Quan || '',
      Ngay_Cap_CCCD: d.Ngay_Cap_CCCD || '',
      Noi_Cap_CCCD: d.Noi_Cap_CCCD || '',
    };
    appendRow_(SHEETS.GIANG_VIEN, record);
    ghiNhatKy_('GIANG_VIEN', record.ID_GiangVien, 'Tao_Moi', null, record, session.tenDangNhap);
    return okResponse_(record);
  });
}

/**
 * Sửa hồ sơ giảng viên. Theo Mục 6 (ghi chú phân quyền): sửa các trường định danh
 * gốc (CCCD, họ tên, ngày sinh) nên kiểm soát chặt — TODO: thêm bước duyệt nếu cần,
 * hiện tại cho phép Admin sửa trực tiếp, Đơn vị chỉ sửa được ở giao diện nếu được cấp quyền.
 */
function api_suaGiangVien(payload) {
  var session = yeuCauAdmin_(payload.token); // TODO: nới quyền cho Đơn vị nếu Trường xác nhận cho phép
  var all = sheetToObjects_(SHEETS.GIANG_VIEN);
  var target = all.filter(function (gv) { return gv.ID_GiangVien === payload.idGiangVien; })[0];
  if (!target) return errorResponse_('Không tìm thấy giảng viên', 'NOT_FOUND');

  var before = Object.assign({}, target);
  delete before.__row;
  updateRow_(SHEETS.GIANG_VIEN, target.__row, payload.patch || {});
  ghiNhatKy_('GIANG_VIEN', target.ID_GiangVien, 'Chinh_Sua', before, payload.patch, session.tenDangNhap);
  return okResponse_({});
}

/**
 * Bổ sung/sửa 4 trường "phục vụ xuất hợp đồng" (Chức vụ/chức danh, Điện thoại cơ quan/đơn vị,
 * Ngày cấp CCCD, Nơi cấp CCCD) — dùng để điền vào mẫu BM-HĐTG-45 khi Admin xuất file (xem
 * ExportUtils.gs). Đây KHÔNG phải trường định danh gốc (CCCD/họ tên/ngày sinh) nên cho phép
 * bất kỳ ai đã đăng nhập (kể cả Đơn vị) tự bổ sung ngay lúc tra cứu/lập danh sách — không cần
 * quyền Admin như api_suaGiangVien (hàm đó sửa được cả CCCD/họ tên nên giữ nguyên chỉ Admin).
 * payload: { idGiangVien, Chuc_Vu_Chuc_Danh, Dien_Thoai_Co_Quan, Ngay_Cap_CCCD, Noi_Cap_CCCD }
 */
function api_boSungThongTinGiangVien(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var all = sheetToObjects_(SHEETS.GIANG_VIEN);
  var target = all.filter(function (gv) { return gv.ID_GiangVien === payload.idGiangVien; })[0];
  if (!target) return errorResponse_('Không tìm thấy giảng viên', 'NOT_FOUND');

  var CHO_PHEP = ['Chuc_Vu_Chuc_Danh', 'Dien_Thoai_Co_Quan', 'Ngay_Cap_CCCD', 'Noi_Cap_CCCD'];
  var patch = {};
  CHO_PHEP.forEach(function (k) {
    if (payload[k] !== undefined) patch[k] = payload[k];
  });

  var before = Object.assign({}, target);
  delete before.__row;
  return withLock_(function () {
    updateRow_(SHEETS.GIANG_VIEN, target.__row, patch);
    ghiNhatKy_('GIANG_VIEN', target.ID_GiangVien, 'Bo_Sung_Thong_Tin_Xuat_HopDong', before, patch, session.tenDangNhap);
    return okResponse_({});
  });
}

function api_layGiangVienTheoId(payload) {
  yeuCauDangNhap_(payload.token);
  var all = sheetToObjects_(SHEETS.GIANG_VIEN);
  var found = all.filter(function (gv) { return gv.ID_GiangVien === payload.idGiangVien; })[0];
  return okResponse_(found || null);
}
