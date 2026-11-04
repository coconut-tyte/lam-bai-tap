// =====================================================
// Landing page Đỉnh Sương
// =====================================================
const LANG_KEY = "dinhsuong_lang";
const PROMO_KEY = "dinhsuong_promo_shown";
const PROMO_DELAY_MS = 10000; // 10 giây (đổi nhỏ lại khi muốn test nhanh)

const $ = id => document.getElementById(id);
document.documentElement.classList.add("js");

// ---------- 1. Sticky header: đổi màu khi cuộn ----------
const header = $("siteHeader");
function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 40);
}
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

// ---------- 2. Menu hamburger (mobile) ----------
const nav = $("nav");
const menuBtn = $("menuBtn");
function setMenu(open) {
  nav.classList.toggle("open", open);
  header.classList.toggle("menu-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", t(open ? "ui.menuClose" : "ui.menuOpen"));
}
menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

// ---------- 3. Tabs thông số ----------
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
function selectTab(selected) {
  tabs.forEach(tab => {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    $(tab.getAttribute("aria-controls")).hidden = !active;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", e => {            // điều hướng bằng phím mũi tên
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    if (e.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
    if (next) { e.preventDefault(); selectTab(next); next.focus(); }
  });
});

// ---------- 4. Accordion hỏi đáp ----------
document.querySelectorAll(".acc-btn").forEach(button => {
  button.addEventListener("click", () => {
    const item = button.closest(".acc-item");
    const willOpen = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(willOpen));
    item.classList.toggle("open", willOpen);
  });
});

// ---------- 5. Đa ngôn ngữ (i18n) ----------
let currentLang = "vi";
function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations.vi[key] || key;
}
function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  document.title = t("meta.title");

  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  // Nội dung HTML do chính chúng ta viết trong translations.js (không lấy từ người dùng)
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });

  $("langBtn").textContent = t("ui.langShort");
  $("langBtn").setAttribute("aria-label", t("ui.langLabel"));
  $("promoClose").setAttribute("aria-label", t("ui.closePopup"));
  menuBtn.setAttribute("aria-label", t(nav.classList.contains("open") ? "ui.menuClose" : "ui.menuOpen"));
  try { localStorage.setItem(LANG_KEY, lang); } catch (error) { /* bỏ qua */ }
}
$("langBtn").addEventListener("click", () => setLanguage(currentLang === "vi" ? "en" : "vi"));

let savedLang = "vi";
try { savedLang = localStorage.getItem(LANG_KEY) || "vi"; } catch (error) { /* bỏ qua */ }
setLanguage(savedLang);

// ---------- 6. Hiệu ứng xuất hiện khi cuộn tới ----------
const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  revealItems.forEach(el => observer.observe(el));
} else {
  revealItems.forEach(el => el.classList.add("in"));
}

// ---------- 7. Popup khuyến mãi sau 10 giây ----------
const promo = $("promoModal");
function closePromo() { if (promo.open) promo.close(); }
function openPromo() {
  try { if (sessionStorage.getItem(PROMO_KEY)) return; } catch (error) { /* bỏ qua */ }
  if (typeof promo.showModal === "function") promo.showModal(); else promo.setAttribute("open", "");
  try { sessionStorage.setItem(PROMO_KEY, "1"); } catch (error) { /* bỏ qua */ }
}
setTimeout(openPromo, PROMO_DELAY_MS);
$("promoClose").addEventListener("click", closePromo);
$("promoDismiss").addEventListener("click", closePromo);
promo.addEventListener("click", e => { if (e.target === promo) closePromo(); }); // bấm nền để đóng

$("copyCodeBtn").addEventListener("click", async () => {
  const button = $("copyCodeBtn");
  try {
    await navigator.clipboard.writeText($("promoCode").textContent);
    button.textContent = t("promo.copied");
    setTimeout(() => { button.textContent = t("promo.copy"); }, 2000);
  } catch (error) {
    button.textContent = $("promoCode").textContent; // trình duyệt chặn clipboard: hiện mã để tự chép
  }
});
