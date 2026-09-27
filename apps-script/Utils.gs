/**
 * Utils.gs — hàm tiện ích dùng chung cho toàn bộ backend.
 */

function getSheet_(name) {
  var sh = getDb_().getSheetByName(name);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + name);
  return sh;
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

/** Ghi thêm 1 dòng vào sheet theo đúng thứ tự cột trong SCHEMA. */
function appendRow_(sheetName, obj) {
  var sh = getSheet_(sheetName);
  var cols = SCHEMA[sheetName];
  var row = cols.map(function (c) { return obj[c] !== undefined ? obj[c] : ''; });
  sh.appendRow(row);
  return obj;
}

/** Cập nhật 1 dòng đã biết __row, chỉ ghi đè các field có trong patch. */
function updateRow_(sheetName, rowIndex, patch) {
  var sh = getSheet_(sheetName);
  var cols = SCHEMA[sheetName];
  var current = sh.getRange(rowIndex, 1, 1, cols.length).getValues()[0];
  var updated = cols.map(function (c, i) {
    return patch[c] !== undefined ? patch[c] : current[i];
  });
  sh.getRange(rowIndex, 1, 1, cols.length).setValues([updated]);
  return updated;
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
