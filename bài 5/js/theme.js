// =====================================================
// Lõi quản lý giao diện (chạy ở <head> để không bị nháy màu khi tải trang)
// - Đọc/ghi LocalStorage: chế độ (Dark/Light), theme, màu tự chọn
// - Lần đầu vào trang: dùng window.matchMedia để theo hệ thống
// - Tự tính màu chữ để luôn đạt độ tương phản WCAG AA (>= 4.5:1)
// =====================================================
(function () {
  "use strict";
  var root = document.documentElement;
  var KEYS = { theme: "brand_theme", mode: "brand_mode", color: "brand_custom_color" };
  var DEFAULT_CUSTOM = "#7c3aed";
  var THEMES = {
    blue:   { label: "Modern Blue",    image: "images/banner-blue.svg",   alt: "Đường chân trời thành phố với các tòa nhà kính màu xanh dương" },
    green:  { label: "Organic Green",  image: "images/banner-green.svg",  alt: "Rừng thông trong sương sớm" },
    pink:   { label: "Cyberpunk Pink", image: "images/banner-pink.svg",   alt: "Thành phố đêm với ánh đèn neon hồng" },
    custom: { label: "Màu tự chọn",    image: "images/banner-custom.svg", alt: "Những lớp sóng trừu tượng nhuộm theo màu bạn chọn" }
  };
  var listeners = [];
  var animTimer = null;

  // ---------- LocalStorage (bọc try/catch phòng khi bị chặn) ----------
  function readStore(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function writeStore(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* bỏ qua */ } }

  // ---------- Tiện ích màu ----------
  function hexToRgb(hex) {
    var n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (v) {
      return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
    }).join("");
  }
  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {            // tỉ lệ tương phản theo WCAG
    var l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  function shiftHue(hex, degrees) {
    var c = hexToRgb(hex).map(function (v) { return v / 255; });
    var max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === c[0]) h = (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0);
      else if (max === c[1]) h = (c[2] - c[0]) / d + 2;
      else h = (c[0] - c[1]) / d + 4;
      h *= 60;
    }
    h = (h + degrees + 360) % 360;
    function f(n) {
      var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
      return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    }
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  function isHex(value) { return /^#[0-9a-f]{6}$/i.test(value || ""); }

  // ---------- Tính các biến phụ thuộc màu chủ đạo ----------
  function applyDerived() {
    var styles = getComputedStyle(root);
    var primary = styles.getPropertyValue("--primary-color").trim();
    var bg = styles.getPropertyValue("--bg").trim();
    if (!isHex(primary) || !isHex(bg)) return;

    // Chữ nằm trên nút/nền màu chủ đạo: chọn trắng hoặc đen, bên nào rõ hơn
    var onPrimary = contrast(primary, "#ffffff") >= contrast(primary, "#111111") ? "#ffffff" : "#111111";

    // Màu chủ đạo dùng làm CHỮ trên nền trang: làm sáng (tối) dần đến khi đạt 4.5:1
    var toward = root.dataset.mode === "dark" ? "#ffffff" : "#000000";
    var accentText = primary;
    for (var i = 0; i < 30 && contrast(accentText, bg) < 4.5; i++) accentText = mix(accentText, toward, 0.08);

    root.style.setProperty("--on-primary", onPrimary);
    root.style.setProperty("--accent-text", accentText);
  }

  function currentState() {
    return {
      theme: root.dataset.theme,
      mode: root.dataset.mode,
      customColor: readStore(KEYS.color) || DEFAULT_CUSTOM
    };
  }
  function notify(animate) {
    var state = currentState();
    listeners.forEach(function (fn) { fn(state, animate); });
  }
  function animateChange() {         // bật transition 0.5s chỉ trong lúc đổi giao diện
    root.classList.add("theme-animating");
    clearTimeout(animTimer);
    animTimer = setTimeout(function () { root.classList.remove("theme-animating"); }, 600);
  }

  // ---------- API công khai ----------
  function applyCustomColor(color) {
    root.style.setProperty("--primary-color", color);
    root.style.setProperty("--secondary-accent", shiftHue(color, 40));
  }
  function setTheme(name, options) {
    options = options || {};
    if (!THEMES[name]) return;
    if (options.animate) animateChange();
    root.dataset.theme = name;
    if (name === "custom") {
      var saved = readStore(KEYS.color);
      applyCustomColor(isHex(saved) ? saved : DEFAULT_CUSTOM);
    } else {
      root.style.removeProperty("--primary-color");
      root.style.removeProperty("--secondary-accent");
    }
    if (options.save !== false) writeStore(KEYS.theme, name);
    applyDerived();
    notify(!!options.animate);
  }
  function setCustomColor(color) {
    if (!isHex(color)) return;
    writeStore(KEYS.color, color);
    if (root.dataset.theme !== "custom") {
      setTheme("custom", { animate: true });
    } else {
      applyCustomColor(color);
      applyDerived();
      notify(false);
    }
  }
  function setMode(mode, options) {
    options = options || {};
    if (mode !== "dark" && mode !== "light") return;
    if (options.animate) animateChange();
    root.dataset.mode = mode;
    if (options.save !== false) writeStore(KEYS.mode, mode);
    applyDerived();
    notify(!!options.animate);
  }

  // ---------- Khởi tạo ngay khi tải trang ----------
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var savedTheme = readStore(KEYS.theme);
  var savedMode = readStore(KEYS.mode);
  var startMode = savedMode === "dark" || savedMode === "light"
    ? savedMode
    : (media && media.matches ? "dark" : "light");     // lần đầu: theo hệ điều hành
  root.dataset.mode = startMode;
  setTheme(THEMES[savedTheme] ? savedTheme : "blue", { save: false });

  // Nếu người dùng chưa tự chọn, tiếp tục theo hệ thống khi hệ thống đổi
  if (media) {
    var onSystemChange = function (e) {
      if (!readStore(KEYS.mode)) setMode(e.matches ? "dark" : "light", { save: false, animate: true });
    };
    if (media.addEventListener) media.addEventListener("change", onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }

  window.BrandTheme = {
    THEMES: THEMES,
    state: currentState,
    setTheme: function (name) { setTheme(name, { animate: true }); },
    setCustomColor: setCustomColor,
    setMode: function (mode) { setMode(mode, { animate: true }); },
    onChange: function (fn) { listeners.push(fn); },
    contrast: contrast
  };
})();
