import { store } from "../store.js";
import { showToast } from "../app.js";
import { formatPretty, todayISO } from "../utils/dates.js";
import { esc } from "../utils/esc.js";
import * as sched from "../schedule.js";
import { GOLF_DRILLS } from "../data/golfDrills.js";

const RIDE_LABEL = { confirmed: "Ride confirmed", maybe: "Ride maybe", none: "No ride", unset: "Set ride status" };

function getDeps() {
  return {
    gymPlan: store.getGymPlan(),
    gymSessions: store.getGymSessions(),
    dayPlans: store.getDayPlans(),
    checklistItems: store.getChecklistItems(),
    goalDate: store.getSettings().goalDate,
    golfPracticeLogs: store.getGolfPracticeLogs(),
  };
}

function drillNames(ids) {
  return ids.map((id) => GOLF_DRILLS.find((d) => d.id === id)?.name).filter(Boolean).join(", ");
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ensureToday() {
  const deps = getDeps();
  const dates = sched.windowDates(todayISO(), 2);
  const generated = sched.buildSchedule(dates, deps);
  const dayPlans = { ...deps.dayPlans, ...generated };
  store.setDayPlans(dayPlans);
  return dayPlans[todayISO()];
}

function planCardHTML(plan) {
  if (plan.type === "gym") {
    return `
      <div class="day-type-row"><span class="glyph">🏋️</span> Gym day</div>
      <p class="day-detail" style="margin-top:6px;">${plan.gym.planDayLabel}</p>
      <p class="small muted" style="margin-top:10px;">${plan.gym.sessionLogged ? "✓ Session logged today." : "Head to the Gym tab to log this session."}</p>
    `;
  }
  if (plan.type === "home-practice") {
    return `
      <div class="day-type-row"><span class="glyph">⛳</span> Home practice</div>
      <p class="day-detail" style="margin-top:6px;">${plan.golf.targetDurationMin} min · ${plan.golf.focus}</p>
      <p class="day-detail" style="margin-top:4px;">${drillNames(plan.golf.drillIds)}</p>
      <p class="small muted" style="margin-top:10px;">${plan.golf.sessionLogged ? "✓ Practice logged today." : "Head to the Golf tab to log this session."}</p>
    `;
  }
  return `
    <div class="day-type-row type-rest"><span class="glyph">😴</span> Rest day</div>
    <p class="day-detail" style="margin-top:6px;">Nothing scheduled. Recover.</p>
  `;
}

function checklistSectionHTML(category, title, items, logsToday) {
  const filtered = items.filter((i) => i.category === category && i.active).sort((a, b) => a.order - b.order);
  if (!filtered.length) return "";
  return `
    <div class="section-title">${title}</div>
    <div class="chip-row">
      ${filtered
        .map(
          (i) => `<button class="check-chip ${logsToday[i.id] ? "done" : ""}" data-id="${i.id}">${i.icon ? i.icon + " " : ""}${esc(i.label)}</button>`
        )
        .join("")}
    </div>
  `;
}

export function render(container) {
  const plan = ensureToday();
  const today = todayISO();
  const items = store.getChecklistItems();
  const logs = store.getChecklistLogs();
  const logsToday = logs[today] || {};
  const dietEntry = store.getDietEntries()[today];
  const meals = dietEntry?.meals || [];

  container.innerHTML = `
    <div class="card">
      <div class="row between">
        <p class="small muted">${formatPretty(today)}</p>
        <button class="ride-chip ${plan.rideStatus}" id="rideChip">${RIDE_LABEL[plan.rideStatus]}</button>
      </div>
      <div style="margin-top:10px;">${planCardHTML(plan)}</div>
    </div>

    ${checklistSectionHTML("habit", "Habits", items, logsToday)}
    ${checklistSectionHTML("diet", "Diet", items, logsToday)}

    <div class="section-title">Today's meals</div>
    <div class="card">
      <div class="stack" id="mealsList">
        ${meals.length ? meals.map((m) => `<div class="row small" style="gap:10px;"><span class="muted">${esc(m.time)}</span><span>${esc(m.text)}</span></div>`).join("") : `<p class="small muted">Nothing logged yet.</p>`}
      </div>
      <div class="row" style="margin-top:12px; gap:8px;">
        <input type="text" id="mealText" placeholder="What'd you eat?" style="flex:1;" />
        <button class="btn" id="addMealBtn">Add</button>
      </div>
    </div>
  `;

  container.querySelector("#rideChip").addEventListener("click", () => {
    const date = today;
    const current = store.getDayPlans()[date];
    const next = sched.nextRideStatus(current?.rideStatus);
    const updated = sched.applyManualEdit(date, { rideStatus: next }, getDeps());
    store.setDayPlans(updated);
    render(container);
    showToast(RIDE_LABEL[next]);
  });

  container.querySelectorAll(".check-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.id;
      const allLogs = store.getChecklistLogs();
      const dayLog = { ...(allLogs[today] || {}) };
      dayLog[id] = !dayLog[id];
      allLogs[today] = dayLog;
      store.setChecklistLogs(allLogs);
      chip.classList.toggle("done", dayLog[id]);
    });
  });

  container.querySelector("#addMealBtn").addEventListener("click", () => {
    const input = container.querySelector("#mealText");
    const text = input.value.trim();
    if (!text) return;
    const entries = store.getDietEntries();
    const entry = entries[today] || { date: today, meals: [], notes: "" };
    entry.meals.push({ time: nowHHMM(), text });
    entries[today] = entry;
    store.setDietEntries(entries);
    input.value = "";
    render(container);
    showToast("Meal logged");
  });
}
