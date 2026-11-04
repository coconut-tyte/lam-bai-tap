// ====== Cấu hình ======
const USER_NAME = "Bảo";
const STORAGE_KEY = "dashboard_tasks_bao";
const RING_LENGTH = 113.1; // chu vi vòng tròn r=18

// ====== Trạng thái ======
let tasks = loadTasks();   // [{ id, text, completed }]
let currentFilter = "all"; // all | todo | done

// ====== DOM ======
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const footerEl = document.getElementById("footer");
const filtersEl = document.getElementById("filters");

// ====== LocalStorage ======
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : []; // JSON.parse: chuỗi -> mảng
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); // JSON.stringify: mảng -> chuỗi
  } catch (error) { /* trình duyệt chặn lưu trữ: bỏ qua */ }
}

// ====== Thao tác dữ liệu ======
function addTask(text) {
  tasks.push({ id: Date.now(), text: text, completed: false });
  saveTasks();
  render();
}
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}
function deleteTask(id, itemEl) {
  itemEl.classList.add("removing"); // chạy hiệu ứng trượt ra rồi mới xóa
  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }, 200);
}
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const newText = prompt("Sửa công việc:", task.text);
  if (newText === null) return; // bấm Hủy
  if (newText.trim() === "") { alert("Nội dung không được để trống!"); return; }
  task.text = newText.trim();
  saveTasks();
  render();
}
function clearDoneTasks() {
  if (!tasks.some(t => t.completed)) return;
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}

// ====== Hiển thị ======
function getVisibleTasks() {
  if (currentFilter === "done") return tasks.filter(t => t.completed);
  if (currentFilter === "todo") return tasks.filter(t => !t.completed);
  return tasks;
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " completed" : "");

  const check = document.createElement("button");
  check.type = "button";
  check.className = "check";
  check.setAttribute("aria-label", "Đánh dấu hoàn thành");
  check.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
  check.addEventListener("click", () => toggleTask(task.id));

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text; // textContent: tránh chèn HTML độc hại
  text.addEventListener("click", () => toggleTask(task.id));

  const actions = document.createElement("div");
  actions.className = "actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "icon-btn";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", () => editTask(task.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "icon-btn delete";
  deleteBtn.textContent = "Xóa";
  deleteBtn.addEventListener("click", () => deleteTask(task.id, li));

  actions.append(editBtn, deleteBtn);
  li.append(check, text, actions);
  return li;
}

function updateSummary() {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statDone").textContent = done;
  document.getElementById("statTodo").textContent = total - done;
  document.getElementById("ringText").textContent = percent + "%";
  document.getElementById("ringFg").style.strokeDashoffset = RING_LENGTH * (1 - percent / 100);
  footerEl.textContent = "Tổng số công việc: " + total + " (đã xong " + done + ")";
}

function render() {
  taskList.innerHTML = "";
  const visible = getVisibleTasks();

  if (visible.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = tasks.length === 0
      ? "Chưa có việc nào. Nhập việc đầu tiên ở ô phía trên nhé."
      : "Không có việc nào trong mục này.";
    taskList.appendChild(empty);
  }
  visible.forEach(task => taskList.appendChild(createTaskElement(task)));
  updateSummary();
}

// ====== Sự kiện ======
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (text === "") { // Bẫy logic 1: ô trống thì cảnh báo, không thêm
    taskInput.classList.add("shake");
    setTimeout(() => taskInput.classList.remove("shake"), 300);
    alert("Vui lòng nhập nội dung công việc!");
    return;
  }
  addTask(text);
  taskInput.value = "";
  taskInput.focus();
});

filtersEl.addEventListener("click", function (event) { // Bẫy logic 2: bộ lọc
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  filtersEl.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === button));
  render();
});

document.getElementById("clearDoneBtn").addEventListener("click", clearDoneTasks);

// ====== Đồng hồ thời gian thực (setInterval) ======
function pad(n) { return String(n).padStart(2, "0"); }
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
}
function updateGreeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? "buổi sáng" : hour < 18 ? "buổi chiều" : "buổi tối";
  document.getElementById("greeting").textContent = "Chào " + USER_NAME + ", chúc " + part + " tốt lành!";
  document.getElementById("dateText").textContent =
    new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });
}
updateClock();
updateGreeting();
setInterval(updateClock, 1000);
setInterval(updateGreeting, 60000); // cập nhật lời chào khi đổi buổi

// ====== Sidebar trên mobile ======
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");
function setSidebar(open) {
  sidebar.classList.toggle("open", open);
  overlay.classList.toggle("show", open);
  menuBtn.setAttribute("aria-expanded", String(open));
}
menuBtn.addEventListener("click", () => setSidebar(!sidebar.classList.contains("open")));
overlay.addEventListener("click", () => setSidebar(false));

render();
