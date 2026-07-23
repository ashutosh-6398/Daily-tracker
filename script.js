// --- REST API BACKEND & CLOUD SYNC ENGINE ---
const API_BASE_URL = (window.location.origin.includes("8000") || window.location.origin.includes("5000") || window.location.origin.includes("3000"))
  ? "http://localhost:5000"
  : window.location.origin;

function updateCloudStatusUI(isOnline, message) {
  const pill = document.getElementById("cloudStatusPill");
  if (!pill) return;
  if (isOnline) {
    pill.textContent = message || "☁️ Cloud Synced";
    pill.style.borderColor = "rgba(34, 197, 94, 0.4)";
    pill.style.color = "#22c55e";
  } else {
    pill.textContent = message || "📱 Local Mode";
    pill.style.borderColor = "rgba(56, 189, 248, 0.3)";
    pill.style.color = "var(--accent)";
  }
}

async function apiFetch(endpoint, method = "GET", data = null) {
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (data && (method === "POST" || method === "PUT")) {
    config.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "API error");
    }
    updateCloudStatusUI(true, "☁️ Cloud Synced");
    return json;
  } catch (err) {
    updateCloudStatusUI(false, "📱 Local Mode");
    throw err;
  }
}

async function syncCloudData() {
  const token = localStorage.getItem("auth_token");
  if (!token) return;

  try {
    const data = await apiFetch("/api/data/sync");
    if (data) {
      if (data.goals) localStorage.setItem("goals", JSON.stringify(data.goals));
      if (data.customGoals) localStorage.setItem("customGoals", JSON.stringify(data.customGoals));
      if (data.tasks) localStorage.setItem("tasks", JSON.stringify(data.tasks));

      if (data.entries) {
        Object.keys(data.entries).forEach(dateKey => {
          localStorage.setItem("entry-" + dateKey, JSON.stringify(data.entries[dateKey]));
        });
      }

      if (data.notes) {
        Object.keys(data.notes).forEach(dateKey => {
          localStorage.setItem("notes-" + dateKey, data.notes[dateKey]);
        });
      }

      loadData();
    }
  } catch (err) {
    console.log("Using cached local data");
  }
}

function changeTheme(themeName) {
  document.body.className = "theme-" + themeName;
  localStorage.setItem("theme", themeName);
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "cosmic";
  const selector = document.getElementById("themeSelector");
  if (selector) selector.value = savedTheme;
  changeTheme(savedTheme);
}

initTheme();

const todayKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const fmtDate = () => new Date().toLocaleDateString(undefined, {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

datePill.textContent = fmtDate();

function syncGoalsToApi() {
  const goals = JSON.parse(localStorage.getItem("goals")) || {};
  const customGoals = JSON.parse(localStorage.getItem("customGoals")) || [];
  apiFetch("/api/data/goals", "POST", { goals, customGoals }).catch(() => {});
}

function syncEntryToApi(dateKey, data) {
  apiFetch("/api/data/entry", "POST", { dateKey, entryData: data }).catch(() => {});
}

function syncNoteToApi(dateKey, content) {
  apiFetch("/api/data/notes", "POST", { dateKey, content }).catch(() => {});
}

function syncTasksToApi() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  apiFetch("/api/data/tasks", "POST", { tasks }).catch(() => {});
}

function addCustomGoal() {
  const name = newGoalName.value.trim();
  const target = +newGoalTarget.value;
  const unit = newGoalUnit.value.trim();
  const isLimit = newGoalLimit.checked;
  if (!name || target <= 0) return alert("Please enter valid name and target.");
  const goals = JSON.parse(localStorage.getItem("customGoals") || "[]");
  goals.push({ id: "cg_" + Date.now(), name, target, unit, isLimit });
  localStorage.setItem("customGoals", JSON.stringify(goals));
  newGoalName.value = ""; newGoalTarget.value = 30; newGoalUnit.value = ""; newGoalLimit.checked = false;
  syncGoalsToApi();
  loadData();
}

function renderCustomGoalsUI() {
  const goals = JSON.parse(localStorage.getItem("customGoals") || "[]");
  customGoalsList.innerHTML = goals.map((g, i) => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--panel-2); padding:8px 12px; border-radius:8px;">
      <span>${g.name} (${g.target} ${g.unit})</span>
      <button style="margin:0; padding:4px 8px; font-size:12px; background:var(--danger);" onclick="deleteCustomGoal(${i})">X</button>
    </div>
  `).join("");
}

function deleteCustomGoal(i) {
  const goals = JSON.parse(localStorage.getItem("customGoals") || "[]");
  goals.splice(i, 1);
  localStorage.setItem("customGoals", JSON.stringify(goals));
  syncGoalsToApi();
  loadData();
}

function loadData() {
  renderCustomGoalsUI();
  const goals = JSON.parse(localStorage.getItem("goals")) || {
    sleep: 8, exercise: 60, water: 3, screen: 6
  };
  sleep.value = goals.sleep;
  exercise.value = goals.exercise;
  water.value = goals.water;
  screen.value = goals.screen;

  const entry = JSON.parse(localStorage.getItem("entry-" + todayKey())) || {};
  logSleep.value = entry.sleep ?? "";
  logExercise.value = entry.exercise ?? "";
  logWater.value = entry.water ?? "";
  logScreen.value = entry.screen ?? "";
  mood.value = entry.mood ?? "Good";
  notes.value = localStorage.getItem("notes-" + todayKey()) || "";

  // Load custom goal inputs values
  const customGoals = JSON.parse(localStorage.getItem("customGoals") || "[]");
  customLogInputs.innerHTML = customGoals.map(g => `
    <label>${g.name} (${g.unit})</label>
    <input id="log_${g.id}" type="number" step="any" min="0" value="${entry[g.id] ?? ''}" placeholder="Target: ${g.target}" />
  `).join("");

  renderTasks();
  renderProgress();
  renderSummary();
  renderTrends();
  renderCalendar();
  renderStreaksAndBadges();
  renderMoodChart();
  initPomoSettings();
  renderPixelGrid();
  renderCoachInsights();
}

function saveGoals() {
  const goalsData = {
    sleep: +sleep.value,
    exercise: +exercise.value,
    water: +water.value,
    screen: +screen.value
  };
  localStorage.setItem("goals", JSON.stringify(goalsData));
  syncGoalsToApi();
  renderProgress();
  alert("Goals saved!");
}

function saveEntry() {
  const data = {
    sleep: +logSleep.value || 0,
    exercise: +logExercise.value || 0,
    water: +logWater.value || 0,
    screen: +logScreen.value || 0,
    mood: mood.value
  };

  // Read custom goal inputs dynamically
  const customGoals = JSON.parse(localStorage.getItem("customGoals") || "[]");
  customGoals.forEach(g => {
    const input = document.getElementById(`log_${g.id}`);
    if (input) {
      data[g.id] = +input.value || 0;
    }
  });

  const dk = todayKey();
  localStorage.setItem("entry-" + dk, JSON.stringify(data));
  syncEntryToApi(dk, data);

  renderProgress();
  renderSummary();
  renderTrends();
  renderCalendar();
  renderStreaksAndBadges();
  renderMoodChart();
  renderPixelGrid();
  renderCoachInsights();
  alert("Entry saved!");
}

function saveNotes() {
  const dk = todayKey();
  const val = notes.value;
  localStorage.setItem("notes-" + dk, val);
  syncNoteToApi(dk, val);
  alert("Notes saved!");
}

function migrateTasks(oldTasks) {
  let changed = false;
  const migrated = oldTasks.map((t, idx) => {
    const hasStatus = !!t.status;
    const hasId = !!t.id;
    if (hasStatus && hasId) {
      const shouldBeDone = t.status === "done";
      if (t.done !== shouldBeDone) {
        t.done = shouldBeDone;
        changed = true;
      }
      return t;
    }
    
    changed = true;
    return {
      id: t.id || "t_" + (Date.now() + idx),
      text: t.text,
      category: t.category || "Other",
      status: t.status || (t.done ? "done" : "todo"),
      done: t.done !== undefined ? t.done : (t.status === "done")
    };
  });
  
  if (changed) {
    localStorage.setItem("tasks", JSON.stringify(migrated));
  }
  return migrated;
}

function addTask() {
  const task = taskInput.value.trim();
  if (!task) return;
  const category = taskCategorySelect.value || "Other";
  
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const migrated = migrateTasks(tasks);
  
  migrated.push({
    id: "t_" + Date.now(),
    text: task,
    category: category,
    status: "todo",
    done: false
  });
  
  localStorage.setItem("tasks", JSON.stringify(migrated));
  taskInput.value = "";
  renderTasks();
}

function renderTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const migrated = migrateTasks(tasks);

  const todoList = document.getElementById("todoList");
  const progressList = document.getElementById("progressList");
  const doneList = document.getElementById("doneList");
  
  if (!todoList || !progressList || !doneList) return;

  todoList.innerHTML = "";
  progressList.innerHTML = "";
  doneList.innerHTML = "";

  const catColors = {
    Work: { bg: "rgba(56, 189, 248, 0.12)", border: "rgba(56, 189, 248, 0.3)", text: "var(--accent)" },
    Health: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.3)", text: "#4ade80" },
    Personal: { bg: "rgba(236, 72, 153, 0.12)", border: "rgba(236, 72, 153, 0.3)", text: "#f472b6" },
    Other: { bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.3)", text: "var(--muted)" }
  };

  migrated.forEach(t => {
    const colors = catColors[t.category] || catColors.Other;
    const card = document.createElement("div");
    card.className = "kanban-card";
    card.draggable = true;
    card.id = t.id;
    card.addEventListener("dragstart", (e) => drag(e, t.id));
    card.addEventListener("dragend", dragEnd);

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <span style="font-weight: 500; font-size: 14px; line-height: 1.4; color: var(--text); ${t.status === 'done' ? 'text-decoration: line-through; color: var(--muted);' : ''}">${t.text}</span>
        <button onclick="deleteTask('${t.id}')" style="margin: 0; padding: 4px 6px; font-size: 11px; background: transparent; border: 1px solid rgba(239, 68, 68, 0.3); color: var(--danger); border-radius: 6px; cursor: pointer; line-height: 1;">✕</button>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 3px 6px; border-radius: 6px; background: ${colors.bg}; border: 1px solid ${colors.border}; color: ${colors.text}; letter-spacing: 0.05em;">
          ${t.category}
        </span>
        <div style="display: flex; gap: 4px;">
          ${t.status !== 'todo' ? `<button onclick="quickMoveTask('${t.id}', 'prev')" style="margin:0; padding: 4px 8px; font-size: 10px; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px solid var(--line); color: var(--muted); cursor: pointer; font-weight: bold; line-height: 1;">◀</button>` : ''}
          ${t.status !== 'done' ? `<button onclick="quickMoveTask('${t.id}', 'next')" style="margin:0; padding: 4px 8px; font-size: 10px; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px solid var(--line); color: var(--muted); cursor: pointer; font-weight: bold; line-height: 1;">▶</button>` : ''}
        </div>
      </div>
    `;

    if (t.status === "todo") todoList.appendChild(card);
    else if (t.status === "progress") progressList.appendChild(card);
    else if (t.status === "done") doneList.appendChild(card);
  });
}

function deleteTask(taskId) {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const migrated = migrateTasks(tasks);
  const updated = migrated.filter(t => t.id !== taskId);
  localStorage.setItem("tasks", JSON.stringify(updated));
  renderTasks();
  renderStreaksAndBadges();
}

function quickMoveTask(taskId, direction) {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const migrated = migrateTasks(tasks);
  const task = migrated.find(t => t.id === taskId);
  if (task) {
    const states = ["todo", "progress", "done"];
    let currIdx = states.indexOf(task.status);
    if (direction === "next" && currIdx < 2) {
      task.status = states[currIdx + 1];
    } else if (direction === "prev" && currIdx > 0) {
      task.status = states[currIdx - 1];
    }
    task.done = task.status === "done";
    
    localStorage.setItem("tasks", JSON.stringify(migrated));
    syncTasksToApi();
    renderTasks();
    renderStreaksAndBadges();
  }
}

function allowDrop(e) {
  e.preventDefault();
}

function drag(e, taskId) {
  e.dataTransfer.setData("text/plain", taskId);
  e.target.style.opacity = "0.5";
}

function dragEnd(e) {
  e.target.style.opacity = "1";
}

function dragEnter(e) {
  e.preventDefault();
  const list = e.currentTarget;
  if (list && list.classList.contains("kanban-list")) {
    list.classList.add("drag-over");
  }
}

function dragLeave(e) {
  const list = e.currentTarget;
  if (list && list.classList.contains("kanban-list")) {
    list.classList.remove("drag-over");
  }
}

function drop(e, targetStatus) {
  e.preventDefault();
  const list = e.currentTarget;
  if (list) {
    list.classList.remove("drag-over");
  }
  const taskId = e.dataTransfer.getData("text/plain");
  moveTask(taskId, targetStatus);
}

function moveTask(taskId, targetStatus) {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const migrated = migrateTasks(tasks);
  const task = migrated.find(t => t.id === taskId);
  if (task) {
    task.status = targetStatus;
    task.done = targetStatus === "done";
    localStorage.setItem("tasks", JSON.stringify(migrated));
    syncTasksToApi();
    renderTasks();
    renderStreaksAndBadges();
  }
}

function renderProgress() {
  const goals = JSON.parse(localStorage.getItem("goals")) || {
    sleep: 8, exercise: 60, water: 3, screen: 6
  };
  const entry = JSON.parse(localStorage.getItem("entry-" + todayKey())) || {};
  const customGoals = JSON.parse(localStorage.getItem("customGoals") || "[]");

  const s = goals.sleep > 0 ? Math.min(((entry.sleep || 0) / goals.sleep) * 100, 100) : 0;
  const e = goals.exercise > 0 ? Math.min(((entry.exercise || 0) / goals.exercise) * 100, 100) : 0;
  const w = goals.water > 0 ? Math.min(((entry.water || 0) / goals.water) * 100, 100) : 0;
  const sc = goals.screen > 0 ? ((entry.screen || 0) / goals.screen) * 100 : 0;

  sleepBar.style.width = s + "%";
  exerciseBar.style.width = e + "%";
  waterBar.style.width = w + "%";
  screenBar.style.width = Math.min(sc, 100) + "%";

  if (sc > 100) {
    screenBar.style.background = "linear-gradient(90deg, var(--danger), #f87171)";
  } else {
    screenBar.style.background = "linear-gradient(90deg, #f59e0b, #f97316)";
  }

  sleepText.textContent = Math.round(s) + "%";
  exerciseText.textContent = Math.round(e) + "%";
  waterText.textContent = Math.round(w) + "%";
  screenText.textContent = Math.round(sc) + "%";

  // Render custom progress bars
  let customBarsHtml = "";
  let customOverallSum = s + e + w + (sc > 100 ? 100 : sc);
  let count = 4;

  customGoals.forEach(g => {
    const val = entry[g.id] || 0;
    const target = g.target;
    const pct = target > 0 ? (val / target) * 100 : 0;
    const widthPct = Math.min(pct, 100);

    if (!g.isLimit) {
      customOverallSum += Math.min(pct, 100);
      count++;
    }

    const barColorStyle = g.isLimit && pct > 100
      ? 'style="background: linear-gradient(90deg, var(--danger), #f87171); width: 100%;"'
      : `style="width: ${widthPct}%;"`;

    customBarsHtml += `
      <div class="progress-wrap">
        <div class="progress-label"><span>${g.name}</span><span>${Math.round(pct)}%</span></div>
        <div class="progress">
          <div class="bar ${g.isLimit ? 'warn' : ''}" ${barColorStyle}></div>
        </div>
      </div>
    `;
  });

  customProgressBars.innerHTML = customBarsHtml;

  const overall = Math.round(customOverallSum / count);
  overallBar.style.width = overall + "%";
  overallText.textContent = overall + "%";
}

function renderSummary() {
  const entry = JSON.parse(localStorage.getItem("entry-" + todayKey())) || null;
  const notesText = localStorage.getItem("notes-" + todayKey()) || "";
  const customGoals = JSON.parse(localStorage.getItem("customGoals") || "[]");

  let html = "";
  if (entry) {
    html += `<strong>Activity Log:</strong><br>`;
    html += `• Sleep: ${entry.sleep}h<br>`;
    html += `• Exercise: ${entry.exercise} min<br>`;
    html += `• Water: ${entry.water}L<br>`;
    html += `• Screen Time: ${entry.screen || 0}h<br>`;
    
    customGoals.forEach(g => {
      html += `• ${g.name}: ${entry[g.id] || 0} ${g.unit}<br>`;
    });
    
    html += `• Mood: ${entry.mood}<br><br>`;
  } else {
    html += `<em>No habits logged yet today.</em><br><br>`;
  }

  html += `<strong>Notes:</strong><br>${notesText.replace(/\n/g, "<br>") || "<em>None</em>"}`;
  summary.innerHTML = html;
}

function renderTrends() {
  const dates = [];
  const labels = [];
  const sleepData = [];
  const exerciseData = [];
  const waterData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    
    dates.push(key);
    labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));

    const entry = JSON.parse(localStorage.getItem("entry-" + key)) || {};
    sleepData.push(entry.sleep || 0);
    exerciseData.push(entry.exercise || 0);
    waterData.push(entry.water || 0);
  }

  drawSVGChart("sleepChart", sleepData, labels, "var(--accent)");
  drawSVGChart("exerciseChart", exerciseData, labels, "var(--accent-2)");
  drawSVGChart("waterChart", waterData, labels, "var(--muted)");
}

drawSVGChart = function(containerId, data, labels, color) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const width = 280;
  const height = 140;
  const padding = 25;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data, 1);
  
  let barsHtml = "";
  data.forEach((val, i) => {
    const pct = val / maxVal;
    const barHeight = pct * chartHeight;
    const x = padding + i * (chartWidth / data.length) + (chartWidth / data.length - 14) / 2;
    const y = height - padding - barHeight;
    const barWidth = 14;

    barsHtml += `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(barHeight, 2)}" rx="4" fill="${color}" opacity="0.85">
          <title>${val}</title>
        </rect>
        <text x="${x + barWidth/2}" y="${y - 6}" text-anchor="middle" font-size="9" fill="var(--text)" font-weight="bold">${val % 1 === 0 ? val : val.toFixed(1)}</text>
        <text x="${x + barWidth/2}" y="${height - 8}" text-anchor="middle" font-size="9" fill="var(--muted)">${labels[i]}</text>
      </g>
    `;
  });

  let linesHtml = "";
  const gridCount = 3;
  for (let i = 0; i <= gridCount; i++) {
    const y = padding + (chartHeight / gridCount) * i;
    linesHtml += `
      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--line)" stroke-dasharray="3,3" stroke-width="0.5" />
    `;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; overflow: visible;">
      ${linesHtml}
      ${barsHtml}
    </svg>
  `;
}

function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === "goals" || key === "tasks" || key === "theme" || key === "customGoals" || key === "pomo_durations" || key.startsWith("entry-") || key.startsWith("notes-")) {
      data[key] = localStorage.getItem(key);
    }
  }
  
  const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", `daily_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object') throw new Error("Invalid format");
      
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === "goals" || key === "tasks" || key === "theme" || key === "customGoals" || key === "pomo_durations" || key.startsWith("entry-") || key.startsWith("notes-")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      for (const [key, val] of Object.entries(data)) {
        localStorage.setItem(key, val);
      }
      
      initTheme();
      loadData();
      alert("Data successfully imported!");
    } catch (err) {
      alert("Error importing data: " + err.message);
    }
  };
  reader.readAsText(file);
}

let currentNavDate = new Date();

function getDayProgress(dateKey) {
  const entry = JSON.parse(localStorage.getItem("entry-" + dateKey));
  if (!entry) return null;
  const goals = JSON.parse(localStorage.getItem("goals")) || { sleep: 8, exercise: 60, water: 3, screen: 6 };
  const customGoals = JSON.parse(localStorage.getItem("customGoals") || "[]");

  const s = goals.sleep > 0 ? Math.min(((entry.sleep || 0) / goals.sleep) * 100, 100) : 0;
  const e = goals.exercise > 0 ? Math.min(((entry.exercise || 0) / goals.exercise) * 100, 100) : 0;
  const w = goals.water > 0 ? Math.min(((entry.water || 0) / goals.water) * 100, 100) : 0;
  const sc = goals.screen > 0 ? ((entry.screen || 0) / goals.screen) * 100 : 0;

  let sum = s + e + w + (sc > 100 ? 100 : sc);
  let count = 4;

  customGoals.forEach(g => {
    const val = entry[g.id] || 0;
    const target = g.target;
    const pct = target > 0 ? (val / target) * 100 : 0;
    if (!g.isLimit) {
      sum += Math.min(pct, 100);
      count++;
    }
  });

  return Math.round(sum / count);
}

function renderCalendar() {
  const year = currentNavDate.getFullYear();
  const month = currentNavDate.getMonth();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const todayStr = todayKey();
  
  let gridHtml = "";
  for (let i = 0; i < firstDayIndex; i++) {
    gridHtml += `<div style="height: 32px;"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const progress = getDayProgress(dateKey);
    
    let cellStyle = "display:flex; align-items:center; justify-content:center; height:32px; border-radius:8px; cursor:pointer; font-size:12px; transition:0.2s ease; border: 1px solid transparent; position: relative;";
    const hoverEffect = `onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"`;
    
    if (progress !== null) {
      if (progress >= 80) {
        cellStyle += " background: rgba(34, 197, 94, 0.18); border-color: rgba(34, 197, 94, 0.4); color: #4ade80;";
      } else if (progress >= 50) {
        cellStyle += " background: rgba(245, 158, 11, 0.18); border-color: rgba(245, 158, 11, 0.4); color: #fbbf24;";
      } else {
        cellStyle += " background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.4); color: #f87171;";
      }
    } else {
      cellStyle += " background: rgba(255, 255, 255, 0.03); color: var(--muted);";
    }

    if (dateKey === todayStr) {
      cellStyle += " outline: 2px solid var(--accent); outline-offset: -2px;";
    }

    gridHtml += `<div style="${cellStyle}" ${hoverEffect} onclick="showDayDetails('${dateKey}')" title="${progress !== null ? 'Progress: ' + progress + '%' : 'No Entry'}">${d}</div>`;
  }
  
  calendarGrid.innerHTML = gridHtml;
}

function prevMonth() {
  currentNavDate.setMonth(currentNavDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentNavDate.setMonth(currentNavDate.getMonth() + 1);
  renderCalendar();
}

function showDayDetails(dateKey) {
  const entry = JSON.parse(localStorage.getItem("entry-" + dateKey));
  const notesText = localStorage.getItem("notes-" + dateKey) || "";
  const customGoals = JSON.parse(localStorage.getItem("customGoals") || "[]");
  
  const detailsContainer = document.getElementById("calendarDetails");
  const content = document.getElementById("calendarDetailsContent");
  
  if (!entry && !notesText) {
    content.innerHTML = `No tracking data logged for ${dateKey}.`;
    detailsContainer.style.display = "block";
    return;
  }

  let html = `<strong>Date:</strong> ${dateKey}<br>`;
  if (entry) {
    html += `<strong>Mood:</strong> ${entry.mood}<br>`;
    html += `• Sleep: ${entry.sleep}h<br>`;
    html += `• Exercise: ${entry.exercise} min<br>`;
    html += `• Water: ${entry.water}L<br>`;
    html += `• Screen Time: ${entry.screen || 0}h<br>`;
    customGoals.forEach(g => {
      if (entry[g.id] !== undefined) {
        html += `• ${g.name}: ${entry[g.id]} ${g.unit}<br>`;
      }
    });
    html += `<br>`;
  }
  
  html += `<strong>Notes:</strong><br>${notesText.replace(/\n/g, "<br>") || "<em>None</em>"}`;
  content.innerHTML = html;
  detailsContainer.style.display = "block";
}

let pomoInterval = null;
let pomoMode = "work";
let pomoActive = false;
let pomoAlarmInterval = null;

// Ambient Audio Variables
let ambientAudioCtx = null;
let ambientSourceNode = null;
let ambientGainNode = null;
let ambientOscillators = [];
let ambientFilterNode = null;
let ambientLfoNode = null;
let ambientLfoGain = null;
let ambientVolume = 0.5;
let preMuteVolume = 0.5;
let ambientAudioElement = null;

const savedDurations = JSON.parse(localStorage.getItem("pomo_durations")) || {
  work: 25,
  short: 5,
  long: 15,
  alarm: "chime"
};

const pomoDurations = {
  work: savedDurations.work * 60,
  short: savedDurations.short * 60,
  long: savedDurations.long * 60
};

let pomoTimeLeft = pomoDurations[pomoMode];

function togglePomoSettings() {
  const panel = document.getElementById("pomoSettings");
  if (panel.style.display === "none") {
    panel.style.display = "flex";
  } else {
    panel.style.display = "none";
  }
}

function savePomoSettings() {
  const workVal = +pomoWorkInput.value || 25;
  const shortVal = +pomoShortInput.value || 5;
  const longVal = +pomoLongInput.value || 15;
  const alarmVal = pomoAlarmSelect.value || "chime";

  if (workVal < 1 || shortVal < 1 || longVal < 1) {
    return alert("Durations must be at least 1 minute.");
  }

  const newDurations = { work: workVal, short: shortVal, long: longVal, alarm: alarmVal };
  localStorage.setItem("pomo_durations", JSON.stringify(newDurations));

  pomoDurations.work = workVal * 60;
  pomoDurations.short = shortVal * 60;
  pomoDurations.long = longVal * 60;

  resetPomo();
  togglePomoSettings();
  alert("Focus Timer settings saved successfully!");
}

function initPomoSettings() {
  const saved = JSON.parse(localStorage.getItem("pomo_durations")) || { work: 25, short: 5, long: 15, alarm: "chime" };
  pomoWorkInput.value = saved.work;
  pomoShortInput.value = saved.short;
  pomoLongInput.value = saved.long;
  pomoAlarmSelect.value = saved.alarm || "chime";
  
  pomoTimeLeft = pomoDurations[pomoMode];
  updatePomoDisplay();
}

function setPomoMode(mode) {
  if (pomoActive) togglePomo();
  pomoMode = mode;
  pomoTimeLeft = pomoDurations[mode];
  
  const btnMap = { work: pomoWorkBtn, short: pomoShortBtn, long: pomoLongBtn };
  Object.keys(btnMap).forEach(k => {
    if (k === mode) {
      btnMap[k].style.background = "rgba(56,189,248,0.1)";
      btnMap[k].style.borderColor = "var(--accent)";
      btnMap[k].style.color = "var(--accent)";
    } else {
      btnMap[k].style.background = "";
      btnMap[k].style.borderColor = "";
      btnMap[k].style.color = "";
    }
  });

  const labelMap = { work: "Work Session", short: "Short Break", long: "Long Break" };
  pomoLabel.textContent = labelMap[mode];
  updatePomoDisplay();
}

function updatePomoDisplay() {
  const mins = Math.floor(pomoTimeLeft / 60);
  const secs = pomoTimeLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  if (pomoTime) pomoTime.textContent = formatted;

  const loungeTime = document.getElementById("loungePomoTime");
  if (loungeTime) loungeTime.textContent = formatted;
}

function updateVisualizerState(isPlaying) {
  const vis = document.getElementById("pomoVisualizer");
  if (!vis) return;
  
  const type = pomoAmbientSelect.value;
  if (isPlaying && type !== "none") {
    vis.style.display = "flex";
    const bars = vis.querySelectorAll(".vis-bar");
    bars.forEach(bar => {
      bar.style.animationPlayState = "running";
    });
  } else {
    const bars = vis.querySelectorAll(".vis-bar");
    bars.forEach(bar => {
      bar.style.animationPlayState = "paused";
    });
    vis.style.display = "none";
  }
}

function initAmbientAudio() {
  if (!ambientAudioCtx) {
    ambientAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    ambientGainNode = ambientAudioCtx.createGain();
    ambientGainNode.gain.value = ambientVolume;
    ambientGainNode.connect(ambientAudioCtx.destination);
  }
  if (ambientAudioCtx.state === "suspended") {
    ambientAudioCtx.resume();
  }
}

function createNoiseBuffer(ctx, type) {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "brown") {
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

function startAmbient() {
  stopAmbient();
  
  const type = pomoAmbientSelect.value;
  if (type === "none" || !pomoActive) {
    updateVisualizerState(false);
    return;
  }

  initAmbientAudio();
  updateVisualizerState(true);

  try {
    if (type === "rain" || type === "wind" || type === "drone") {
      const audioFileMap = {
        rain: "Rain-and-storm-2(chosic.com).mp3",
        wind: "nikitralala__frogs-and-birds(chosic.com).mp3",
        drone: "On-My-Way-Lofi-Study-Music(chosic.com).mp3"
      };
      const targetSrc = audioFileMap[type];

      if (!ambientAudioElement) {
        ambientAudioElement = new Audio(targetSrc);
        ambientAudioElement.loop = true;
      } else {
        if (!ambientAudioElement.src.includes(encodeURI(targetSrc))) {
          ambientAudioElement.pause();
          ambientAudioElement.src = targetSrc;
        }
      }
      ambientAudioElement.volume = ambientVolume;
      ambientAudioElement.play().catch(err => console.error(`${type} audio play error:`, err));
    }
  } catch (err) {
    console.error("Ambient audio play failed", err);
  }
}

function stopAmbient() {
  updateVisualizerState(false);

  if (ambientAudioElement) {
    ambientAudioElement.pause();
    ambientAudioElement.currentTime = 0;
  }

  if (ambientOscillators && ambientOscillators.length > 0) {
    ambientOscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    ambientOscillators = [];
  }

  if (ambientSourceNode) {
    try { ambientSourceNode.stop(); } catch(e) {}
    ambientSourceNode = null;
  }

  if (ambientLfoNode) {
    try { ambientLfoNode.stop(); } catch(e) {}
    ambientLfoNode = null;
  }

  ambientFilterNode = null;
  ambientLfoGain = null;
}

function changeAmbientSound(type) {
  if (pomoActive) {
    startAmbient();
  } else {
    stopAmbient();
  }
}

function toggleAmbientMute() {
  if (ambientVolume > 0) {
    preMuteVolume = ambientVolume;
    ambientVolume = 0;
  } else {
    ambientVolume = preMuteVolume || 0.5;
  }
  const slider = document.getElementById("pomoAmbientVolume");
  if (slider) slider.value = ambientVolume;
  changeAmbientVolume(ambientVolume);
}

function changeAmbientVolume(val) {
  ambientVolume = parseFloat(val);
  
  if (ambientGainNode) {
    try {
      ambientGainNode.gain.setValueAtTime(ambientVolume, ambientAudioCtx ? ambientAudioCtx.currentTime : 0);
    } catch(e) {
      ambientGainNode.gain.value = ambientVolume;
    }
  }

  if (ambientAudioElement) {
    ambientAudioElement.volume = ambientVolume;
  }

  const volBtn = document.getElementById("pomoVolumeBtn");
  if (volBtn) {
    if (ambientVolume === 0) {
      volBtn.textContent = "🔇";
    } else if (ambientVolume < 0.4) {
      volBtn.textContent = "🔉";
    } else {
      volBtn.textContent = "🔊";
    }
  }

  const volText = document.getElementById("pomoVolumeText");
  if (volText) {
    volText.textContent = `${Math.round(ambientVolume * 100)}%`;
  }
}

function togglePomo() {
  const loungeStartBtn = document.getElementById("loungeStartBtn");

  if (pomoActive) {
    clearInterval(pomoInterval);
    pomoStartBtn.textContent = "Start";
    pomoStartBtn.className = "primary";
    if (loungeStartBtn) {
      loungeStartBtn.textContent = "Start Focus";
      loungeStartBtn.className = "primary";
    }
    pomoActive = false;
    stopAmbient();
  } else {
    pomoActive = true;
    pomoStartBtn.textContent = "Pause";
    pomoStartBtn.className = "secondary";
    if (loungeStartBtn) {
      loungeStartBtn.textContent = "Pause Focus";
      loungeStartBtn.className = "secondary";
    }
    startAmbient();
    pomoInterval = setInterval(() => {
      pomoTimeLeft--;
      updatePomoDisplay();
      
      if (pomoTimeLeft <= 0) {
        clearInterval(pomoInterval);
        pomoActive = false;
        pomoStartBtn.textContent = "Start";
        pomoStartBtn.className = "primary";
        if (loungeStartBtn) {
          loungeStartBtn.textContent = "Start Focus";
          loungeStartBtn.className = "primary";
        }
        stopAmbient();
        
        showPomoModal();
      }
    }, 1000);
  }
}

function resetPomo() {
  if (pomoActive) togglePomo();
  pomoTimeLeft = pomoDurations[pomoMode];
  updatePomoDisplay();
}

function showPomoModal() {
  const modal = document.getElementById("pomoModal");
  const modalIcon = document.getElementById("pomoModalIcon");
  const modalTitle = document.getElementById("pomoModalTitle");
  const modalText = document.getElementById("pomoModalText");

  if (pomoMode === "work") {
    modalIcon.textContent = "🎉";
    modalTitle.textContent = "Focus Session Completed!";
    modalText.textContent = "Excellent work! You've successfully finished your focus session. Time to reward yourself with a nice break.";
  } else {
    modalIcon.textContent = "💪";
    modalTitle.textContent = "Break Completed!";
    modalText.textContent = "Hope you are refreshed! Time to get back to work and crush your goals.";
  }

  modal.style.display = "flex";
  startAlarmLoop();
}

function dismissPomoModal() {
  stopAlarmLoop();
  document.getElementById("pomoModal").style.display = "none";
  
  if (pomoMode === "work") {
    setPomoMode("short");
  } else {
    setPomoMode("work");
  }
}

function playPomoAlarm() {
  const saved = JSON.parse(localStorage.getItem("pomo_durations")) || {};
  const selectedAlarm = saved.alarm || "chime";
  if (selectedAlarm === "silent") return;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    const playTone = (freq, type, startTime, duration, startGain = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(startGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    if (selectedAlarm === "chime") {
      playTone(523.25, "sine", ctx.currentTime, 0.4);
      playTone(659.25, "sine", ctx.currentTime + 0.15, 0.4);
      playTone(783.99, "sine", ctx.currentTime + 0.3, 0.6);
    } else if (selectedAlarm === "digital") {
      playTone(880, "square", ctx.currentTime, 0.1, 0.15);
      playTone(880, "square", ctx.currentTime + 0.15, 0.1, 0.15);
      playTone(880, "square", ctx.currentTime + 0.3, 0.1, 0.15);
    } else if (selectedAlarm === "retro") {
      const duration = 0.8;
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const timeOffset = (duration / steps) * i;
        const freq = i % 2 === 0 ? 987.77 : 880.00;
        playTone(freq, "triangle", ctx.currentTime + timeOffset, 0.08, 0.2);
      }
    } else if (selectedAlarm === "melody") {
      playTone(523.25, "sine", ctx.currentTime, 0.25, 0.2);
      playTone(659.25, "sine", ctx.currentTime + 0.15, 0.25, 0.2);
      playTone(783.99, "sine", ctx.currentTime + 0.3, 0.25, 0.2);
      playTone(1046.50, "sine", ctx.currentTime + 0.45, 0.5, 0.25);
    }
  } catch (err) {
    console.error("Audio fail", err);
  }
}

function startAlarmLoop() {
  stopAlarmLoop();
  playPomoAlarm();
  pomoAlarmInterval = setInterval(playPomoAlarm, 2500);
}

function stopAlarmLoop() {
  if (pomoAlarmInterval) {
    clearInterval(pomoAlarmInterval);
    pomoAlarmInterval = null;
  }
}

function renderMoodChart() {
  const moodCounts = { Great: 0, Good: 0, Okay: 0, Tired: 0, Stressed: 0 };
  let total = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("entry-")) {
      const entry = JSON.parse(localStorage.getItem(key));
      if (entry && entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        total++;
      }
    }
  }

  const container = document.getElementById("moodChartDisplay");
  if (!container) return;

  if (total === 0) {
    container.innerHTML = `<em class="small" style="color: var(--muted); text-align:center; display:block; padding: 20px 0;">No logs found yet. Log entries to see mood trends!</em>`;
    return;
  }

  const R = 35;
  const C = 2 * Math.PI * R;
  let accumulatedPercent = 0;
  let svgCircles = "";

  const moodColors = {
    Great: "var(--accent-2)",
    Good: "var(--accent)",
    Okay: "var(--muted)",
    Tired: "#f59e0b",
    Stressed: "var(--danger)"
  };

  for (const [moodName, count] of Object.entries(moodCounts)) {
    if (count === 0) continue;
    const pct = count / total;
    const dashArray = `${pct * C} ${C}`;
    const dashOffset = `${-accumulatedPercent * C}`;
    
    svgCircles += `
      <circle cx="60" cy="60" r="${R}" 
        fill="transparent" 
        stroke="${moodColors[moodName]}" 
        stroke-width="12" 
        stroke-dasharray="${dashArray}" 
        stroke-dashoffset="${dashOffset}" 
        transform="rotate(-90 60 60)"
        style="transition: stroke-dasharray 0.5s ease;">
        <title>${moodName}: ${count} (${Math.round(pct * 100)}%)</title>
      </circle>
    `;
    accumulatedPercent += pct;
  }

  const legendHtml = Object.entries(moodCounts).map(([moodName, count]) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-top:4px;">
        <span style="display:flex; align-items:center; gap:6px;">
          <span style="width:10px; height:10px; border-radius:50%; background:${moodColors[moodName]};"></span>
          <span>${moodName}</span>
        </span>
        <span style="font-weight:600; color:var(--text);">${count} (${Math.round(pct)}%)</span>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap; margin-top: 10px;">
      <div style="flex:1; display:flex; justify-content:center;">
        <svg viewBox="0 0 120 120" style="width:120px; height:120px; overflow:visible;">
          <text x="60" y="62" text-anchor="middle" font-size="11" fill="var(--text)" font-weight="bold">${total}</text>
          <text x="60" y="74" text-anchor="middle" font-size="8" fill="var(--muted)">Logs</text>
          ${svgCircles}
        </svg>
      </div>
      <div style="flex:1.2; min-width:140px; display:flex; flex-direction:column; gap:4px;">
        ${legendHtml}
      </div>
    </div>
  `;
}

function calculateCurrentStreak() {
  let streak = 0;
  let checkDate = new Date();
  const todayStr = todayKey();
  const todayEntry = JSON.parse(localStorage.getItem("entry-" + todayStr));
  
  if (!todayEntry) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  while (true) {
    const dateKey = getLocalDateString(checkDate);
    const progress = getDayProgress(dateKey);
    if (progress !== null && progress >= 80) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getLocalDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderStreaksAndBadges() {
  const streak = calculateCurrentStreak();
  
  const badges = [
    { id: "streak7", name: "Consistency King", desc: "Reach a 7-day streak of 80%+", icon: "👑", unlocked: streak >= 7 },
    { id: "streak14", name: "Consistency Titan", desc: "Reach a 14-day streak of 80%+", icon: "🔱", unlocked: streak >= 14 },
    { id: "streak30", name: "Consistency Legend", desc: "Reach a 30-day streak of 80%+", icon: "🔥", unlocked: streak >= 30 },
    { id: "sleep3", name: "Sleep Champion", desc: "Sleep 8+ hours for 3 consecutive days", icon: "🛌", unlocked: checkConsecutiveHabit("sleep", 8, 3) },
    { id: "water3", name: "Water Warrior", desc: "Drink 3+ Liters of water for 3 consecutive days", icon: "💧", unlocked: checkConsecutiveHabit("water", 3, 3) },
    { id: "tasks5", name: "Task Conqueror", desc: "Complete 5 or more daily tasks", icon: "🎯", unlocked: checkCompletedTasksCount(5) }
  ];

  const previouslyUnlocked = JSON.parse(localStorage.getItem("unlocked_badges") || "[]");
  const newlyUnlocked = [];

  badges.forEach(b => {
    if (b.unlocked && !previouslyUnlocked.includes(b.id)) {
      newlyUnlocked.push(b);
      previouslyUnlocked.push(b.id);
    }
  });

  if (newlyUnlocked.length > 0) {
    localStorage.setItem("unlocked_badges", JSON.stringify(previouslyUnlocked));
    triggerBadgeCelebration(newlyUnlocked[0]);
  }

  const streakContainer = document.getElementById("streakDisplay");
  if (streakContainer) {
    streakContainer.innerHTML = streak > 0 
      ? `<span style="font-size: 22px; font-weight: 800; color: #f59e0b;">🔥 ${streak}-Day Streak!</span>`
      : `<span style="font-size: 14px; color: var(--muted);">No active streak. Complete 80%+ goals to start a streak!</span>`;
  }

  const badgesContainer = document.getElementById("badgesDisplay");
  if (badgesContainer) {
    badgesContainer.innerHTML = badges.map(b => {
      const opacity = b.unlocked ? "1" : "0.25";
      const filter = b.unlocked ? "none" : "grayscale(100%)";
      const border = b.unlocked ? "border-color: var(--accent);" : "border-color: var(--line);";
      const shadow = b.unlocked ? "box-shadow: 0 0 10px rgba(56,189,248,0.25);" : "";
      const badgeStyle = `display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:12px 8px; border-radius:14px; border:1px solid; background:rgba(255,255,255,0.02); flex:1; min-width:110px; opacity:${opacity}; filter:${filter}; ${border} ${shadow} transition: 0.3s ease;`;
      
      return `
        <div style="${badgeStyle}" title="${b.desc}">
          <span style="font-size: 32px; margin-bottom: 6px;">${b.icon}</span>
          <strong style="font-size: 12px; display:block; color: var(--text);">${b.name}</strong>
          <span style="font-size: 9px; color: var(--muted); margin-top: 4px; display:block; line-height:1.2;">${b.desc}</span>
        </div>
      `;
    }).join("");
  }
}

function checkConsecutiveHabit(field, threshold, daysCount) {
  let consec = 0;
  const d = new Date();
  for (let i = 0; i < daysCount + 2; i++) {
    const dateKey = getLocalDateString(d);
    const entry = JSON.parse(localStorage.getItem("entry-" + dateKey));
    if (entry && (entry[field] || 0) >= threshold) {
      consec++;
      if (consec >= daysCount) return true;
    } else {
      consec = 0;
    }
    d.setDate(d.getDate() - 1);
  }
  return false;
}

function checkCompletedTasksCount(target) {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  return tasks.filter(t => t.done).length >= target;
}

let isRegisterMode = false;

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  isRegisterMode = !isRegisterMode;
  updateAuthUI();
}

function updateAuthUI() {
  const emailContainer = document.getElementById("loginEmailContainer");
  const userLabel = document.querySelector("label[for='loginUser']");
  const loginBtn = document.querySelector("#loginScreen button.primary");
  const toggleText = document.getElementById("authToggleText");
  const toggleLink = document.getElementById("authToggleLink");

  if (isRegisterMode) {
    loginTitle.textContent = "Create Account";
    loginSubtitle.textContent = "Set a local username, email, and password to secure your dashboard.";
    if (loginBtn) loginBtn.textContent = "Create Account";
    if (emailContainer) emailContainer.style.display = "block";
    if (userLabel) userLabel.textContent = "Username";
    loginUser.placeholder = "Enter username";
    if (toggleText) toggleText.textContent = "Already have an account? ";
    if (toggleLink) toggleLink.textContent = "Sign In";
  } else {
    loginTitle.textContent = "Welcome Back";
    loginSubtitle.textContent = "Sign in to access your tracking history.";
    if (loginBtn) loginBtn.textContent = "Sign In";
    if (emailContainer) emailContainer.style.display = "none";
    if (userLabel) userLabel.textContent = "Username or Email";
    loginUser.placeholder = "Enter username or email";
    if (toggleText) toggleText.textContent = "New to Daily Tracker? ";
    if (toggleLink) toggleLink.textContent = "Create an account";
  }
}

async function checkAuth() {
  const loggedIn = sessionStorage.getItem("auth_loggedIn");
  const token = localStorage.getItem("auth_token");

  if (loggedIn === "true") {
    loginScreen.style.display = "none";
    dashboardApp.style.display = "block";
    initTheme();
    loadData();

    if (token) {
      syncCloudData();
    }
  } else {
    loginScreen.style.display = "flex";
    dashboardApp.style.display = "none";
    initTheme();

    const savedUser = localStorage.getItem("auth_username");
    if (!savedUser) {
      isRegisterMode = true;
    } else {
      isRegisterMode = false;
    }
    updateAuthUI();
  }
}

async function handleAuth() {
  const usernameInput = loginUser.value.trim();
  const passwordInput = loginPass.value.trim();
  
  const emailInputEl = document.getElementById("loginEmail");
  const emailInput = emailInputEl ? emailInputEl.value.trim() : "";

  if (!usernameInput || !passwordInput) {
    return alert("Please enter both username/email and password.");
  }

  if (isRegisterMode) {
    if (!emailInput) {
      return alert("Please enter an email address to create your account.");
    }

    try {
      const res = await apiFetch("/api/auth/register", "POST", {
        username: usernameInput,
        email: emailInput,
        password: passwordInput
      });
      if (res && res.token) {
        localStorage.setItem("auth_token", res.token);
        localStorage.setItem("auth_username", res.user.username);
        if (res.user.email) localStorage.setItem("auth_email", res.user.email);
        localStorage.setItem("auth_password", passwordInput);
        sessionStorage.setItem("auth_loggedIn", "true");
        alert("Account created and synced to cloud successfully!");
      }
    } catch (err) {
      console.warn("Backend auth failed, falling back to local account creation:", err.message);
      localStorage.setItem("auth_username", usernameInput);
      localStorage.setItem("auth_email", emailInput);
      localStorage.setItem("auth_password", passwordInput);
      sessionStorage.setItem("auth_loggedIn", "true");
      alert("Account created locally!");
    }

    loginUser.value = "";
    loginPass.value = "";
    if (emailInputEl) emailInputEl.value = "";
    checkAuth();
  } else {
    try {
      const res = await apiFetch("/api/auth/login", "POST", {
        username: usernameInput,
        password: passwordInput
      });
      if (res && res.token) {
        localStorage.setItem("auth_token", res.token);
        localStorage.setItem("auth_username", res.user.username);
        if (res.user.email) localStorage.setItem("auth_email", res.user.email);
        localStorage.setItem("auth_password", passwordInput);
        sessionStorage.setItem("auth_loggedIn", "true");
      }
    } catch (err) {
      console.warn("Backend login failed, attempting local authentication:", err.message);
      const savedUser = localStorage.getItem("auth_username");
      const savedPass = localStorage.getItem("auth_password");
      const savedEmail = localStorage.getItem("auth_email");

      const isUserMatch = usernameInput === savedUser;
      const isEmailMatch = savedEmail && usernameInput === savedEmail;

      if ((isUserMatch || isEmailMatch) && passwordInput === savedPass) {
        sessionStorage.setItem("auth_loggedIn", "true");
      } else {
        return alert("Invalid username/email or password.");
      }
    }

    loginUser.value = "";
    loginPass.value = "";
    if (emailInputEl) emailInputEl.value = "";
    checkAuth();
  }
}

function logout() {
  sessionStorage.removeItem("auth_loggedIn");
  checkAuth();
}

function togglePasswordVisibility() {
  if (loginPass.type === "password") {
    loginPass.type = "text";
    togglePassEye.textContent = "🙈";
  } else {
    loginPass.type = "password";
    togglePassEye.textContent = "👁️";
  }
}

function getProgressForDate(dateStr) {
  return getDayProgress(dateStr) || 0;
}

function showGridTooltip(e, dateStr, pct, entry) {
  let tooltip = document.getElementById("gridTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "gridTooltip";
    tooltip.style.position = "absolute";
    tooltip.style.background = "rgba(17, 24, 39, 0.98)";
    tooltip.style.color = "var(--text)";
    tooltip.style.border = "1.5px solid var(--line)";
    tooltip.style.padding = "10px 14px";
    tooltip.style.borderRadius = "8px";
    tooltip.style.fontSize = "11px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "10000";
    tooltip.style.boxShadow = "var(--shadow)";
    tooltip.style.lineHeight = "1.4";
    tooltip.style.transition = "opacity 0.15s ease";
    document.body.appendChild(tooltip);
  }

  // Create date with timezone padding to avoid date shift
  const d = new Date(dateStr + "T00:00:00");
  const formattedDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  
  let html = `<strong style="color:var(--accent); font-size:12px; display:block; margin-bottom:4px;">${formattedDate}</strong>`;
  if (!entry) {
    html += `<span style="color:var(--muted);">No habits logged</span>`;
  } else {
    html += `<span style="font-weight:bold; display:block; margin-bottom:4px; color:var(--text);">${pct}% completed</span>`;
    html += `<span style="font-size:10px; color:var(--muted); display:block; border-top:1px solid rgba(255,255,255,0.06); padding-top:4px;">`;
    html += `• Sleep: ${entry.sleep || 0}h<br>`;
    html += `• Exercise: ${entry.exercise || 0}m<br>`;
    html += `• Water: ${entry.water || 0}L<br>`;
    html += `• Screen: ${entry.screen || 0}h`;
    
    const customGoals = JSON.parse(localStorage.getItem("customGoals") || "[]");
    customGoals.forEach(g => {
      const val = entry[g.id] || 0;
      html += `<br>• ${g.name}: ${val}${g.unit ? ' ' + g.unit : ''}`;
    });
    html += `</span>`;
  }

  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  tooltip.style.opacity = "1";
  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = (rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2) + "px";
  tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 8) + "px";
}

function hideGridTooltip() {
  const tooltip = document.getElementById("gridTooltip");
  if (tooltip) {
    tooltip.style.opacity = "0";
    setTimeout(() => {
      if (tooltip.style.opacity === "0") {
        tooltip.style.display = "none";
      }
    }, 150);
  }
}

function renderPixelGrid() {
  const grid = document.getElementById("pixelGrid");
  const monthRow = document.getElementById("monthLabelRow");
  if (!grid || !monthRow) return;

  grid.innerHTML = "";
  monthRow.innerHTML = "";

  // 1. Calculate the date list for the past 365 days
  const today = new Date();
  const dateList = [];
  
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    dateList.push(`${yr}-${mo}-${dy}`);
  }

  // 2. Pad the first column so Sunday alignment works
  const firstDate = new Date(dateList[0] + "T00:00:00");
  const padCount = firstDate.getDay(); // 0 is Sunday, 6 is Saturday
  for (let i = 0; i < padCount; i++) {
    const padCell = document.createElement("div");
    padCell.style.width = "10px";
    padCell.style.height = "10px";
    padCell.style.visibility = "hidden";
    grid.appendChild(padCell);
  }

  // 3. Render all 365 days
  let currentMonthStr = "";
  const cellWidth = 10;
  const cellGap = 3;
  const colWidth = cellWidth + cellGap;

  dateList.forEach((dateStr, index) => {
    const pct = getProgressForDate(dateStr);
    const entry = JSON.parse(localStorage.getItem("entry-" + dateStr));

    const cell = document.createElement("div");
    cell.className = "pixel-cell";
    
    // Choose pixel color level based on completion percentage
    let level = 0;
    if (pct > 0) {
      if (pct <= 25) level = 1;
      else if (pct <= 50) level = 2;
      else if (pct <= 75) level = 3;
      else level = 4;
    }
    cell.style.background = `var(--pixel-${level})`;

    // Attach events for custom premium tooltips
    cell.addEventListener("mouseenter", (e) => showGridTooltip(e, dateStr, pct, entry));
    cell.addEventListener("mouseleave", hideGridTooltip);

    grid.appendChild(cell);

    // 4. Place Month Label when month changes
    const d = new Date(dateStr + "T00:00:00");
    const monthName = d.toLocaleDateString(undefined, { month: "short" });
    if (monthName !== currentMonthStr) {
      currentMonthStr = monthName;
      const totalCells = index + padCount;
      const colIndex = Math.floor(totalCells / 7);
      
      const label = document.createElement("div");
      label.textContent = monthName;
      label.style.position = "absolute";
      label.style.left = (colIndex * colWidth) + "px";
      label.style.fontWeight = "600";
      monthRow.appendChild(label);
    }
  });
}

function openAccountModal() {
  const modal = document.getElementById("accountModal");
  if (!modal) return;
  
  // Pre-fill existing values
  document.getElementById("accUser").value = localStorage.getItem("auth_username") || "";
  document.getElementById("accEmail").value = localStorage.getItem("auth_email") || "";
  document.getElementById("accCurrentPass").value = "";
  document.getElementById("accNewPass").value = "";
  
  modal.style.display = "flex";
}

function closeAccountModal() {
  const modal = document.getElementById("accountModal");
  if (modal) modal.style.display = "none";
}

function saveAccountSettings() {
  const userVal = document.getElementById("accUser").value.trim();
  const emailVal = document.getElementById("accEmail").value.trim();
  const currentPassVal = document.getElementById("accCurrentPass").value.trim();
  const newPassVal = document.getElementById("accNewPass").value.trim();

  if (!userVal) {
    return alert("Username cannot be empty.");
  }

  const savedPass = localStorage.getItem("auth_password");
  if (currentPassVal !== savedPass) {
    return alert("Incorrect current password. Verification failed.");
  }

  // Update credentials
  localStorage.setItem("auth_username", userVal);
  if (emailVal) {
    localStorage.setItem("auth_email", emailVal);
  } else {
    localStorage.removeItem("auth_email");
  }

  if (newPassVal) {
    if (newPassVal.length < 4) {
      return alert("New password must be at least 4 characters long.");
    }
    localStorage.setItem("auth_password", newPassVal);
  }

  closeAccountModal();
  alert("Account settings updated successfully!");
}

function renderCoachInsights() {
  const wrapper = document.getElementById("coachInsightsWrapper");
  if (!wrapper) return;
  
  wrapper.innerHTML = "";

  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("entry-")) {
      const dateStr = key.replace("entry-", "");
      const entry = JSON.parse(localStorage.getItem(key));
      if (entry) {
        entries.push({ date: dateStr, ...entry });
      }
    }
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (entries.length < 2) {
    wrapper.innerHTML = `
      <div class="insight-card" style="grid-column: 1 / -1; justify-content: center; text-align: center; padding: 24px; border: 1px dashed rgba(56, 189, 248, 0.2); background: rgba(56, 189, 248, 0.01);">
        <div style="max-width: 500px; margin: 0 auto;">
          <div style="font-size: 36px; margin-bottom: 10px; animation: pulse 2s infinite;">📊</div>
          <h4 style="font-size: 15px; color: var(--accent); margin: 0 0 6px 0;">Insights are gathering...</h4>
          <p style="color: var(--muted); font-size: 12px; line-height: 1.5; margin: 0;">
            The wellness coach needs at least <strong>2 days of activity logs</strong> to analyze habits, calculate streaks, and generate coaching advice. Keep logging to unlock your insights!
          </p>
        </div>
      </div>
    `;
    return;
  }

  const insights = [];
  const goals = JSON.parse(localStorage.getItem("goals")) || { sleep: 8, exercise: 60, water: 3, screen: 6 };
  const last7Entries = entries.slice(-7);

  const makeCardHtml = (icon, title, desc) => `
    <div class="insight-card">
      <div class="insight-icon-wrapper">${icon}</div>
      <div class="insight-content">
        <h4>${title}</h4>
        <p>${desc}</p>
      </div>
    </div>
  `;

  // 1. Hydration Streak
  let waterStreak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if ((entries[i].water || 0) >= goals.water) {
      waterStreak++;
    } else {
      break;
    }
  }
  if (waterStreak >= 3) {
    insights.push(makeCardHtml(
      "💧",
      "Hydration Master",
      `You've met your daily water target of <strong>${goals.water}L</strong> for <strong>${waterStreak}</strong> consecutive days. Exceptional job keeping your hydration consistent!`
    ));
  } else if (waterStreak > 0) {
    insights.push(makeCardHtml(
      "💧",
      "Hydration Boost",
      `You met your water goal today! Drink <strong>${goals.water}L</strong> tomorrow to kickstart a hydration streak.`
    ));
  }

  // 2. Sleep Quality & Debt
  const totalSleep = last7Entries.reduce((sum, e) => sum + (e.sleep || 0), 0);
  const avgSleep = totalSleep / last7Entries.length;
  if (avgSleep < 6.5) {
    insights.push(makeCardHtml(
      "😴",
      "Sleep Debt Warning",
      `Your rolling sleep average is only <strong>${avgSleep.toFixed(1)}h</strong> (Goal: ${goals.sleep}h). Accumulating sleep debt impacts memory, focus, and emotional resilience. Aim for 7.5h tonight.`
    ));
  } else if (avgSleep >= 7.5) {
    insights.push(makeCardHtml(
      "✨",
      "Sleep Champion",
      `You are averaging a stellar <strong>${avgSleep.toFixed(1)}h</strong> of sleep! Keeping a stable sleep routine is the absolute foundation of physical recovery.`
    ));
  }

  // 3. Exercise Vitality
  const activeDays = last7Entries.filter(e => (e.exercise || 0) > 0).length;
  if (activeDays >= 4) {
    insights.push(makeCardHtml(
      "🏃‍♂️",
      "High Vitality",
      `You logged workouts on <strong>${activeDays} of the last 7 days</strong>! Regular physical activity significantly increases longevity and cognitive stamina.`
    ));
  } else if (activeDays === 0) {
    insights.push(makeCardHtml(
      "🌱",
      "Gentle Activity Reminder",
      `You haven't logged any physical workouts this past week. Even a simple 15-minute walk outside helps lower stress levels and boots endorphins.`
    ));
  }

  // 4. Screen Time Check
  const totalScreen = last7Entries.reduce((sum, e) => sum + (e.screen || 0), 0);
  const avgScreen = totalScreen / last7Entries.length;
  if (avgScreen > goals.screen) {
    insights.push(makeCardHtml(
      "📱",
      "Screen Time Warning",
      `Your rolling screen time averages <strong>${avgScreen.toFixed(1)}h</strong>, exceeding your daily limit of ${goals.screen}h. Consider setting an evening screen curfew to improve deep sleep.`
    ));
  }

  // 5. Sleep-Mood Correlation
  const lowSleepEntries = entries.filter(e => (e.sleep || 0) < 6.5);
  if (lowSleepEntries.length >= 2) {
    const poorMoodCount = lowSleepEntries.filter(e => e.mood === "Tired" || e.mood === "Stressed").length;
    const ratio = poorMoodCount / lowSleepEntries.length;
    if (ratio >= 0.6) {
      const pct = Math.round(ratio * 100);
      insights.push(makeCardHtml(
        "🧠",
        "Mind-Body Sync Alert",
        `Coach noticed that on days with less than 6.5h of sleep, you report feeling <strong>Tired or Stressed ${pct}% of the time</strong>. Improving sleep duration directly unlocks better mood stability.`
      ));
    }
  }

  // Render insights
  if (insights.length > 0) {
    wrapper.innerHTML = insights.join("");
  } else {
    wrapper.innerHTML = makeCardHtml(
      "👍",
      "Steady Progress",
      "You are doing great logging your habits. Focus on maintaining a consistent sleep schedule and logging your goals today to unlock advanced coaching cards!"
    );
  }
}

let confettiActive = false;

function triggerBadgeCelebration(badge) {
  const modal = document.getElementById("badgeUnlockModal");
  const iconEl = document.getElementById("unlockedBadgeIcon");
  const nameEl = document.getElementById("unlockedBadgeName");
  const descEl = document.getElementById("unlockedBadgeDesc");

  if (!modal || !iconEl || !nameEl || !descEl) return;

  iconEl.textContent = badge.icon;
  nameEl.textContent = badge.name;
  descEl.innerHTML = badge.desc;

  modal.classList.add("active");
  
  confettiActive = true;
  startConfettiCelebration();
}

function dismissBadgeUnlockModal() {
  const modal = document.getElementById("badgeUnlockModal");
  if (modal) {
    modal.classList.remove("active");
  }
  confettiActive = false;
}

function startConfettiCelebration() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const colors = ["#38bdf8", "#4ade80", "#f472b6", "#f59e0b", "#a78bfa", "#f87171"];
  const particles = [];
  
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.6,
      angle: Math.random() * Math.PI * 2,
      speed: 4 + Math.random() * 12,
      radius: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      decay: 0.008 + Math.random() * 0.012,
      gravity: 0.25,
      drift: -0.8 + Math.random() * 1.6,
      rotation: Math.random() * 360,
      rotationSpeed: -5 + Math.random() * 10
    });
  }

  function update() {
    if (!confettiActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      if (p.opacity > 0) {
        active = true;
        p.x += Math.cos(p.angle) * p.speed + p.drift;
        p.y += Math.sin(p.angle) * p.speed + p.gravity;
        p.speed *= 0.98;
        p.opacity -= p.decay;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        
        ctx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
        ctx.restore();
      }
    });

    if (active && confettiActive) {
      requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  update();
  
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

const breathPatterns = {
  box: {
    name: "Box Breathing Guide",
    steps: [
      { name: "Inhale...", duration: 4, action: "inhale" },
      { name: "Hold...", duration: 4, action: "holdFull" },
      { name: "Exhale...", duration: 4, action: "exhale" },
      { name: "Hold...", duration: 4, action: "holdEmpty" }
    ]
  },
  relax: {
    name: "Relaxing Breath Guide",
    steps: [
      { name: "Inhale...", duration: 4, action: "inhale" },
      { name: "Hold...", duration: 7, action: "holdFull" },
      { name: "Exhale...", duration: 8, action: "exhale" }
    ]
  },
  coherent: {
    name: "Coherent Calm Guide",
    steps: [
      { name: "Inhale...", duration: 5, action: "inhale" },
      { name: "Exhale...", duration: 5, action: "exhale" }
    ]
  }
};
let activeBreathPattern = "box";
let breathTimer = null;
let breathState = 0; 
let breathCycleSeconds = 4;
let breathActive = false;

let breathAudioCtx = null;
let breathOsc = null;
let breathOsc2 = null;
let breathGain = null;

function initBreathAudio() {
  if (breathAudioCtx) return;
  try {
    breathAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    breathGain = breathAudioCtx.createGain();
    breathGain.gain.setValueAtTime(0, breathAudioCtx.currentTime);
    
    const filter = breathAudioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, breathAudioCtx.currentTime);
    
    breathGain.connect(filter);
    filter.connect(breathAudioCtx.destination);
  } catch (e) {
    console.error("AudioContext failed to initialize:", e);
  }
}

function startSynthSweep(action, duration) {
  if (!breathAudioCtx || !document.getElementById("breathAudioToggle").checked) return;
  
  if (breathAudioCtx.state === "suspended") {
    breathAudioCtx.resume();
  }
  
  stopSynthAudio();

  breathOsc = breathAudioCtx.createOscillator();
  breathOsc2 = breathAudioCtx.createOscillator();
  
  breathOsc.type = "triangle";
  breathOsc2.type = "sine";
  
  breathOsc.connect(breathGain);
  breathOsc2.connect(breathGain);
  
  const now = breathAudioCtx.currentTime;
  
  if (action === "inhale") {
    breathOsc.frequency.setValueAtTime(160, now);
    breathOsc2.frequency.setValueAtTime(162, now);
    breathOsc.frequency.exponentialRampToValueAtTime(320, now + duration);
    breathOsc2.frequency.exponentialRampToValueAtTime(323, now + duration);
    
    breathGain.gain.setValueAtTime(breathGain.gain.value, now);
    breathGain.gain.linearRampToValueAtTime(0.08, now + duration);
  } else if (action === "holdFull") {
    breathOsc.frequency.setValueAtTime(320, now);
    breathOsc2.frequency.setValueAtTime(323, now);
    
    breathGain.gain.setValueAtTime(breathGain.gain.value, now);
    breathGain.gain.linearRampToValueAtTime(0.06, now + 0.5);
  } else if (action === "exhale") {
    breathOsc.frequency.setValueAtTime(320, now);
    breathOsc2.frequency.setValueAtTime(323, now);
    breathOsc.frequency.exponentialRampToValueAtTime(160, now + duration);
    breathOsc2.frequency.exponentialRampToValueAtTime(162, now + duration);
    
    breathGain.gain.setValueAtTime(breathGain.gain.value, now);
    breathGain.gain.linearRampToValueAtTime(0.01, now + duration);
  } else if (action === "holdEmpty") {
    breathOsc.frequency.setValueAtTime(160, now);
    breathOsc2.frequency.setValueAtTime(162, now);
    
    breathGain.gain.setValueAtTime(breathGain.gain.value, now);
    breathGain.gain.linearRampToValueAtTime(0.005, now + 0.5);
  }

  breathOsc.start(now);
  breathOsc2.start(now);
}

function stopSynthAudio() {
  const now = breathAudioCtx ? breathAudioCtx.currentTime : 0;
  if (breathGain && now) {
    breathGain.gain.setValueAtTime(breathGain.gain.value, now);
    breathGain.gain.linearRampToValueAtTime(0, now + 0.1);
  }
  
  setTimeout(() => {
    try {
      if (breathOsc) {
        breathOsc.stop();
        breathOsc.disconnect();
        breathOsc = null;
      }
      if (breathOsc2) {
        breathOsc2.stop();
        breathOsc2.disconnect();
        breathOsc2 = null;
      }
    } catch (e) {}
  }, 120);
}

function toggleBreathingGuide() {
  const guide = document.getElementById("breathingGuide");
  const pomoTimer = document.getElementById("pomoTimerContainer");
  const pomoSettings = document.getElementById("pomoSettings");

  if (!guide || !pomoTimer) return;

  if (guide.style.display === "none") {
    if (pomoActive) {
      togglePomo();
    }
    guide.style.display = "flex";
    pomoTimer.style.display = "none";
    if (pomoSettings) pomoSettings.style.display = "none";
    
    resetBreathingUI();
  } else {
    exitBreathingGuide();
  }
}

function exitBreathingGuide() {
  stopBreathingLoop();
  
  const guide = document.getElementById("breathingGuide");
  const pomoTimer = document.getElementById("pomoTimerContainer");
  
  if (guide) guide.style.display = "none";
  if (pomoTimer) pomoTimer.style.display = "flex";
  
  const actionBtn = document.getElementById("breathActionBtn");
  if (actionBtn) actionBtn.textContent = "Start Guide";
  
  const ripple1 = document.getElementById("breathRipple1");
  const ripple2 = document.getElementById("breathRipple2");
  if (ripple1) ripple1.classList.remove("active");
  if (ripple2) ripple2.classList.remove("active");
  
  breathActive = false;
}

function resetBreathingUI() {
  const bubble = document.getElementById("breathBubble");
  const instruction = document.getElementById("breathInstruction");
  const counter = document.getElementById("breathSecondText");
  const pattern = breathPatterns[activeBreathPattern];
  
  if (bubble && instruction && counter && pattern) {
    bubble.style.transition = "none";
    bubble.style.width = "60px";
    bubble.style.height = "60px";
    bubble.style.background = "radial-gradient(circle, var(--accent) 0%, rgba(56, 189, 248, 0.4) 100%)";
    bubble.style.boxShadow = "0 0 25px rgba(56, 189, 248, 0.5)";
    
    const ripple1 = document.getElementById("breathRipple1");
    const ripple2 = document.getElementById("breathRipple2");
    if (ripple1) ripple1.style.borderColor = "var(--accent)";
    if (ripple2) ripple2.style.borderColor = "var(--accent)";
    
    instruction.textContent = "Get Ready";
    counter.textContent = pattern.steps[0].duration;
    
    bubble.offsetHeight; // Force reflow
    bubble.style.transition = "";
  }
}

function changeBreathPattern(value) {
  activeBreathPattern = value;
  
  const title = document.getElementById("breathGuideTitle");
  if (title) {
    title.textContent = breathPatterns[value].name;
  }
  
  stopBreathingLoop();
  resetBreathingUI();
  
  if (breathActive) {
    startBreathingLoop();
  } else {
    const actionBtn = document.getElementById("breathActionBtn");
    if (actionBtn) actionBtn.textContent = "Start Guide";
  }
}

function toggleBreathingGuideActive() {
  const actionBtn = document.getElementById("breathActionBtn");
  if (!actionBtn) return;

  const ripple1 = document.getElementById("breathRipple1");
  const ripple2 = document.getElementById("breathRipple2");

  if (!breathActive) {
    initBreathAudio();
    breathActive = true;
    actionBtn.textContent = "Pause Guide";
    
    if (ripple1) ripple1.classList.add("active");
    if (ripple2) ripple2.classList.add("active");
    
    startBreathingLoop();
  } else {
    breathActive = false;
    actionBtn.textContent = "Resume Guide";
    
    if (ripple1) ripple1.classList.remove("active");
    if (ripple2) ripple2.classList.remove("active");
    
    stopBreathingLoop();
  }
}

function startBreathingLoop() {
  stopBreathingLoop();
  
  breathState = 0;
  
  const pattern = breathPatterns[activeBreathPattern];
  const step = pattern.steps[breathState];
  breathCycleSeconds = step.duration;
  
  const bubble = document.getElementById("breathBubble");
  const instruction = document.getElementById("breathInstruction");
  const counter = document.getElementById("breathSecondText");

  updateBreathStateUI(bubble, instruction, counter);

  breathTimer = setInterval(() => {
    breathCycleSeconds--;
    
    if (breathCycleSeconds <= 0) {
      breathState = (breathState + 1) % pattern.steps.length;
      const nextStep = pattern.steps[breathState];
      breathCycleSeconds = nextStep.duration;
      updateBreathStateUI(bubble, instruction, counter);
    } else {
      if (counter) counter.textContent = breathCycleSeconds;
    }
  }, 1000);
}

function updateBreathStateUI(bubble, instruction, counter) {
  if (!bubble || !instruction || !counter) return;

  const pattern = breathPatterns[activeBreathPattern];
  const step = pattern.steps[breathState];
  counter.textContent = breathCycleSeconds;
  instruction.textContent = step.name;

  bubble.style.transition = `width ${step.duration}s ease-in-out, height ${step.duration}s ease-in-out, background ${step.duration}s ease-in-out, box-shadow ${step.duration}s ease-in-out`;

  const stateStyles = {
    inhale: {
      width: "130px",
      height: "130px",
      bg: "radial-gradient(circle, #38bdf8 0%, rgba(56, 189, 248, 0.4) 100%)",
      shadow: "0 0 35px rgba(56, 189, 248, 0.6)",
      color: "#38bdf8"
    },
    holdFull: {
      width: "130px",
      height: "130px",
      bg: "radial-gradient(circle, #4ade80 0%, rgba(74, 222, 128, 0.4) 100%)",
      shadow: "0 0 35px rgba(74, 222, 128, 0.6)",
      color: "#4ade80"
    },
    exhale: {
      width: "60px",
      height: "60px",
      bg: "radial-gradient(circle, #f59e0b 0%, rgba(245, 158, 11, 0.4) 100%)",
      shadow: "0 0 35px rgba(245, 158, 11, 0.6)",
      color: "#f59e0b"
    },
    holdEmpty: {
      width: "60px",
      height: "60px",
      bg: "radial-gradient(circle, #a78bfa 0%, rgba(167, 139, 250, 0.4) 100%)",
      shadow: "0 0 35px rgba(167, 139, 250, 0.6)",
      color: "#a78bfa"
    }
  };

  const style = stateStyles[step.action];
  if (style) {
    bubble.style.width = style.width;
    bubble.style.height = style.height;
    bubble.style.background = style.bg;
    bubble.style.boxShadow = style.shadow;
    
    const ripple1 = document.getElementById("breathRipple1");
    const ripple2 = document.getElementById("breathRipple2");
    if (ripple1) ripple1.style.borderColor = style.color;
    if (ripple2) ripple2.style.borderColor = style.color;
  }

  startSynthSweep(step.action, step.duration);
}

function stopBreathingLoop() {
  if (breathTimer) {
    clearInterval(breathTimer);
    breathTimer = null;
  }
  stopSynthAudio();
}

function startBreathingFromPomo() {
  const guide = document.getElementById("breathingGuide");
  const pomoTimer = document.getElementById("pomoTimerContainer");
  const pomoSettings = document.getElementById("pomoSettings");

  if (!guide || !pomoTimer) return;

  guide.style.display = "flex";
  pomoTimer.style.display = "none";
  if (pomoSettings) pomoSettings.style.display = "none";

  resetBreathingUI();
  initBreathAudio();

  const ripple1 = document.getElementById("breathRipple1");
  const ripple2 = document.getElementById("breathRipple2");
  if (ripple1) ripple1.classList.add("active");
  if (ripple2) ripple2.classList.add("active");

  breathActive = true;
  const actionBtn = document.getElementById("breathActionBtn");
  if (actionBtn) actionBtn.textContent = "Pause Guide";
  startBreathingLoop();
}

checkAuth();

// Fullscreen Distraction-Free Lounge Mode Engine
function toggleLoungeMode() {
  const overlay = document.getElementById("loungeOverlay");
  if (!overlay) return;

  const isOpening = !overlay.classList.contains("active");
  overlay.classList.toggle("active");

  if (isOpening) {
    const loungeAmbientSelect = document.getElementById("loungeAmbientSelect");
    if (loungeAmbientSelect && pomoAmbientSelect) {
      loungeAmbientSelect.value = pomoAmbientSelect.value;
    }
    const loungeLabel = document.getElementById("loungePomoLabel");
    if (loungeLabel) {
      const labelMap = { work: "WORK SESSION 🎯", short: "SHORT BREAK ☕", long: "LONG BREAK 🧘" };
      loungeLabel.textContent = labelMap[pomoMode] || "FOCUS SESSION";
    }
    updatePomoDisplay();
  }
}

function syncLoungeAmbient(val) {
  if (pomoAmbientSelect) {
    pomoAmbientSelect.value = val;
    changeAmbientSound(val);
  }
}

// Exit Lounge on Escape Key
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    const overlay = document.getElementById("loungeOverlay");
    if (overlay && overlay.classList.contains("active")) {
      toggleLoungeMode();
    }
  }
});

// Dynamic Sky & Constellation Starfield Engine
function initDynamicSkyEngine() {
  const starfield = document.getElementById("skyStarfield");
  if (starfield && starfield.children.length === 0) {
    for (let i = 0; i < 45; i++) {
      const star = document.createElement("div");
      star.className = "sky-star";
      const size = 1.5 + Math.random() * 2.5;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}vw`;
      star.style.top = `${Math.random() * 100}vh`;
      star.style.setProperty("--duration", `${2 + Math.random() * 4}s`);
      star.style.animationDelay = `${Math.random() * 3}s`;
      starfield.appendChild(star);
    }
  }

  updateSkyMode();
  setInterval(updateSkyMode, 60000);
}

function updateSkyMode() {
  const hours = new Date().getHours();
  document.body.classList.remove("sky-morning", "sky-afternoon", "sky-sunset", "sky-night");

  let modeClass = "sky-night";
  let modeText = "🌌 Cosmic Night";

  if (hours >= 6 && hours < 11) {
    modeClass = "sky-morning";
    modeText = "🌅 Golden Sunrise";
  } else if (hours >= 11 && hours < 17) {
    modeClass = "sky-afternoon";
    modeText = "☀️ Cyber Afternoon";
  } else if (hours >= 17 && hours < 20) {
    modeClass = "sky-sunset";
    modeText = "🌆 Violet Sunset";
  } else {
    modeClass = "sky-night";
    modeText = "🌌 Cosmic Night";
  }

  document.body.classList.add(modeClass);

  const skyPill = document.getElementById("skyStatusPill");
  if (skyPill) skyPill.textContent = modeText;
}

initDynamicSkyEngine();

// Dopamine Detox & Doomscroll Shield Engine
let detoxActive = false;
let detoxInterval = null;
let detoxTimeLeft = 45 * 60; // 45 minutes default
let detoxSecsPassed = 0;
let detoxTipIndex = 0;

const detoxTipsList = [
  '"Put your phone face down in another room. Break the instant gratification loop."',
  '"Notice the urge to open social media. Take a deep breath and let it pass."',
  '"Boredom is where your brain rewires and gains clarity. Embrace the quiet."',
  '"Single-tasking restores your attention span and mental resilience."',
  '"Every 15 minutes of detox restores your deep focus superpower."'
];

function toggleDetoxSprint() {
  const btn = document.getElementById("detoxToggleBtn");
  const badge = document.getElementById("detoxStatusBadge");

  if (detoxActive) {
    clearInterval(detoxInterval);
    detoxActive = false;
    if (btn) {
      btn.textContent = "Activate Shield ⚡";
      btn.style.background = "linear-gradient(135deg, #f59e0b, #ef4444)";
    }
    if (badge) {
      badge.textContent = "Paused";
      badge.style.color = "#f59e0b";
    }
  } else {
    detoxActive = true;
    if (btn) {
      btn.textContent = "Pause Shield ⚡";
      btn.style.background = "rgba(255,255,255,0.1)";
    }
    if (badge) {
      badge.textContent = "⚡ ACTIVE";
      badge.style.color = "#22c55e";
    }

    detoxInterval = setInterval(() => {
      detoxTimeLeft--;
      detoxSecsPassed++;

      // Rotate wisdom tip every 30 seconds
      if (detoxSecsPassed % 30 === 0) {
        detoxTipIndex = (detoxTipIndex + 1) % detoxTipsList.length;
        const tipEl = document.getElementById("detoxTipText");
        if (tipEl) tipEl.textContent = detoxTipsList[detoxTipIndex];
      }

      updateDetoxDisplay();

      if (detoxTimeLeft <= 0) {
        clearInterval(detoxInterval);
        detoxActive = false;
        if (btn) {
          btn.textContent = "Activate Shield ⚡";
          btn.style.background = "linear-gradient(135deg, #f59e0b, #ef4444)";
        }
        if (badge) {
          badge.textContent = "Completed 🎉";
          badge.style.color = "#22c55e";
        }
        alert("🎉 Dopamine Detox Sprint Complete! You successfully reclaimed 45 minutes of focus!");
      }
    }, 1000);
  }
}

function updateDetoxDisplay() {
  const mins = Math.floor(detoxTimeLeft / 60);
  const secs = detoxTimeLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const cardDisplay = document.getElementById("detoxTimerDisplay");
  const lockoutDisplay = document.getElementById("detoxLockoutTime");

  if (cardDisplay) cardDisplay.textContent = formatted;
  if (lockoutDisplay) lockoutDisplay.textContent = formatted;

  // Calculate estimated saved time (~1.4x of detox time)
  const minsSaved = Math.floor((detoxSecsPassed / 60) * 1.4);
  const ptsGained = Math.floor(detoxSecsPassed / 6); // 10 pts per minute

  const savedText = document.getElementById("detoxTimeSavedText");
  const pointsText = document.getElementById("detoxPointsText");
  const lockoutSaved = document.getElementById("detoxLockoutSaved");
  const lockoutPoints = document.getElementById("detoxLockoutPoints");

  if (savedText) savedText.textContent = `+${minsSaved} mins`;
  if (pointsText) pointsText.textContent = `+${ptsGained} pts`;
  if (lockoutSaved) lockoutSaved.textContent = `+${minsSaved} mins`;
  if (lockoutPoints) lockoutPoints.textContent = `+${ptsGained} pts`;
}

function toggleDetoxLockout() {
  const overlay = document.getElementById("detoxLockoutOverlay");
  if (!overlay) return;

  const isOpening = !overlay.classList.contains("active");
  overlay.classList.toggle("active");

  if (isOpening) {
    updateDetoxDisplay();
  }
}

function toggleDetoxSettings() {
  const panel = document.getElementById("detoxSettings");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" ? "flex" : "none";
}

function setDetoxDuration(mins) {
  if (detoxActive) {
    if (!confirm("A detox sprint is currently running. Stop current sprint and apply new duration?")) return;
    toggleDetoxSprint();
  }
  detoxTimeLeft = mins * 60;
  detoxSecsPassed = 0;
  updateDetoxDisplay();
  toggleDetoxSettings();
}

function applyCustomDetoxMinutes() {
  const input = document.getElementById("customDetoxMinutes");
  const val = parseInt(input.value, 10);
  if (!val || val < 1 || val > 180) {
    alert("Please enter a valid duration between 1 and 180 minutes.");
    return;
  }
  setDetoxDuration(val);
  input.value = "";
}

// Google / Gmail OAuth Sign-In Handlers
function handleGooglePrompt() {
  const modal = document.getElementById("googleAuthModal");
  if (!modal) return;
  
  const savedEmail = localStorage.getItem("auth_email") || "";
  const savedUser = localStorage.getItem("auth_username") || "";
  
  const gmailInput = document.getElementById("googleGmailInput");
  const nameInput = document.getElementById("googleNameInput");
  if (gmailInput) gmailInput.value = savedEmail;
  if (nameInput) nameInput.value = savedUser;
  
  modal.style.display = "flex";
  setTimeout(() => { if (gmailInput) gmailInput.focus(); }, 100);
}

function closeGoogleModal() {
  const modal = document.getElementById("googleAuthModal");
  if (modal) modal.style.display = "none";
}

async function submitGoogleAuth() {
  const emailInput = document.getElementById("googleGmailInput").value.trim();
  const nameInput = document.getElementById("googleNameInput").value.trim();

  if (!emailInput || !emailInput.includes("@")) {
    return alert("Please enter a valid Gmail address (e.g. yourname@gmail.com).");
  }

  try {
    const res = await apiFetch("/api/auth/google", "POST", {
      email: emailInput,
      name: nameInput || emailInput.split("@")[0]
    });

    if (res && res.token) {
      localStorage.setItem("auth_token", res.token);
      localStorage.setItem("auth_username", res.user.username);
      localStorage.setItem("auth_email", res.user.email);
      localStorage.setItem("auth_password", "google_oauth");
      sessionStorage.setItem("auth_loggedIn", "true");
      closeGoogleModal();
      alert(`🎉 Signed in with Google (${res.user.email})! Dashboard unlocked.`);
      checkAuth();
    }
  } catch (err) {
    console.warn("Backend Google sign-in fallback:", err.message);
    const username = (nameInput || emailInput.split("@")[0]).trim();
    localStorage.setItem("auth_username", username);
    localStorage.setItem("auth_email", emailInput);
    localStorage.setItem("auth_password", "google_oauth");
    sessionStorage.setItem("auth_loggedIn", "true");
    closeGoogleModal();
    alert(`Signed in locally with Gmail (${emailInput})!`);
    checkAuth();
  }
}
