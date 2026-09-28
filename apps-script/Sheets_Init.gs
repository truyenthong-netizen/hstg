/**
 * Sheets_Init.gs — chạy HÀM initSheets() MỘT LẦN DUY NHẤT từ Apps Script editor
 * (chọn hàm initSheets -> bấm Run) ngay sau khi tạo Google Sheet trống và điền
 * SPREADSHEET_ID vào Config.gs. Hàm này tự tạo mọi tab + header + dữ liệu danh mục mặc định.
 * Chạy lại nhiều lần vẫn an toàn (sẽ không tạo trùng sheet đã có).
 */
function initSheets() {
  var db = getDb_();

  Object.keys(SHEETS).forEach(function (key) {
    var sheetName = SHEETS[key];
    var sh = db.getSheetByName(sheetName);
    if (!sh) {
      sh = db.insertSheet(sheetName);
    }
    var headers = SCHEMA[key];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  });

  // Xoá sheet mặc định "Sheet1" nếu còn tồn tại và trống.
  var macDinh = db.getSheetByName('Sheet1');
  if (macDinh && db.getSheets().length > 1) {
    db.deleteSheet(macDinh);
  }

  napDanhMucMacDinh_();
  Logger.log('Khởi tạo schema hoàn tất. Đã tạo %s sheet.', Object.keys(SHEETS).length);
}

function napDanhMucMacDinh_() {
  var shNoiDung = getSheet_(SHEETS.DM_NOI_DUNG_GIANG_DAY);
  if (shNoiDung.getLastRow() < 2) {
    NOI_DUNG_GIANG_DAY_MAC_DINH.forEach(function (nd, i) {
      appendRow_(SHEETS.DM_NOI_DUNG_GIANG_DAY, {
        ID_NoiDung: newId_('ND'),
        Ten_NoiDung: nd.ten,
        He_So_Quy_Doi_Mac_Dinh: nd.heSo,
        Thu_Tu_Hien_Thi: i + 1,
      });
    });
  }

  var shDinhMuc = getSheet_(SHEETS.DINH_MUC_DON_GIA);
  if (shDinhMuc.getLastRow() < 2) {
    DINH_MUC_MAC_DINH.forEach(function (dm) {
      appendRow_(SHEETS.DINH_MUC_DON_GIA, {
        ID_DinhMuc: newId_('DM'),
        Hoc_Ham_Hoc_Vi: dm.hocHamHocVi,
        Don_Gia_Gio_Chuan: dm.donGia,
        Ngay_Hieu_Luc_Tu: '2024-01-01',
        Ngay_Hieu_Luc_Den: '',
        Can_Cu_Quy_Che: 'Quy chế chi tiêu nội bộ, Mục 4 — Quy định chi trả thỉnh giảng',
      });
    });
  }
}

/**
 * Chạy 1 lần để tạo tài khoản Admin đầu tiên (vì chưa có ai đăng nhập để tự tạo tài khoản).
 * SỬA mật khẩu mặc định bên dưới trước khi chạy, và đổi lại ngay sau lần đăng nhập đầu tiên.
 */
function taoTaiKhoanAdminDauTien() {
  var matKhauMacDinh = 'CHANGE_ME_123'; // TODO: đổi trước khi chạy
  var daCo = sheetToObjects_(SHEETS.NGUOI_DUNG).some(function (u) { return u.Ten_Dang_Nhap === 'admin'; });
  if (daCo) {
    Logger.log('Tài khoản "admin" đã tồn tại — không tạo trùng. Muốn thêm Admin khác, dùng trang Người dùng sau khi đăng nhập.');
    return;
  }
  appendRow_(SHEETS.NGUOI_DUNG, {
    ID_NguoiDung: newId_('U'),
    Ten_Dang_Nhap: 'admin',
    Mat_Khau_Hash: hashPassword_(matKhauMacDinh),
    Ho_Ten: 'Quản trị hệ thống',
    Vai_Tro: 'Admin',
    ID_DonVi: '',
    Trang_Thai: 'Hoat_Dong',
    Ngay_Tao: todayStr_(),
  });
  Logger.log('Đã tạo tài khoản admin. Đăng nhập bằng admin / ' + matKhauMacDinh + ' rồi đổi mật khẩu ngay.');
}

/**
 * Chạy TAY 1 LẦN từ Apps Script editor nếu bảng NGUOI_DUNG đang có tài khoản bị trùng
 * Tên đăng nhập (ví dụ do taoTaiKhoanAdminDauTien từng bị chạy nhiều lần trước khi
 * hàm này được thêm chống trùng). Giữ lại dòng xuất hiện ĐẦU TIÊN của mỗi tên đăng nhập,
 * xoá các dòng trùng phía sau. An toàn khi chạy nhiều lần (không còn trùng thì không xoá gì).
 */
function gomTaiKhoanTrungTenDangNhap() {
  var all = sheetToObjects_(SHEETS.NGUOI_DUNG);
  var daGap = {};
  var dongCanXoa = [];
  all.forEach(function (u) {
    if (daGap[u.Ten_Dang_Nhap]) {
      dongCanXoa.push(u.__row);
    } else {
      daGap[u.Ten_Dang_Nhap] = true;
    }
  });
  // Xoá từ dòng dưới lên trên để số dòng các bản ghi còn lại không bị lệch.
  dongCanXoa.sort(function (a, b) { return b - a; });
  dongCanXoa.forEach(function (r) { deleteRow_(SHEETS.NGUOI_DUNG, r); });
  Logger.log('Đã xoá %s tài khoản bị trùng tên đăng nhập.', dongCanXoa.length);
}
