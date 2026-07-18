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
}

function saveGoals() {
  localStorage.setItem("goals", JSON.stringify({
    sleep: +sleep.value,
    exercise: +exercise.value,
    water: +water.value,
    screen: +screen.value
  }));
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

  localStorage.setItem("entry-" + todayKey(), JSON.stringify(data));
  renderProgress();
  renderSummary();
  renderTrends();
  renderCalendar();
  renderStreaksAndBadges();
  renderMoodChart();
  alert("Entry saved!");
}

function saveNotes() {
  localStorage.setItem("notes-" + todayKey(), notes.value);
  alert("Notes saved!");
}

function addTask() {
  const task = taskInput.value.trim();
  if (!task) return;
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  tasks.push({ text: task, done: false });
  localStorage.setItem("tasks", JSON.stringify(tasks));
  taskInput.value = "";
  renderTasks();
}

function toggleTask(i) {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  tasks[i].done = !tasks[i].done;
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
  renderStreaksAndBadges();
}

function renderTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  taskList.innerHTML = tasks.map((t, i) => `
    <li>
      <span class="${t.done ? 'done' : ''}">${t.text}</span>
      <div style="display: flex; gap: 8px;">
        <button class="secondary task-btn" onclick="toggleTask(${i})">${t.done ? 'Undo' : 'Done'}</button>
        <button class="secondary task-btn" style="border-color: var(--danger); color: var(--danger);" onclick="deleteTask(${i})">Delete</button>
      </div>
    </li>
  `).join("");
}

function deleteTask(i) {
  const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  tasks.splice(i, 1);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
  renderStreaksAndBadges();
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

const savedDurations = JSON.parse(localStorage.getItem("pomo_durations")) || {
  work: 25,
  short: 5,
  long: 15
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

  if (workVal < 1 || shortVal < 1 || longVal < 1) {
    return alert("Durations must be at least 1 minute.");
  }

  const newDurations = { work: workVal, short: shortVal, long: longVal };
  localStorage.setItem("pomo_durations", JSON.stringify(newDurations));

  pomoDurations.work = workVal * 60;
  pomoDurations.short = shortVal * 60;
  pomoDurations.long = longVal * 60;

  resetPomo();
  togglePomoSettings();
  alert("Timer durations saved successfully!");
}

function initPomoSettings() {
  const saved = JSON.parse(localStorage.getItem("pomo_durations")) || { work: 25, short: 5, long: 15 };
  pomoWorkInput.value = saved.work;
  pomoShortInput.value = saved.short;
  pomoLongInput.value = saved.long;
  
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
  pomoTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function togglePomo() {
  if (pomoActive) {
    clearInterval(pomoInterval);
    pomoStartBtn.textContent = "Start";
    pomoStartBtn.className = "primary";
    pomoActive = false;
  } else {
    pomoActive = true;
    pomoStartBtn.textContent = "Pause";
    pomoStartBtn.className = "secondary";
    pomoInterval = setInterval(() => {
      pomoTimeLeft--;
      updatePomoDisplay();
      
      if (pomoTimeLeft <= 0) {
        clearInterval(pomoInterval);
        playPomoAlarm();
        alert(`${pomoMode === 'work' ? 'Work session completed! Time for a break.' : 'Break completed! Ready to focus?'}`);
        
        if (pomoMode === "work") {
          setPomoMode("short");
        } else {
          setPomoMode("work");
        }
      }
    }, 1000);
  }
}

function resetPomo() {
  if (pomoActive) togglePomo();
  pomoTimeLeft = pomoDurations[pomoMode];
  updatePomoDisplay();
}

function playPomoAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const chime = (freq, time, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      osc.start(time);
      osc.stop(time + duration);
    };

    chime(523.25, ctx.currentTime, 0.4);
    chime(659.25, ctx.currentTime + 0.15, 0.4);
    chime(783.99, ctx.currentTime + 0.3, 0.6);
  } catch (err) {
    console.error("Audio fail", err);
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
    { id: "sleep3", name: "Sleep Champion", desc: "Sleep 8+ hours for 3 consecutive days", icon: "🛌", unlocked: checkConsecutiveHabit("sleep", 8, 3) },
    { id: "water3", name: "Water Warrior", desc: "Drink 3+ Liters of water for 3 consecutive days", icon: "💧", unlocked: checkConsecutiveHabit("water", 3, 3) },
    { id: "tasks5", name: "Task Conqueror", desc: "Complete 5 or more daily tasks", icon: "🎯", unlocked: checkCompletedTasksCount(5) }
  ];

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

function checkAuth() {
  const savedUser = localStorage.getItem("auth_username");
  const savedPass = localStorage.getItem("auth_password");
  const loggedIn = sessionStorage.getItem("auth_loggedIn");

  if (loggedIn === "true") {
    loginScreen.style.display = "none";
    dashboardApp.style.display = "block";
    initTheme();
    loadData();
  } else {
    loginScreen.style.display = "flex";
    dashboardApp.style.display = "none";
    initTheme();

    if (!savedUser || !savedPass) {
      loginTitle.textContent = "Create Account";
      loginSubtitle.textContent = "Set a local username and password to secure your dashboard.";
      document.querySelector("#loginScreen button").textContent = "Create Account";
    } else {
      loginTitle.textContent = "Welcome Back";
      loginSubtitle.textContent = "Sign in to access your tracking history.";
      document.querySelector("#loginScreen button").textContent = "Sign In";
    }
  }
}

function handleAuth() {
  const usernameInput = loginUser.value.trim();
  const passwordInput = loginPass.value.trim();

  if (!usernameInput || !passwordInput) {
    return alert("Please enter both username and password.");
  }

  const savedUser = localStorage.getItem("auth_username");
  const savedPass = localStorage.getItem("auth_password");

  if (!savedUser || !savedPass) {
    localStorage.setItem("auth_username", usernameInput);
    localStorage.setItem("auth_password", passwordInput);
    sessionStorage.setItem("auth_loggedIn", "true");
    alert("Credentials set successfully!");
    checkAuth();
  } else {
    if (usernameInput === savedUser && passwordInput === savedPass) {
      sessionStorage.setItem("auth_loggedIn", "true");
      loginUser.value = "";
      loginPass.value = "";
      checkAuth();
    } else {
      alert("Invalid username or password.");
    }
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

checkAuth();
