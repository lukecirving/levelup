import { store } from "../store.js";
import { showToast } from "../app.js";
import { uid } from "../utils/ids.js";
import { todayISO, formatPretty } from "../utils/dates.js";
import { esc } from "../utils/esc.js";
import { GOLF_DRILLS } from "../data/golfDrills.js";

let activeSubtab = "practice";
let locationFilter = "home";
let focusFilter = "all";

export function render(container) {
  container.innerHTML = `
    <div class="subtabs" id="golfSubtabs">
      <button class="subtab" data-tab="practice">Log Practice</button>
      <button class="subtab" data-tab="drills">Drills</button>
      <button class="subtab" data-tab="history">History</button>
    </div>
    <div id="golfContent"></div>
  `;
  container.querySelectorAll(".subtab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === activeSubtab);
    btn.addEventListener("click", () => {
      activeSubtab = btn.dataset.tab;
      render(container);
    });
  });

  const content = container.querySelector("#golfContent");
  if (activeSubtab === "practice") renderPractice(content, container);
  else if (activeSubtab === "drills") renderDrills(content);
  else renderHistory(content);
}

/* ---------------- Drills library ---------------- */

const ALL_FOCUS = [...new Set(GOLF_DRILLS.flatMap((d) => d.focus))].sort();

function renderDrills(container) {
  container.innerHTML = `
    <div class="filter-row">
      ${["home", "range", "course", "all"].map((loc) => `<button class="filter-pill ${locationFilter === loc ? "active" : ""}" data-loc="${loc}">${loc === "home" ? "Home" : loc === "range" ? "Range" : loc === "course" ? "Course" : "All"}</button>`).join("")}
      <select class="filter-select" id="focusSelect">
        <option value="all">All focus areas</option>
        ${ALL_FOCUS.map((f) => `<option value="${f}" ${focusFilter === f ? "selected" : ""}>${f.replace("-", " ")}</option>`).join("")}
      </select>
    </div>
    <div class="stack" id="drillList"></div>
  `;

  container.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      locationFilter = btn.dataset.loc;
      renderDrills(container);
    });
  });
  container.querySelector("#focusSelect").addEventListener("change", (e) => {
    focusFilter = e.target.value;
    renderDrillList(container);
  });

  renderDrillList(container);
}

function renderDrillList(container) {
  const filtered = GOLF_DRILLS.filter(
    (d) => (locationFilter === "all" || d.location === locationFilter) && (focusFilter === "all" || d.focus.includes(focusFilter))
  );
  const list = container.querySelector("#drillList");
  list.innerHTML = filtered.length
    ? filtered.map(drillCardHTML).join("")
    : `<p class="muted small" style="text-align:center; padding:20px 0;">No drills match those filters.</p>`;
}

function drillCardHTML(d) {
  const tags = d.focus.map((f) => `<span class="tag-chip">${esc(f.replace("-", " "))}</span>`).join("");
  return `
    <div class="card">
      <div class="row between">
        <strong>${esc(d.name)}</strong>
        <span class="small muted">${d.defaultDurationMin} min</span>
      </div>
      <div style="margin-top:8px;">${tags}<span class="tag-chip location-${d.location}">${d.location}</span></div>
      <p class="small" style="margin-top:10px; line-height:1.5;">${esc(d.instructions)}</p>
      <p class="small muted" style="margin-top:6px;">${esc(d.equipment.join(", "))}</p>
    </div>
  `;
}

/* ---------------- Log Practice ---------------- */

function renderPractice(container, fullContainer) {
  const today = todayISO();
  const todaysPlan = store.getDayPlans()[today];
  const preChecked = new Set(todaysPlan?.type === "home-practice" ? todaysPlan.golf.drillIds : []);
  const homeDrills = GOLF_DRILLS.filter((d) => d.location === "home");

  container.innerHTML = `
    <p class="small muted" style="margin-bottom:12px;">${preChecked.size ? "Today's suggested drills are pre-checked below." : "Check off whatever you actually worked on."}</p>
    <div class="stack" id="practiceList">
      ${homeDrills.map((d) => practiceRowHTML(d, preChecked.has(d.id))).join("")}
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="field">
        <label for="practiceDuration">Total duration (min)</label>
        <input type="number" id="practiceDuration" value="${todaysPlan?.golf?.targetDurationMin || 30}" />
      </div>
      <div class="field" style="margin-top:10px;">
        <label for="practiceNotes">Notes</label>
        <textarea id="practiceNotes" placeholder="Ball flight, feels, anything to remember"></textarea>
      </div>
    </div>
    <button class="btn primary block" id="savePracticeBtn" style="margin-top:14px;">Save practice session</button>
  `;

  container.querySelectorAll(".practice-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      cb.closest(".practice-row").style.opacity = cb.checked ? "1" : "0.55";
    });
  });

  container.querySelector("#savePracticeBtn").addEventListener("click", () => savePractice(container, fullContainer));
}

function practiceRowHTML(drill, checked) {
  return `
    <div class="practice-row" data-drill-id="${drill.id}" style="opacity:${checked ? "1" : "0.55"};">
      <label class="check-label">
        <input type="checkbox" class="practice-checkbox" data-drill-id="${drill.id}" ${checked ? "checked" : ""} />
        ${esc(drill.name)}
      </label>
      ${
        drill.tracksReps
          ? `<div class="reps-fields">
              <div class="field"><label>Made</label><input type="number" min="0" class="rep-made" data-drill-id="${drill.id}" /></div>
              <div class="field"><label>Attempts</label><input type="number" min="0" class="rep-attempts" data-drill-id="${drill.id}" /></div>
            </div>`
          : ""
      }
    </div>
  `;
}

function savePractice(container, fullContainer) {
  const rows = container.querySelectorAll(".practice-row");
  const drills = [];
  rows.forEach((row) => {
    const cb = row.querySelector(".practice-checkbox");
    if (!cb.checked) return;
    const drillId = row.dataset.drillId;
    const madeInput = row.querySelector(".rep-made");
    const attemptsInput = row.querySelector(".rep-attempts");
    const entry = { drillId };
    if (madeInput && attemptsInput && (madeInput.value !== "" || attemptsInput.value !== "")) {
      entry.result = { made: Number(madeInput.value || 0), attempts: Number(attemptsInput.value || 0) };
    }
    drills.push(entry);
  });

  if (!drills.length) {
    showToast("Check off at least one drill first");
    return;
  }

  const today = todayISO();
  const logs = store.getGolfPracticeLogs();
  logs.push({
    id: uid("gp"),
    date: today,
    type: "home",
    durationMin: Number(container.querySelector("#practiceDuration").value) || null,
    drills,
    notes: container.querySelector("#practiceNotes").value,
  });
  store.setGolfPracticeLogs(logs);

  const dayPlans = store.getDayPlans();
  if (dayPlans[today]?.type === "home-practice") {
    dayPlans[today] = { ...dayPlans[today], golf: { ...dayPlans[today].golf, sessionLogged: true } };
    store.setDayPlans(dayPlans);
  }

  showToast("Practice saved");
  activeSubtab = "history";
  render(fullContainer);
}

/* ---------------- History ---------------- */

function renderHistory(container) {
  const logs = [...store.getGolfPracticeLogs()].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!logs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="glyph">⛳</span>
        <h2 style="font-size:16px;">No practice logged yet</h2>
        <p>Log a session and it'll show up here.</p>
      </div>`;
    return;
  }
  container.innerHTML = `<div class="card">${logs.map(historyItemHTML).join("")}</div>`;
}

function historyItemHTML(log) {
  const drillSummary = log.drills
    .map((d) => {
      const drill = GOLF_DRILLS.find((g) => g.id === d.drillId);
      const name = drill ? drill.name : "Drill";
      const result = d.result ? ` (${d.result.made}/${d.result.attempts})` : "";
      return `${esc(name)}${result}`;
    })
    .join(", ");
  return `
    <div class="history-item">
      <div class="hist-head"><span>${formatPretty(log.date)}</span><span class="muted">${log.durationMin ? log.durationMin + " min" : ""}</span></div>
      <div class="hist-body">
        ${drillSummary}
        ${log.notes ? `<br>"${esc(log.notes)}"` : ""}
      </div>
    </div>
  `;
}
