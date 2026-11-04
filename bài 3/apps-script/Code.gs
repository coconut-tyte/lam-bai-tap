/**
 * Google Apps Script: nhận đăng ký, ghi vào Google Sheets, gửi email cảm ơn.
 * Gắn script này vào đúng file Google Sheets sẽ lưu dữ liệu (Tiện ích mở rộng > Apps Script).
 */
const SHEET_NAME = "DangKy";
const MAX_SEATS = 50;
const EVENT_NAME = "Vibe Code Workshop";
const HEADERS = ["Thời gian", "Họ tên", "Email", "Số điện thoại", "Trường/Đơn vị", "Ghi chú"];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function countRegistrations_(sheet) {
  return Math.max(0, sheet.getLastRow() - 1); // trừ dòng tiêu đề
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Chống chèn công thức (=, +, -, @) vào Google Sheets
function safe_(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// GET: trả về số người đã đăng ký để web hiển thị đếm ngược chỗ
function doGet() {
  const sheet = getSheet_();
  return json_({ ok: true, count: countRegistrations_(sheet), max: MAX_SEATS });
}

// POST: nhận dữ liệu đăng ký
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); // tránh 2 người gửi cùng lúc làm vượt 50 chỗ
  try {
    const data = JSON.parse(e.postData.contents);
    const fullName = safe_(data.fullName);
    const email = String(data.email || "").trim();
    const phone = String(data.phone || "").trim();
    const organization = safe_(data.organization);
    const note = safe_(data.note);

    // Kiểm tra lại phía server
    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
        !/^(0|\+84)\d{9}$/.test(phone) || organization === "") {
      return json_({ ok: false, code: "INVALID", message: "Dữ liệu không hợp lệ." });
    }

    const sheet = getSheet_();
    const count = countRegistrations_(sheet);
    if (count >= MAX_SEATS) return json_({ ok: false, code: "FULL", count: count });

    // Chặn đăng ký trùng email
    if (count > 0) {
      const emails = sheet.getRange(2, 3, count, 1).getValues().flat().map(v => String(v).toLowerCase());
      if (emails.indexOf(email.toLowerCase()) !== -1) return json_({ ok: false, code: "DUPLICATE" });
    }

    // Ghi đúng cột; cột SĐT để dạng văn bản để không mất số 0 đầu
    const row = count + 2;
    sheet.getRange(row, 4).setNumberFormat("@");
    sheet.getRange(row, 1, 1, 6).setValues([[new Date(), fullName, email, phone, organization, note]]);
    SpreadsheetApp.flush();

    sendThankYouEmail_(fullName, email); // lỗi gửi mail không làm mất đăng ký
    return json_({ ok: true, count: count + 1 });
  } catch (error) {
    return json_({ ok: false, code: "ERROR", message: "Lỗi máy chủ: " + error.message });
  } finally {
    lock.releaseLock();
  }
}

function sendThankYouEmail_(fullName, email) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: "Cảm ơn bạn đã đăng ký " + EVENT_NAME,
      htmlBody: "<p>Chào " + fullName + ",</p>" +
        "<p>Cảm ơn bạn đã đăng ký tham gia <b>" + EVENT_NAME + "</b>. Chúng tôi đã ghi nhận thông tin của bạn.</p>" +
        "<p>Hãy mang theo mã QR hiển thị sau khi đăng ký để check-in nhanh hơn.</p>" +
        "<p>Hẹn gặp bạn tại sự kiện!</p>"
    });
  } catch (error) {
    console.error("Không gửi được email: " + error.message);
  }
}
