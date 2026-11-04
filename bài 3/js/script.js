// =====================================================
// Đăng ký sự kiện -> Google Sheets (qua Google Apps Script)
// =====================================================
const CONFIG = {
  // Dán URL Web App của Apps Script vào đây (xem README.md).
  // Để trống = chế độ DEMO (giả lập, lưu số lượng trong LocalStorage).
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxnIIe3xFXy0XhmrOOTY_au1Flqp-mR44Gv3SNbCeFIthJovXWsL6ANyQzgsnxFUTdO/exec",
  MAX_SEATS: 50
};
const IS_DEMO = CONFIG.SCRIPT_URL === "";
const DEMO_KEY = "event_demo_count";

const $ = id => document.getElementById(id);
const form = $("regForm");
const submitBtn = $("submitBtn");
let isSubmitting = false;       // khóa chống gửi nhiều lần
let registeredCount = 0;

// ---------- Quy tắc kiểm tra dữ liệu (Validation) ----------
const validators = {
  fullName(value) {
    const v = value.trim();
    if (v === "") return "Vui lòng nhập họ và tên.";
    if (v.length < 2) return "Họ tên cần ít nhất 2 ký tự.";
    if (!/^[\p{L}\s.'-]+$/u.test(v)) return "Họ tên chỉ gồm chữ cái và khoảng trắng.";
    return "";
  },
  email(value) {
    const v = value.trim();
    if (v === "") return "Vui lòng nhập email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Email chưa đúng định dạng (ví dụ: ban@example.com).";
    return "";
  },
  phone(value) {
    const v = value.trim().replace(/[\s.-]/g, "");
    if (v === "") return "Vui lòng nhập số điện thoại.";
    if (!/^(0|\+84)\d{9}$/.test(v)) return "Số điện thoại gồm 10 số, bắt đầu bằng 0 (hoặc +84).";
    return "";
  },
  organization(value) {
    return value.trim() === "" ? "Vui lòng nhập trường hoặc đơn vị." : "";
  },
  note(value) {
    return value.length > 300 ? "Ghi chú tối đa 300 ký tự." : "";
  }
};

function validateField(name) {
  const input = form.elements[name];
  const message = validators[name](input.value);
  $(name + "Error").textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
  input.classList.toggle("valid", !message && input.value.trim() !== "");
  return message === "";
}
function validateAll() {
  let firstInvalid = null;
  Object.keys(validators).forEach(name => {
    if (!validateField(name) && !firstInvalid) firstInvalid = form.elements[name];
  });
  return firstInvalid;
}

// Real-time: báo lỗi khi rời ô (blur), rồi cập nhật liền khi đang gõ (input)
Object.keys(validators).forEach(name => {
  const input = form.elements[name];
  input.addEventListener("blur", () => validateField(name));
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true" || input.classList.contains("valid")) validateField(name);
  });
});

// ---------- Đếm ngược chỗ ngồi ----------
function renderSeats() {
  const left = Math.max(0, CONFIG.MAX_SEATS - registeredCount);
  const seats = $("seats");
  $("seatsLeft").textContent = left === 0 ? "Hết chỗ" : "Còn " + left + " chỗ";
  $("seatsDetail").textContent = "Đã có " + registeredCount + "/" + CONFIG.MAX_SEATS + " người đăng ký";
  $("meterFill").style.width = Math.min(100, (registeredCount / CONFIG.MAX_SEATS) * 100) + "%";
  $("meter").setAttribute("aria-valuenow", String(Math.min(registeredCount, CONFIG.MAX_SEATS)));
  seats.classList.toggle("low", left > 0 && left <= 10);
  seats.classList.toggle("full", left === 0);
  setFormClosed(left === 0);
}
function setFormClosed(closed) {
  document.querySelector(".card").classList.toggle("closed", closed);
  $("closedMsg").hidden = !closed;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchSeatCount() {
  if (IS_DEMO) return Number(localStorage.getItem(DEMO_KEY)) || 0;
  const response = await fetch(CONFIG.SCRIPT_URL);
  const data = await response.json();
  return Number(data.count) || 0;
}

// ---------- Gửi dữ liệu ----------
async function sendRegistration(payload) {
  if (IS_DEMO) {
    await sleep(1200); // giả lập thời gian mạng
    const count = (Number(localStorage.getItem(DEMO_KEY)) || 0) + 1;
    localStorage.setItem(DEMO_KEY, String(count));
    return { ok: true, count: count };
  }
  // text/plain để tránh preflight CORS với Apps Script
  const response = await fetch(CONFIG.SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

function setLoading(loading) {
  isSubmitting = loading;
  submitBtn.disabled = loading;
  submitBtn.classList.toggle("loading", loading);
  submitBtn.setAttribute("aria-busy", String(loading));
  $("submitLabel").textContent = loading ? "Đang gửi..." : "Đăng ký ngay";
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();                 // không cho trang load lại
  if (isSubmitting) return;               // đang gửi thì bỏ qua lần bấm thêm
  $("formStatus").textContent = "";

  const firstInvalid = validateAll();
  if (firstInvalid) { firstInvalid.focus(); return; }

  const payload = {
    fullName: form.elements.fullName.value.trim(),
    email: form.elements.email.value.trim(),
    phone: form.elements.phone.value.trim().replace(/[\s.-]/g, ""),
    organization: form.elements.organization.value.trim(),
    note: form.elements.note.value.trim()
  };

  setLoading(true);
  try {
    const result = await sendRegistration(payload);
    if (result.ok) {
      registeredCount = Number(result.count) || registeredCount + 1;
      renderSeats();
      showSuccess(payload.fullName);
      form.reset();
      form.querySelectorAll("input,textarea").forEach(el => { el.classList.remove("valid"); el.removeAttribute("aria-invalid"); });
    } else if (result.code === "FULL") {
      registeredCount = CONFIG.MAX_SEATS;
      renderSeats();
    } else if (result.code === "DUPLICATE") {
      $("emailError").textContent = "Email này đã đăng ký rồi.";
      form.elements.email.setAttribute("aria-invalid", "true");
      form.elements.email.focus();
    } else {
      $("formStatus").textContent = result.message || "Gửi không thành công, vui lòng thử lại.";
    }
  } catch (error) {
    $("formStatus").textContent = "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  } finally {
    setLoading(false);                    // luôn mở lại nút dù thành công hay lỗi
  }
});

// ---------- Modal thành công + QR ----------
const modal = $("successModal");
function showSuccess(fullName) {
  $("modalText").textContent = "Cảm ơn " + fullName + "! Chúng tôi đã ghi nhận đăng ký của bạn và gửi email xác nhận.";
  // QuickChart: mã QR chứa họ tên
  $("qrImage").src = "https://quickchart.io/qr?size=200&margin=1&text=" + encodeURIComponent(fullName);
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}
$("closeModalBtn").addEventListener("click", () => modal.close());
modal.addEventListener("click", e => { if (e.target === modal) modal.close(); }); // bấm nền để đóng

// ---------- Khởi động ----------
$("demoBadge").hidden = !IS_DEMO;
(async function init() {
  try {
    registeredCount = await fetchSeatCount();
  } catch (error) {
    $("seatsDetail").textContent = "Không kiểm tra được số chỗ. Máy chủ sẽ kiểm tra khi bạn gửi.";
    return;
  }
  renderSeats();
})();
