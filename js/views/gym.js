import { store } from "../store.js";
import { showToast } from "../app.js";
import { uid } from "../utils/ids.js";
import { todayISO, formatPretty } from "../utils/dates.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

let activeSubtab = "log";
let rootContainer = null;
let loggedSets = {}; // exerciseId -> [{reps, weightLb}]

export function render(container) {
  rootContainer = container;
  container.innerHTML = `
    <div class="subtabs" id="gymSubtabs">
      <button class="subtab" data-tab="log">Log Session</button>
      <button class="subtab" data-tab="plan">My Plan</button>
      <button class="subtab" data-tab="history">History</button>
    </div>
    <div id="gymContent"></div>
  `;
  container.querySelectorAll(".subtab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === activeSubtab);
    btn.addEventListener("click", () => {
      activeSubtab = btn.dataset.tab;
      render(container);
    });
  });

  const content = container.querySelector("#gymContent");
  if (activeSubtab === "log") renderLog(content);
  else if (activeSubtab === "plan") renderPlan(content);
  else renderHistory(content);
}

/* ---------------- My Plan ---------------- */

function renderPlan(container) {
  const plan = store.getGymPlan();

  container.innerHTML = `
    ${
      plan.days.length
        ? `<div class="stack" id="daysList">${plan.days.map(dayEditorHTML).join("")}</div>`
        : `<div class="empty-state">
            <span class="glyph">🏋️</span>
            <h2 style="font-size:16px;">Set up your program</h2>
            <p>Enter the plan you already follow — the days you rotate through and the
              targets for each. LevelUp logs sessions against this; it never invents
              exercises for you.</p>
          </div>`
    }
    <button class="btn block" id="addDayBtn" style="margin-top:14px;">+ Add a day</button>
  `;

  container.querySelector("#addDayBtn").addEventListener("click", () => {
    const p = store.getGymPlan();
    const letter = String.fromCharCode(65 + p.days.length);
    p.days.push({ id: uid("day"), label: `Day ${letter}`, exercises: [] });
    store.setGymPlan(p);
    renderPlan(container);
  });

  wirePlanEvents(container);
}

function dayEditorHTML(day) {
  return `
    <div class="card" data-day-id="${day.id}">
      <div class="row between">
        <input type="text" class="day-label-input" data-day-id="${day.id}"
          value="${esc(day.label)}" style="font-weight:700; border:none; background:none; padding:0; font-size:15px; flex:1;" />
        <button class="icon-btn delete-day-btn" data-day-id="${day.id}" aria-label="Delete day">✕</button>
      </div>
      <div class="stack" style="margin-top:10px;">
        ${day.exercises.map((ex) => exerciseEditorHTML(day.id, ex)).join("")}
      </div>
      <button class="btn ghost add-exercise-btn" data-day-id="${day.id}" style="margin-top:10px; width:100%;">+ Add exercise</button>
    </div>
  `;
}

function exerciseEditorHTML(dayId, ex) {
  return `
    <div class="exercise-block" data-ex-id="${ex.id}">
      <div class="row between">
        <input type="text" class="exercise-name-input" data-day-id="${dayId}" data-ex-id="${ex.id}" data-field="name"
          value="${esc(ex.name)}" placeholder="Exercise name" style="border:none; background:none; padding:0; flex:1;" />
        <button class="icon-btn delete-ex-btn" data-day-id="${dayId}" data-ex-id="${ex.id}" aria-label="Delete exercise">✕</button>
      </div>
      <div class="inline-fields" style="margin-top:6px;">
        <div><label>Sets</label><input type="number" min="1" data-day-id="${dayId}" data-ex-id="${ex.id}" data-field="targetSets" value="${ex.targetSets ?? ""}" /></div>
        <div><label>Reps</label><input type="text" data-day-id="${dayId}" data-ex-id="${ex.id}" data-field="targetReps" value="${esc(ex.targetReps ?? "")}" placeholder="e.g. 6-8" /></div>
        <div><label>Weight</label><input type="number" step="0.5" data-day-id="${dayId}" data-ex-id="${ex.id}" data-field="targetWeightLb" value="${ex.targetWeightLb ?? ""}" /></div>
      </div>
    </div>
  `;
}

function wirePlanEvents(container) {
  container.querySelectorAll(".day-label-input").forEach((input) => {
    input.addEventListener("change", () => {
      const p = store.getGymPlan();
      const day = p.days.find((d) => d.id === input.dataset.dayId);
      day.label = input.value.trim() || day.label;
      store.setGymPlan(p);
      showToast("Saved");
    });
  });

  container.querySelectorAll(".delete-day-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this day and all its exercises?")) return;
      const p = store.getGymPlan();
      p.days = p.days.filter((d) => d.id !== btn.dataset.dayId);
      store.setGymPlan(p);
      renderPlan(container);
      showToast("Day deleted");
    });
  });

  container.querySelectorAll(".add-exercise-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = store.getGymPlan();
      const day = p.days.find((d) => d.id === btn.dataset.dayId);
      day.exercises.push({ id: uid("ex"), name: "", targetSets: 3, targetReps: "", targetWeightLb: null, notes: "" });
      store.setGymPlan(p);
      renderPlan(container);
    });
  });

  container.querySelectorAll(".delete-ex-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = store.getGymPlan();
      const day = p.days.find((d) => d.id === btn.dataset.dayId);
      day.exercises = day.exercises.filter((e) => e.id !== btn.dataset.exId);
      store.setGymPlan(p);
      renderPlan(container);
    });
  });

  container.querySelectorAll(".exercise-block input[data-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const p = store.getGymPlan();
      const day = p.days.find((d) => d.id === input.dataset.dayId);
      const ex = day.exercises.find((e) => e.id === input.dataset.exId);
      const field = input.dataset.field;
      ex[field] = field === "targetSets" || field === "targetWeightLb" ? (input.value === "" ? null : Number(input.value)) : input.value;
      store.setGymPlan(p);
    });
  });
}

/* ---------------- Log Session ---------------- */

function renderLog(container) {
  const plan = store.getGymPlan();

  if (!plan.days.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="glyph">📋</span>
        <h2 style="font-size:16px;">No plan set up yet</h2>
        <p>Add your program under <strong>My Plan</strong> first, then come back here to log a session against it.</p>
      </div>`;
    return;
  }

  const today = todayISO();
  const todaysPlan = store.getDayPlans()[today];
  const defaultDayId = todaysPlan?.type === "gym" && todaysPlan.gym?.planDayId ? todaysPlan.gym.planDayId : plan.days[0].id;

  container.innerHTML = `
    <div class="card field">
      <label for="planDaySelect">Which day are you doing?</label>
      <select id="planDaySelect">
        ${plan.days.map((d) => `<option value="${d.id}" ${d.id === defaultDayId ? "selected" : ""}>${esc(d.label)}</option>`).join("")}
      </select>
    </div>
    <div id="exerciseLogList" class="stack" style="margin-top:12px;"></div>
    <div class="card" style="margin-top:12px;">
      <div class="inline-fields">
        <div class="field"><label>Bodyweight (${store.getSettings().units})</label><input type="number" step="0.1" id="bodyweightInput" /></div>
        <div class="field"><label>Duration (min)</label><input type="number" id="durationInput" /></div>
      </div>
      <div class="field" style="margin-top:10px;"><label>Notes</label><textarea id="sessionNotes" placeholder="How did it feel?"></textarea></div>
    </div>
    <button class="btn primary block" id="saveSessionBtn" style="margin-top:14px;">Save session</button>
  `;

  const select = container.querySelector("#planDaySelect");
  const list = container.querySelector("#exerciseLogList");
  const currentDay = () => store.getGymPlan().days.find((d) => d.id === select.value);

  loadExercisesFor(currentDay());
  select.addEventListener("change", () => loadExercisesFor(currentDay()));

  // Delegated listeners, attached once — set rows get replaced (add/remove
  // set, or switching day) far more often than this container itself, so
  // binding per-row would mean re-binding on every change and accumulating
  // duplicate handlers on rows that weren't touched.
  list.addEventListener("input", (e) => {
    const input = e.target;
    if (!input.matches(".set-reps, .set-weight")) return;
    const exId = input.dataset.exId;
    const idx = Number(input.dataset.idx);
    const field = input.classList.contains("set-reps") ? "reps" : "weightLb";
    loggedSets[exId][idx][field] = input.value;
  });
  list.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-set-btn");
    const removeBtn = e.target.closest(".remove-set-btn");
    if (addBtn) {
      loggedSets[addBtn.dataset.exId].push({ reps: "", weightLb: "" });
      refreshExerciseBlock(addBtn.dataset.exId, currentDay());
    } else if (removeBtn) {
      const arr = loggedSets[removeBtn.dataset.exId];
      if (arr.length > 1) arr.pop();
      refreshExerciseBlock(removeBtn.dataset.exId, currentDay());
    }
  });

  container.querySelector("#saveSessionBtn").addEventListener("click", () => saveSession(container, currentDay()));
}

function loadExercisesFor(day) {
  loggedSets = {};
  day.exercises.forEach((ex) => {
    loggedSets[ex.id] = Array.from({ length: Math.max(1, ex.targetSets || 1) }, () => ({ reps: "", weightLb: "" }));
  });
  const list = rootContainer.querySelector("#exerciseLogList");
  list.innerHTML = day.exercises.length
    ? day.exercises.map(exerciseLogHTML).join("")
    : `<p class="muted small">This day has no exercises yet — add some under My Plan.</p>`;
}

function exerciseLogHTML(ex) {
  const sets = loggedSets[ex.id];
  const target = `${ex.targetSets || "–"} × ${esc(ex.targetReps || "–")}${ex.targetWeightLb ? " @ " + ex.targetWeightLb : ""}`;
  return `
    <div class="exercise-block" data-ex-id="${ex.id}">
      <div class="row between">
        <strong>${esc(ex.name || "Unnamed exercise")}</strong>
        <span class="small muted">Target: ${target}</span>
      </div>
      <div class="stack" style="margin-top:8px;">
        ${sets
          .map(
            (s, i) => `
          <div class="set-row">
            <span class="set-index">${i + 1}</span>
            <input type="number" class="set-reps" data-ex-id="${ex.id}" data-idx="${i}" placeholder="reps" value="${s.reps}" />
            <input type="number" class="set-weight" data-ex-id="${ex.id}" data-idx="${i}" placeholder="weight" value="${s.weightLb}" step="0.5" />
          </div>`
          )
          .join("")}
      </div>
      <div class="row" style="margin-top:8px; gap:6px;">
        <button class="btn ghost add-set-btn" data-ex-id="${ex.id}" style="flex:1;">+ Set</button>
        <button class="btn ghost remove-set-btn" data-ex-id="${ex.id}" style="flex:1;">− Set</button>
      </div>
    </div>
  `;
}

function refreshExerciseBlock(exId, day) {
  const ex = day.exercises.find((e) => e.id === exId);
  const block = rootContainer.querySelector(`.exercise-block[data-ex-id="${exId}"]`);
  block.outerHTML = exerciseLogHTML(ex);
}

function saveSession(container, day) {
  const entries = day.exercises
    .map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: loggedSets[ex.id]
        .filter((s) => s.reps !== "" || s.weightLb !== "")
        .map((s) => ({ reps: s.reps === "" ? null : Number(s.reps), weightLb: s.weightLb === "" ? null : Number(s.weightLb) })),
    }))
    .filter((e) => e.sets.length > 0);

  const bodyweightVal = container.querySelector("#bodyweightInput").value;
  const durationVal = container.querySelector("#durationInput").value;
  const notesVal = container.querySelector("#sessionNotes").value;

  if (entries.length === 0 && !bodyweightVal) {
    showToast("Log at least one set (or bodyweight) first");
    return;
  }

  const today = todayISO();

  if (entries.length > 0) {
    const sessions = store.getGymSessions();
    sessions.push({
      id: uid("sess"),
      date: today,
      planDayId: day.id,
      planDayLabel: day.label,
      bodyweightLb: bodyweightVal ? Number(bodyweightVal) : null,
      durationMin: durationVal ? Number(durationVal) : null,
      entries,
      notes: notesVal,
    });
    store.setGymSessions(sessions);

    const dayPlans = store.getDayPlans();
    if (dayPlans[today]?.type === "gym") {
      dayPlans[today] = { ...dayPlans[today], gym: { ...dayPlans[today].gym, sessionLogged: true } };
      store.setDayPlans(dayPlans);
    }
  }

  if (bodyweightVal) {
    const measurements = store.getMeasurements();
    const existing = measurements.find((m) => m.date === today);
    if (existing) existing.weightLb = Number(bodyweightVal);
    else measurements.push({ id: uid("m"), date: today, weightLb: Number(bodyweightVal) });
    store.setMeasurements(measurements);
  }

  showToast(entries.length > 0 ? "Session saved" : "Bodyweight saved");
  activeSubtab = "history";
  render(rootContainer);
}

/* ---------------- History ---------------- */

function renderHistory(container) {
  const sessions = [...store.getGymSessions()].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!sessions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="glyph">📈</span>
        <h2 style="font-size:16px;">No sessions yet</h2>
        <p>Log your first session and it'll show up here.</p>
      </div>`;
    return;
  }
  container.innerHTML = `<div class="card">${sessions.map(historyItemHTML).join("")}</div>`;
}

function historyItemHTML(s) {
  const exSummary = s.entries
    .map((e) => {
      const setsStr = e.sets.map((set) => `${set.reps ?? "–"}${set.weightLb ? "×" + set.weightLb : ""}`).join(", ");
      return `${esc(e.exerciseName || "Exercise")}: ${setsStr}`;
    })
    .join(" · ");
  return `
    <div class="history-item">
      <div class="hist-head"><span>${formatPretty(s.date)}</span><span class="muted">${esc(s.planDayLabel)}</span></div>
      <div class="hist-body">
        ${exSummary || "No sets logged"}
        ${s.bodyweightLb ? ` · BW ${s.bodyweightLb}` : ""}
        ${s.durationMin ? ` · ${s.durationMin} min` : ""}
        ${s.notes ? `<br>"${esc(s.notes)}"` : ""}
      </div>
    </div>
  `;
}
