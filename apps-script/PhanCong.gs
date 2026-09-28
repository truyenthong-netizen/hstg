/**
 * PhanCong.gs — Bước 3: lập danh sách giảng viên thỉnh giảng của đơn vị theo năm học.
 * Theo Mục 9.3 tài liệu YCNV.
 */

function api_themVaoDanhSach(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var d = payload.phanCong || {};
  var required = ['ID_GiangVien', 'ID_DonVi', 'ID_NamHoc', 'Mon_Hoc_HocPhan'];
  for (var i = 0; i < required.length; i++) {
    if (!d[required[i]]) return errorResponse_('Thiếu trường: ' + required[i], 'INVALID_INPUT');
  }

  // Người phụ trách đơn vị chỉ được lập danh sách cho đúng đơn vị của mình.
  if (session.vaiTro === 'DonVi' && d.ID_DonVi !== session.idDonVi) {
    return errorResponse_('Không có quyền lập danh sách cho đơn vị khác', 'FORBIDDEN');
  }

  var record = {
    ID_PhanCong: newId_('PC'),
    ID_GiangVien: d.ID_GiangVien,
    ID_DonVi: d.ID_DonVi,
    ID_NamHoc: d.ID_NamHoc,
    Mon_Hoc_HocPhan: d.Mon_Hoc_HocPhan,
    Hoc_Ky: d.Hoc_Ky || '',
    Loai_Hinh_HD: d.Loai_Hinh_HD || '',
    So_Tiet_So_Gio: d.So_Tiet_So_Gio || 0,
    Thoi_Gian_Thuc_Hien: d.Thoi_Gian_Thuc_Hien || '',
    Trang_Thai: 'Du_Kien',
    Nguoi_Lap: session.tenDangNhap,
    Ngay_Lap: todayStr_(),
  };
  appendRow_(SHEETS.PHAN_CONG_THINH_GIANG, record);
  ghiNhatKy_('PHAN_CONG_THINH_GIANG', record.ID_PhanCong, 'Tao_Moi', null, record, session.tenDangNhap);
  return okResponse_(record);
}

/** Bước 4 (dữ liệu nguồn để xuất danh sách): lấy danh sách của 1 đơn vị + năm học, kèm tên giảng viên. */
function api_layDanhSachDonVi(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var idDonVi = payload.idDonVi || session.idDonVi;
  if (session.vaiTro === 'DonVi' && idDonVi !== session.idDonVi) {
    return errorResponse_('Không có quyền xem danh sách đơn vị khác', 'FORBIDDEN');
  }

  var phanCongs = sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG).filter(function (pc) {
    return pc.ID_DonVi === idDonVi && (!payload.idNamHoc || pc.ID_NamHoc === payload.idNamHoc);
  });
  var giangViens = sheetToObjects_(SHEETS.GIANG_VIEN);
  var gvMap = {};
  giangViens.forEach(function (gv) { gvMap[gv.ID_GiangVien] = gv; });

  var result = phanCongs.map(function (pc) {
    var gv = gvMap[pc.ID_GiangVien] || {};
    return Object.assign({}, pc, {
      Ho_Ten_GiangVien: gv.Ho_Ten,
      So_CCCD: gv.So_CCCD,
      Hoc_Ham_Hoc_Vi: gv.Hoc_Ham_Hoc_Vi,
      // Giờ chuẩn quy đổi dự kiến (Đại học / Sau đại học / Nghiên cứu khoa học) — nguồn DUY NHẤT
      // là đơn vị tự nhập ngay trên danh sách này (xem api_capNhatGioDuKien bên dưới).
      // Admin KHÔNG tự nhập số này khi lập hợp đồng (xem HopDong.gs).
      ChiTietGio: layChiTietTheoThamChieu_('PhanCong', pc.ID_PhanCong).map(function (ct) {
        return { Cap_Bac: ct.Cap_Bac, So_Gio: ct.So_Gio };
      }),
    });
  });
  return okResponse_(result);
}

/**
 * Đơn vị nhập/sửa giờ chuẩn quy đổi dự kiến cho 1 dòng danh sách — đúng theo mẫu
 * "Tổng số giờ chuẩn quy đổi, trong đó: Đại học / Sau đại học / Nghiên cứu khoa học".
 * Đây là NGUỒN DUY NHẤT của "giờ dự kiến" dùng khi Admin lập hợp đồng — Admin không tự
 * gõ số này (xem api_taoHopDong trong HopDong.gs). Gọi lại nhiều lần cho cùng 1 dòng vẫn an
 * toàn — ghi đè giá trị cũ (xoá 3 dòng chi tiết cũ, ghi lại từ đầu).
 * payload: { idPhanCong, gioChuanDaiHoc, gioChuanSauDaiHoc, gioChuanNCKH }
 */
function api_capNhatGioDuKien(payload) {
  var session = yeuCauDangNhap_(payload.token);
  var pc = sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG).filter(function (r) { return r.ID_PhanCong === payload.idPhanCong; })[0];
  if (!pc) return errorResponse_('Không tìm thấy dòng danh sách', 'NOT_FOUND');
  if (session.vaiTro === 'DonVi' && pc.ID_DonVi !== session.idDonVi) {
    return errorResponse_('Không có quyền sửa giờ của đơn vị khác', 'FORBIDDEN');
  }

  return withLock_(function () {
    var cuLai = sheetToObjects_(SHEETS.CHI_TIET_GIO_GIANG).filter(function (ct) {
      return ct.Nguon === 'PhanCong' && ct.ID_ThamChieu === payload.idPhanCong;
    });
    cuLai.sort(function (a, b) { return b.__row - a.__row; }); // xoá từ dưới lên để không lệch số dòng
    cuLai.forEach(function (ct) { deleteRow_(SHEETS.CHI_TIET_GIO_GIANG, ct.__row); });

    [
      { capBac: 'DaiHoc', soGio: payload.gioChuanDaiHoc },
      { capBac: 'SauDaiHoc', soGio: payload.gioChuanSauDaiHoc },
      { capBac: 'NCKH', soGio: payload.gioChuanNCKH },
    ].forEach(function (m) {
      if (Number(m.soGio) > 0) ghiChiTietGio_('PhanCong', payload.idPhanCong, m.capBac, m.soGio);
    });

    ghiNhatKy_('PHAN_CONG_THINH_GIANG', payload.idPhanCong, 'Cap_Nhat_Gio_Du_Kien', null, {
      gioChuanDaiHoc: payload.gioChuanDaiHoc, gioChuanSauDaiHoc: payload.gioChuanSauDaiHoc, gioChuanNCKH: payload.gioChuanNCKH,
    }, session.tenDangNhap);
    return okResponse_({});
  });
}

/**
 * Admin: tìm dòng danh sách (đơn vị đã lập) khớp đúng giảng viên + đơn vị + năm học,
 * kèm giờ dự kiến đơn vị đã nhập qua Excel — dùng để lập hợp đồng ở Bước 5.
 * Trả về null nếu đơn vị chưa lập danh sách cho giảng viên này trong năm học đó.
 */
function api_timPhanCongTheoGiangVien(payload) {
  yeuCauAdmin_(payload.token);
  var pc = sheetToObjects_(SHEETS.PHAN_CONG_THINH_GIANG).filter(function (r) {
    return r.ID_GiangVien === payload.idGiangVien && r.ID_DonVi === payload.idDonVi && r.ID_NamHoc === payload.idNamHoc;
  })[0];
  if (!pc) return okResponse_(null);
  var chiTietGio = layChiTietTheoThamChieu_('PhanCong', pc.ID_PhanCong);
  return okResponse_({ phanCong: pc, chiTietGio: chiTietGio });
}

// TODO Bước 4 — Xuất trình ký PDF: xuất Word/PDF bằng Google Docs template (xem ExportUtils.gs)
// — cần đơn vị cung cấp file mẫu biểu thống nhất để đối chiếu vị trí các trường placeholder.
// (Xuất/nhập Excel giờ dự kiến đã có, xử lý ở phía trình duyệt bằng thư viện SheetJS — xem danh-sach-don-vi.html.)
