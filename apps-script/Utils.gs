/**
 * Utils.gs — hàm tiện ích dùng chung cho toàn bộ backend.
 */

function getSheet_(name) {
  var sh = getDb_().getSheetByName(name);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + name);
  return sh;
}

/**
 * Ép 1 giá trị đọc từ cột "So_Gio"/"So_Gio_Chuan" (CHI_TIET_GIO_GIANG) về số giờ hợp lệ.
 * Dùng thay cho Number(v || 0) ở MỌI nơi cộng dồn giờ — lý do (phát hiện 10/2026): nếu ô đó
 * trên Google Sheet lỡ bị định dạng/dán nhầm thành kiểu Ngày tháng (Date), Apps Script đọc
 * ra một đối tượng Date thay vì số, và Number(dateObj) trong JS âm thầm trả về mốc thời gian
 * tính bằng mili-giây (một số rất lớn, ví dụ 1771866000000) — cộng dồn vào sẽ ra "giờ" vô lý
 * như "1771866000000 giờ" mà không có lỗi nào báo ra. Hàm này chặn kiểu Date, chặn NaN, và
 * chặn luôn số âm hoặc lớn bất thường (> 5000 giờ/dòng là chắc chắn sai, không giảng viên nào
 * dạy nổi số giờ đó) — coi các trường hợp này là 0 thay vì làm sai lệch tổng hiển thị cho Admin.
 */
function soGioAnToan_(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (Object.prototype.toString.call(v) === '[object Date]') return 0;
  var n = Number(v);
  if (!isFinite(n) || isNaN(n) || n < 0 || n > 5000) return 0;
  return n;
}

/** Đọc toàn bộ sheet thành mảng object, key = tên cột ở dòng header. */
function sheetToObjects_(sheetName) {
  var sh = getSheet_(sheetName);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    // Bỏ qua dòng trống hoàn toàn
    if (row.join('') === '') continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = row[c];
    obj.__row = r + 1; // số dòng thật trên sheet (1-based), phục vụ update/delete
    out.push(obj);
  }
  return out;
}

/**
 * Ép giá trị của các cột trong TEXT_FIELDS (CCCD, SĐT, số tài khoản, mã số thuế...)
 * luôn được Sheets lưu dưới dạng văn bản, không tự chuyển thành number (tránh mất số 0
 * đứng đầu). Cách làm: thêm dấu nháy đơn ở đầu chuỗi trước khi ghi — đây là cách Google
 * Sheets nhận biết "ép kiểu văn bản" dù ghi qua giao diện hay qua Apps Script.
 */
function ep_ChuoiSo_(colName, value) {
  if (TEXT_FIELDS.indexOf(colName) === -1) return value;
  if (value === '' || value === null || value === undefined) return value;
  var s = String(value);
  return s.charAt(0) === "'" ? s : "'" + s;
}

/** Ghi thêm 1 dòng vào sheet theo đúng thứ tự cột trong SCHEMA. */
function appendRow_(sheetName, obj) {
  var sh = getSheet_(sheetName);
  var cols = SCHEMA[sheetName];
  var row = cols.map(function (c) { return ep_ChuoiSo_(c, obj[c] !== undefined ? obj[c] : ''); });
  sh.appendRow(row);
  return obj;
}

/**
 * Ghi thêm NHIỀU dòng cùng lúc bằng 1 lệnh setValues() duy nhất (nhanh hơn rất nhiều so với
 * gọi appendRow_ lặp lại từng dòng — mỗi appendRow_ là 1 lệnh riêng, với vài trăm/nghìn dòng
 * (ví dụ lập hợp đồng hàng loạt) sẽ cộng dồn thành hàng phút, vượt timeout phía Cloudflare
 * Worker (lỗi "error code: 524") dù Apps Script vẫn đang chạy tiếp ở phía sau).
 * objs: mảng object cùng cấu trúc như appendRow_ nhận. Không làm gì nếu objs rỗng.
 */
function appendRows_(sheetName, objs) {
  if (!objs || !objs.length) return;
  var sh = getSheet_(sheetName);
  var cols = SCHEMA[sheetName];
  var rows = objs.map(function (obj) {
    return cols.map(function (c) { return ep_ChuoiSo_(c, obj[c] !== undefined ? obj[c] : ''); });
  });
  var hangBatDau = sh.getLastRow() + 1;
  sh.getRange(hangBatDau, 1, rows.length, cols.length).setValues(rows);
}

/** Cập nhật 1 dòng đã biết __row, chỉ ghi đè các field có trong patch. */
function updateRow_(sheetName, rowIndex, patch) {
  var sh = getSheet_(sheetName);
  var cols = SCHEMA[sheetName];
  var current = sh.getRange(rowIndex, 1, 1, cols.length).getValues()[0];
  var updated = cols.map(function (c, i) {
    var v = patch[c] !== undefined ? patch[c] : current[i];
    return ep_ChuoiSo_(c, v);
  });
  sh.getRange(rowIndex, 1, 1, cols.length).setValues([updated]);
  return updated;
}

/**
 * Xoá hẳn 1 dòng khỏi sheet theo __row (lấy từ sheetToObjects_).
 * CHỈ dùng cho các bảng cho phép xoá thật (tài khoản, đơn vị, năm học...).
 * KHÔNG dùng cho NHAT_KY_THAO_TAC hay PHU_LUC_HOP_DONG — 2 bảng này chỉ được phép ghi thêm
 * (nguyên tắc append-only, xem Mục 9.10 tài liệu YCNV).
 */
function deleteRow_(sheetName, rowIndex) {
  var sh = getSheet_(sheetName);
  sh.deleteRow(rowIndex);
}

/**
 * Từ bản 4/2026: 1 hợp đồng có thể gộp nhiều đơn vị (1 giảng viên = 1 hợp đồng/năm học,
 * không tách theo từng đơn vị nữa — xem HopDong.gs). Cột HOP_DONG.ID_DonVi và
 * HOP_DONG.ID_PhanCong vì vậy lưu DANH SÁCH id cách nhau bởi dấu phẩy thay vì 1 id đơn.
 * 3 hàm dưới đây dùng chung để đọc/ghi/so khớp danh sách đó.
 */
function dsIdTuChuoi_(csv) {
  return String(csv || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function ghepDsId_(mangId) {
  return uniq_(mangId).join(',');
}

function coId_(csv, id) {
  return dsIdTuChuoi_(csv).indexOf(id) !== -1;
}

function uniq_(mang) {
  var seen = {};
  var out = [];
  (mang || []).forEach(function (v) {
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  });
  return out;
}

/** Sinh ID nội bộ dạng chuỗi ngẫu nhiên ngắn (không phải mã hiển thị cho người dùng). */
function newId_(prefix) {
  return (prefix || 'ID') + '_' + Utilities.getUuid().split('-')[0];
}

/**
 * Thực thi fn() trong khóa LockService để tránh 2 người dùng cùng lúc
 * tạo trùng mã (CCCD, số hợp đồng, số quyết định, số biên bản...).
 * BẮT BUỘC dùng khi: tạo mới giảng viên, sinh số hợp đồng, sinh số quyết định,
 * sinh số biên bản thanh lý.
 */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // chờ tối đa 30s
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function okResponse_(data) {
  return jsonResponse_({ ok: true, data: data });
}

function errorResponse_(message, code) {
  return jsonResponse_({ ok: false, error: message, code: code || 'ERROR' });
}

function hashPassword_(plain) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plain);
  return digest.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function todayStr_() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

function nowStr_() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ss");
}
