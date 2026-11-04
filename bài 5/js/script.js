// =====================================================
// Giao diện người dùng cho Theme Toolbar và trang trình diễn
// (lõi theme nằm trong js/theme.js)
// =====================================================
const $ = id => document.getElementById(id);
const modeSwitch = $("modeSwitch");
const themeButtons = document.querySelectorAll("[data-theme-btn]");
const customColor = $("customColor");
const bannerImg = $("bannerImg");

// ---------- Sự kiện click đổi giao diện ----------
modeSwitch.addEventListener("click", () => {
  BrandTheme.setMode(BrandTheme.state().mode === "dark" ? "light" : "dark");
});
themeButtons.forEach(button => {
  button.addEventListener("click", () => BrandTheme.setTheme(button.dataset.themeBtn));
});
customColor.addEventListener("input", () => BrandTheme.setCustomColor(customColor.value)); // áp dụng trực tiếp khi kéo chọn màu

// ---------- Đồng bộ trạng thái nút ----------
function syncToolbar(state) {
  const dark = state.mode === "dark";
  modeSwitch.setAttribute("aria-checked", String(dark));
  $("modeText").textContent = dark ? "Tối" : "Sáng";
  themeButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.themeBtn === state.theme)));
  document.querySelector(".color-btn").classList.toggle("active", state.theme === "custom");
  customColor.value = state.customColor;
}

// ---------- Đồng bộ ảnh banner theo theme (mờ dần 0.25s rồi đổi) ----------
function syncBanner(state, animate) {
  const theme = BrandTheme.THEMES[state.theme];
  bannerImg.alt = theme.alt;
  if (bannerImg.getAttribute("src") === theme.image) return;
  if (!animate) { bannerImg.src = theme.image; return; }
  bannerImg.classList.add("fade-out");
  setTimeout(() => { bannerImg.src = theme.image; }, 250);
}
bannerImg.addEventListener("load", () => bannerImg.classList.remove("fade-out"));
bannerImg.addEventListener("error", () => bannerImg.classList.remove("fade-out"));

// ---------- Bộ nhận diện hiển thị trực tiếp (màu, font, độ tương phản) ----------
const SWATCHES = [
  ["Màu chủ đạo", "--primary-color"], ["Màu phụ", "--secondary-accent"], ["Nền trang", "--bg"],
  ["Nền thẻ", "--surface"], ["Chữ chính", "--text"], ["Chữ phụ", "--muted"]
];
const CONTRAST_PAIRS = [
  ["Chữ chính trên nền trang", "--text", "--bg"],
  ["Chữ phụ trên nền trang", "--muted", "--bg"],
  ["Màu nhấn dạng chữ trên nền", "--accent-text", "--bg"],
  ["Chữ trên nút chính", "--on-primary", "--primary-color"]
];
const readVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const firstFont = value => (value.split(",")[0] || "").replace(/["']/g, "").trim();

function renderBrandKit() {
  const swatchBox = $("swatches");
  swatchBox.innerHTML = "";
  SWATCHES.forEach(([label, variable]) => {
    const item = document.createElement("div");
    item.className = "swatch";
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.style.background = "var(" + variable + ")";
    const text = document.createElement("span");
    text.className = "swatch-text";
    const name = document.createElement("b");
    name.textContent = label;
    const code = document.createElement("code");
    code.textContent = readVar(variable).toUpperCase();
    text.append(name, code);
    item.append(chip, text);
    swatchBox.appendChild(item);
  });

  $("fontHeading").textContent = firstFont(readVar("--font-heading"));
  $("fontBody").textContent = firstFont(readVar("--font-body"));

  const list = $("contrastList");
  list.innerHTML = "";
  CONTRAST_PAIRS.forEach(([label, fg, bg]) => {
    const ratio = BrandTheme.contrast(readVar(fg), readVar(bg));
    const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Chưa đạt";
    const row = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("span");
    value.className = "ratio";
    value.textContent = ratio.toFixed(1) + ":1";
    const badge = document.createElement("span");
    badge.className = "badge " + (level === "Chưa đạt" ? "fail" : "pass");
    badge.textContent = level;
    row.append(name, value, badge);
    list.appendChild(row);
  });
}

BrandTheme.onChange((state, animate) => {
  syncToolbar(state);
  syncBanner(state, animate);
  renderBrandKit();
});

// Lần đầu: đồng bộ theo trạng thái đã khôi phục từ LocalStorage
const initial = BrandTheme.state();
syncToolbar(initial);
syncBanner(initial, false);
renderBrandKit();
