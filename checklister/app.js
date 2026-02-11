const STORAGE_KEY = "checklister.v1";
const SETTINGS_KEY = "checklister.settings.v1";
const DEMO_SEEDED_KEY = "checklister.demo-seeded.v1";

const state = {
  tasks: [],
  settings: {
    reminders: false,
    weekly: false,
    vacation: false,
  },
};

const els = {
  todayLabel: document.getElementById("today-label"),
  tabs: [...document.querySelectorAll(".tab")],
  panels: {
    track: document.getElementById("tab-track"),
    history: document.getElementById("tab-history"),
    settings: document.getElementById("tab-settings"),
    news: document.getElementById("tab-news"),
  },
  form: document.getElementById("task-form"),
  taskInput: document.getElementById("task-input"),
  taskList: document.getElementById("task-list"),
  taskTemplate: document.getElementById("task-template"),
  noTasks: document.getElementById("no-tasks"),
  summaryCards: document.getElementById("summary-cards"),
  chart: document.getElementById("trend-chart"),
  badgeShelf: document.getElementById("badge-shelf"),
  settings: {
    reminders: document.getElementById("setting-reminders"),
    weekly: document.getElementById("setting-weekly"),
    vacation: document.getElementById("setting-vacation"),
  },
  manageTaskList: document.getElementById("manage-task-list"),
  manageEmpty: document.getElementById("manage-empty"),
  seedBtn: document.getElementById("seed-btn"),
};

init();

function init() {
  loadState();
  wireEvents();
  render();
}

function wireEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = els.taskInput.value.trim();
    if (!name) return;
    addTask(name);
    els.taskInput.value = "";
  });

  els.settings.reminders.addEventListener("change", onSettingsChange);
  els.settings.weekly.addEventListener("change", onSettingsChange);
  els.settings.vacation.addEventListener("change", onSettingsChange);

  els.seedBtn.addEventListener("click", () => seedDemoTasks(true));
}

function onSettingsChange() {
  state.settings.reminders = els.settings.reminders.checked;
  state.settings.weekly = els.settings.weekly.checked;
  state.settings.vacation = els.settings.vacation.checked;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function switchTab(name) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === name));
}

function seedDemoTasks(force = false) {
  if (state.tasks.length > 0 && !force) return;

  const today = new Date();
  const demoTasks = [
    { name: "Journal", rate: 0.83, streak: 19, historyDays: 210 },
    { name: "Brush teeth", rate: 0.95, streak: 73, historyDays: 210 },
    { name: "Walk the dog", rate: 0.77, streak: 7, historyDays: 190 },
    { name: "Read 20 minutes", rate: 0.74, streak: 11, historyDays: 180 },
    { name: "Meditate 10 min", rate: 0.62, streak: 4, historyDays: 160 },
    { name: "Stretch", rate: 0.57, streak: 0, historyDays: 140 },
  ];

  state.tasks = demoTasks.map((config, idx) => {
    const created = daysAgo(config.historyDays, today);
    const task = {
      id: crypto.randomUUID(),
      name: config.name,
      createdAt: created.toISOString(),
      completions: {},
    };

    for (let i = config.historyDays; i >= 0; i--) {
      const day = daysAgo(i, today);
      const key = dateKey(day);
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      const weekendPenalty = weekend ? 9 : 0;
      const score = stableScore(`${config.name}-${key}`);
      const threshold = Math.round(config.rate * 100) - weekendPenalty;
      task.completions[key] = score < threshold;
    }

    for (let i = 0; i < config.streak; i++) {
      const day = dateKey(daysAgo(i, today));
      task.completions[day] = true;
    }

    if (config.streak === 0 && idx % 2 === 1) {
      task.completions[dateKey(today)] = false;
    }

    return task;
  });

  if (!localStorage.getItem(SETTINGS_KEY)) {
    state.settings.reminders = true;
    state.settings.weekly = true;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  localStorage.setItem(DEMO_SEEDED_KEY, "1");
  saveTasks();
  render();
}

function addTask(name, rerender = true) {
  state.tasks.push({
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    completions: {},
  });
  saveTasks();
  if (rerender) render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function toggleToday(id, checked) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.completions[dateKey(new Date())] = checked;
  saveTasks();
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) state.tasks = parsed;
    }
    const settingsRaw = localStorage.getItem(SETTINGS_KEY);
    if (settingsRaw) {
      const parsedSettings = JSON.parse(settingsRaw);
      state.settings = { ...state.settings, ...parsedSettings };
    }

    // Auto-seed first run so the app looks lived-in immediately.
    if (state.tasks.length === 0 && !localStorage.getItem(DEMO_SEEDED_KEY)) {
      seedDemoTasks();
    }
  } catch {
    state.tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function render() {
  const today = new Date();
  els.todayLabel.textContent = formatDate(today);
  renderTasks(today);
  renderHistory(today);
  renderSettings();
}

function renderTasks(today) {
  els.taskList.innerHTML = "";
  const todayKey = dateKey(today);

  els.noTasks.classList.toggle("hidden", state.tasks.length !== 0);

  state.tasks
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((task) => {
      const node = els.taskTemplate.content.firstElementChild.cloneNode(true);
      const title = node.querySelector(".task-title");
      const meta = node.querySelector(".task-meta");
      const checkbox = node.querySelector(".complete-today");
      const historyDots = node.querySelector(".history-dots");

      const streak = currentStreak(task, today);
      const completedDays = completionCount(task);
      const pct = percentage(task, 30, today);

      title.textContent = task.name;
      meta.textContent = `Streak: ${streak} day${streak === 1 ? "" : "s"} | 30d: ${pct}% | Total done: ${completedDays}`;

      checkbox.checked = !!task.completions[todayKey];
      checkbox.addEventListener("change", () => toggleToday(task.id, checkbox.checked));

      for (let i = 13; i >= 0; i--) {
        const d = daysAgo(i, today);
        const key = dateKey(d);
        const dot = document.createElement("span");
        dot.className = "dot";
        if (task.completions[key]) dot.classList.add("ok");
        if (key === todayKey) dot.classList.add("today");
        dot.title = `${formatDate(d)}: ${task.completions[key] ? "done" : "missed"}`;
        historyDots.appendChild(dot);
      }

      els.taskList.appendChild(node);
    });
}

function renderHistory(today) {
  els.summaryCards.innerHTML = "";
  els.badgeShelf.innerHTML = "";

  const overall30 = overallPercentage(30, today);
  const longest = longestCurrentStreak(today);

  const summary = [
    { label: "Tasks", value: state.tasks.length },
    { label: "30-day completion", value: `${overall30}%` },
    { label: "Best active streak", value: `${longest}d` },
    { label: "Total check marks", value: state.tasks.reduce((sum, t) => sum + completionCount(t), 0) },
  ];

  summary.forEach((card) => {
    const el = document.createElement("div");
    el.className = "summary-card";
    el.innerHTML = `<div>${card.label}</div><strong>${card.value}</strong>`;
    els.summaryCards.appendChild(el);
  });

  const badges = buildBadges(today);
  if (badges.length === 0) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent = "No badges yet. Keep building streaks.";
    els.badgeShelf.appendChild(none);
  } else {
    badges.forEach((b) => {
      const el = document.createElement("div");
      el.className = "badge";
      el.textContent = b;
      els.badgeShelf.appendChild(el);
    });
  }

  drawChart(els.chart, today);
}

function buildBadges(today) {
  const streaks = state.tasks.map((t) => currentStreak(t, today));
  const max = Math.max(0, ...streaks);
  const badges = [];
  if (max >= 5) badges.push("5 Day\nStreak");
  if (max >= 10) badges.push("10 Day\nStreak");
  if (max >= 30) badges.push("30 Day\nStreak");
  if (overallPercentage(30, today) >= 80) badges.push("80%\n30-Day");
  if (state.tasks.length >= 5) badges.push("5 Active\nTasks");
  return badges;
}

function renderSettings() {
  els.settings.reminders.checked = !!state.settings.reminders;
  els.settings.weekly.checked = !!state.settings.weekly;
  els.settings.vacation.checked = !!state.settings.vacation;
  renderTaskManager();
}

function renderTaskManager() {
  els.manageTaskList.innerHTML = "";
  const sorted = state.tasks.slice().sort((a, b) => a.name.localeCompare(b.name));
  els.manageEmpty.classList.toggle("hidden", sorted.length !== 0);

  for (const task of sorted) {
    const li = document.createElement("li");
    li.className = "manage-task-item";

    const name = document.createElement("span");
    name.className = "manage-task-name";
    name.textContent = task.name;

    const removeBtn = document.createElement("button");
    removeBtn.className = "delete-btn";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => deleteTask(task.id));

    li.append(name, removeBtn);
    els.manageTaskList.appendChild(li);
  }
}

function drawChart(canvas, today) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  const points = [];
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i, today);
    points.push({ day: d, pct: overallPercentageForDate(d) });
  }

  const pad = { top: 16, right: 10, bottom: 24, left: 38 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  ctx.strokeStyle = "#d4c7b6";
  ctx.lineWidth = 1;
  for (let y = 0; y <= 5; y++) {
    const yy = pad.top + (plotH * y) / 5;
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.fillStyle = "#776b5c";
    ctx.font = "11px 'Trebuchet MS'";
    ctx.fillText(`${100 - y * 20}%`, 4, yy + 4);
  }

  ctx.beginPath();
  points.forEach((p, idx) => {
    const x = pad.left + (plotW * idx) / (points.length - 1);
    const y = pad.top + plotH * (1 - p.pct / 100);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#17624f";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.fillStyle = "#cf5b2e";
  points.forEach((p, idx) => {
    if (idx % 6 !== 0 && idx !== points.length - 1) return;
    const x = pad.left + (plotW * idx) / (points.length - 1);
    const y = pad.top + plotH * (1 - p.pct / 100);
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#564a3d";
  ctx.font = "12px 'Trebuchet MS'";
  ctx.fillText("30-day overall completion", pad.left, height - 6);
}

function completionCount(task) {
  return Object.values(task.completions).filter(Boolean).length;
}

function percentage(task, days, today) {
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = daysAgo(i, today);
    if (task.completions[dateKey(d)]) done += 1;
  }
  return Math.round((done / days) * 100);
}

function overallPercentage(days, today) {
  if (state.tasks.length === 0) return 0;
  let done = 0;
  let total = 0;
  for (const task of state.tasks) {
    for (let i = 0; i < days; i++) {
      const d = daysAgo(i, today);
      total += 1;
      if (task.completions[dateKey(d)]) done += 1;
    }
  }
  return Math.round((done / total) * 100);
}

function overallPercentageForDate(day) {
  if (state.tasks.length === 0) return 0;
  const key = dateKey(day);
  const done = state.tasks.filter((t) => !!t.completions[key]).length;
  return Math.round((done / state.tasks.length) * 100);
}

function currentStreak(task, today) {
  let streak = 0;
  for (let i = 0; i < 10000; i++) {
    const day = daysAgo(i, today);
    const key = dateKey(day);
    if (task.completions[key]) {
      streak += 1;
      continue;
    }

    // Optional vacation mode: don't break streak on misses.
    if (state.settings.vacation) {
      continue;
    }

    break;
  }
  return streak;
}

function longestCurrentStreak(today) {
  return state.tasks.reduce((m, t) => Math.max(m, currentStreak(t, today)), 0);
}

function daysAgo(days, refDate = new Date()) {
  const d = new Date(refDate);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function stableScore(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}
