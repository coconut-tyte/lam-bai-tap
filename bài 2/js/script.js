// =====================================================
// Weather & Travel Planner
// Dữ liệu: Array + Object. Lưu trữ: LocalStorage.
// =====================================================
const STORAGE_KEY = "weather_travel_planner_v1";

// ---------- Dữ liệu mẫu thời tiết (Array of Object) ----------
const WEATHER_DATA = [
  { id: "bien-hoa", name: "Biên Hòa", temp: 33, humidity: 70, wind: 12, condition: "sunny" },
  { id: "da-lat",   name: "Đà Lạt",   temp: 14, humidity: 86, wind: 9,  condition: "cloudy" },
  { id: "vung-tau", name: "Vũng Tàu", temp: 27, humidity: 88, wind: 22, condition: "rainy" },
  { id: "ha-noi",   name: "Hà Nội",   temp: 22, humidity: 75, wind: 10, condition: "cloudy" },
  { id: "da-nang",  name: "Đà Nẵng",  temp: 31, humidity: 74, wind: 15, condition: "sunny" }
];
const CONDITIONS = {
  sunny:  { label: "Nắng", icon: "☀️" },
  rainy:  { label: "Mưa",  icon: "🌧️" },
  cloudy: { label: "Mây",  icon: "☁️" }
};

// ---------- Trạng thái ứng dụng ----------
// state: phần được lưu vào LocalStorage
// view : phần chỉ dùng khi hiển thị (tìm kiếm, lọc, trang...), không lưu
let state = loadState();
const view = { search: "", filter: "all", sort: "added", pageSize: "10", page: 1, justAddedId: null };

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const citySelect = $("citySelect"), tripList = $("tripList"), pagination = $("pagination");

// ---------- LocalStorage ----------
function loadState() {
  const fallback = { city: WEATHER_DATA[0].id, itinerary: [], departure: "" };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); // chuỗi -> object
    if (!saved) return fallback;
    return {
      city: WEATHER_DATA.some(c => c.id === saved.city) ? saved.city : fallback.city,
      itinerary: Array.isArray(saved.itinerary) ? saved.itinerary : [],
      departure: typeof saved.departure === "string" ? saved.departure : ""
    };
  } catch (error) {
    return fallback;
  }
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // object -> chuỗi
  } catch (error) { /* bị chặn lưu trữ: bỏ qua */ }
}

// ---------- Thời tiết ----------
function renderCityOptions() {
  citySelect.innerHTML = "";
  WEATHER_DATA.forEach(city => {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = city.name;
    citySelect.appendChild(option);
  });
  citySelect.value = state.city;
}

function getSuggestions(city) {
  const tips = [];
  if (city.temp < 15) tips.push("🧥 Trời lạnh dưới 15°C: nên mang áo len hoặc áo khoác dày.");
  else if (city.temp <= 25) tips.push("🧢 Trời mát: một áo khoác mỏng là đủ.");
  else if (city.temp <= 30) tips.push("👕 Trời ấm: mặc đồ thoáng, nhớ đội nón.");
  else tips.push("🕶️ Trời nóng trên 30°C: mang nước lọc, kính râm và kem chống nắng.");
  if (city.condition === "rainy") tips.push("☂️ Có mưa: mang theo ô hoặc áo mưa.");
  if (city.humidity >= 85) tips.push("💧 Độ ẩm cao: chọn quần áo nhanh khô.");
  return tips;
}

function renderWeather() {
  const city = WEATHER_DATA.find(c => c.id === state.city);
  const cond = CONDITIONS[city.condition];
  document.body.dataset.weather = city.condition; // CSS đổi màu chủ đạo theo thời tiết
  $("weatherIcon").textContent = cond.icon;
  $("weatherTemp").textContent = city.temp + "°C";
  $("weatherCond").textContent = cond.label;
  $("weatherCity").textContent = city.name;
  $("weatherHumidity").textContent = city.humidity + "%";
  $("weatherWind").textContent = city.wind + " km/h";

  const tipsList = $("tipsList");
  tipsList.innerHTML = "";
  getSuggestions(city).forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    tipsList.appendChild(li);
  });
}

// ---------- Lịch trình: xử lý dữ liệu ----------
function getProcessedItems() {
  const keyword = view.search.trim().toLowerCase();
  let items = state.itinerary.filter(item => item.name.toLowerCase().includes(keyword)); // tìm kiếm
  if (view.filter === "visited") items = items.filter(item => item.visited);              // lọc
  if (view.filter === "pending") items = items.filter(item => !item.visited);

  const collator = new Intl.Collator("vi");                                               // sắp xếp
  if (view.sort === "az") items.sort((a, b) => collator.compare(a.name, b.name));
  if (view.sort === "za") items.sort((a, b) => collator.compare(b.name, a.name));
  if (view.sort === "time") items.sort((a, b) => a.visitTime.localeCompare(b.visitTime));
  return items;
}

function formatTime(value) {
  const date = new Date(value);
  return isNaN(date) ? value : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function createTripElement(item) {
  const li = document.createElement("li");
  li.className = "trip-item" + (item.visited ? " visited" : "") + (item.id === view.justAddedId ? " enter" : "");

  const info = document.createElement("div");
  info.className = "trip-info";
  const name = document.createElement("div");
  name.className = "trip-name";
  name.textContent = item.name;               // textContent để tránh chèn HTML
  const time = document.createElement("div");
  time.className = "trip-time";
  time.textContent = "🕒 " + formatTime(item.visitTime);
  info.append(name, time);

  const checkBtn = document.createElement("button");
  checkBtn.type = "button";
  checkBtn.className = "mini-btn check";
  checkBtn.textContent = item.visited ? "✓ Đã đến" : "Đánh dấu đã đến";
  checkBtn.addEventListener("click", () => toggleVisited(item.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "mini-btn delete";
  deleteBtn.textContent = "Xóa";
  deleteBtn.addEventListener("click", () => deleteItem(item.id, li));

  li.append(info, checkBtn, deleteBtn);
  return li;
}

function renderItinerary() {
  const items = getProcessedItems();

  // Phân trang
  const perPage = view.pageSize === "all" ? items.length || 1 : Number(view.pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  view.page = Math.min(Math.max(1, view.page), totalPages);
  const start = (view.page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  tripList.innerHTML = "";
  if (pageItems.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = state.itinerary.length === 0
      ? "Chưa có địa điểm nào. Nhập tên địa điểm và thời gian để thêm vào lịch trình."
      : "Không có địa điểm nào khớp với bộ lọc hiện tại.";
    tripList.appendChild(empty);
  }
  pageItems.forEach(item => tripList.appendChild(createTripElement(item)));
  view.justAddedId = null; // chỉ phát hiệu ứng thêm 1 lần

  renderPagination(totalPages);
  $("listInfo").textContent = items.length === 0
    ? ""
    : "Hiển thị " + (start + 1) + "–" + (start + pageItems.length) + " / " + items.length + " địa điểm";
}

function renderPagination(totalPages) {
  pagination.innerHTML = "";
  if (totalPages <= 1) return;
  const addButton = (label, page, disabled, active) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    if (active) { button.classList.add("active"); button.setAttribute("aria-current", "page"); }
    button.addEventListener("click", () => { view.page = page; renderItinerary(); });
    pagination.appendChild(button);
  };
  addButton("‹ Trước", view.page - 1, view.page === 1, false);
  for (let p = 1; p <= totalPages; p++) addButton(String(p), p, false, p === view.page);
  addButton("Sau ›", view.page + 1, view.page === totalPages, false);
}

// ---------- Lịch trình: thao tác ----------
function showError(message) { $("formError").textContent = message; }

function addItem(name, visitTime) {
  const item = { id: Date.now(), name: name, visitTime: visitTime, visited: false };
  state.itinerary.push(item);
  saveState();
  view.justAddedId = item.id;
  view.page = 1;
  if (view.sort === "added" && view.filter !== "visited") {
    // Mục mới nằm cuối danh sách: nhảy tới trang cuối để người dùng thấy ngay
    const perPage = view.pageSize === "all" ? Infinity : Number(view.pageSize);
    view.page = Math.max(1, Math.ceil(getProcessedItems().length / perPage));
  }
  renderItinerary();
}
function toggleVisited(id) {
  const item = state.itinerary.find(i => i.id === id);
  if (!item) return;
  item.visited = !item.visited;
  saveState();
  renderItinerary();
}
function deleteItem(id, element) {
  element.classList.add("leaving"); // chạy hiệu ứng rồi mới xóa khỏi dữ liệu
  setTimeout(() => {
    state.itinerary = state.itinerary.filter(i => i.id !== id);
    saveState();
    renderItinerary();
  }, 250);
}

// ---------- Xuất file .txt ----------
function exportItinerary() {
  if (state.itinerary.length === 0) { showError("Chưa có địa điểm nào để xuất."); return; }
  const city = WEATHER_DATA.find(c => c.id === state.city);
  const lines = ["LỊCH TRÌNH DU LỊCH", "Thành phố đang chọn: " + city.name, ""];
  state.itinerary.forEach((item, index) => {
    lines.push((index + 1) + ". " + item.name + " - " + formatTime(item.visitTime) + " [" + (item.visited ? "Đã đến" : "Chưa đến") + "]");
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lich-trinh.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showError("");
}

// ---------- Đồng hồ đếm ngược (Ngày : Giờ : Phút) ----------
function updateCountdown() {
  const days = $("cdDays"), hours = $("cdHours"), minutes = $("cdMinutes"), message = $("cdMessage");
  if (!state.departure) {
    days.textContent = hours.textContent = minutes.textContent = "--";
    message.textContent = "Chọn ngày khởi hành để bắt đầu đếm ngược.";
    return;
  }
  const diff = new Date(state.departure + "T00:00:00") - new Date();
  if (diff <= 0) {
    days.textContent = hours.textContent = minutes.textContent = "00";
    message.textContent = "Đã đến ngày khởi hành. Chúc bạn thượng lộ bình an!";
    return;
  }
  days.textContent = String(Math.floor(diff / 86400000)).padStart(2, "0");
  hours.textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
  minutes.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
  message.textContent = "";
}

// ---------- Sự kiện ----------
citySelect.addEventListener("change", () => {
  state.city = citySelect.value;
  saveState();
  renderWeather(); // cập nhật ngay, không load lại trang
});

$("tripForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("placeInput").value.trim();
  const time = $("timeInput").value;
  if (!name || !time) { showError("Vui lòng nhập đủ tên địa điểm và thời gian ghé thăm."); return; }
  showError("");
  addItem(name, time);
  $("placeInput").value = "";
  $("timeInput").value = "";
  $("placeInput").focus();
});

$("searchInput").addEventListener("input", e => { view.search = e.target.value; view.page = 1; renderItinerary(); });
$("filterSelect").addEventListener("change", e => { view.filter = e.target.value; view.page = 1; renderItinerary(); });
$("sortSelect").addEventListener("change", e => { view.sort = e.target.value; view.page = 1; renderItinerary(); });
$("pageSizeSelect").addEventListener("change", e => { view.pageSize = e.target.value; view.page = 1; renderItinerary(); });
$("exportBtn").addEventListener("click", exportItinerary);

$("departureInput").addEventListener("change", e => {
  state.departure = e.target.value;
  saveState();
  updateCountdown();
});

// ---------- Khởi động ----------
$("todayText").textContent = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });
renderCityOptions();
renderWeather();
$("departureInput").value = state.departure;
updateCountdown();
setInterval(updateCountdown, 1000);
renderItinerary();
