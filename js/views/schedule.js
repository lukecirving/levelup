import { store } from "../store.js";
import { showToast } from "../app.js";
import { formatShort, weekdayLabel, todayISO } from "../utils/dates.js";
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

function persistAndRerender(newDayPlans, container) {
  store.setDayPlans(newDayPlans);
  render(container);
}

function dayCardHTML(date, plan, deps) {
  const isToday = date === todayISO();
  const ride = plan.rideStatus;

  let typeRow = "";
  let detail = "";

  if (plan.type === "gym") {
    typeRow = `<div class="day-type-row"><span class="glyph">🏋️</span> Gym day</div>`;
    if (deps.gymPlan.days.length) {
      const options = deps.gymPlan.days
        .map((d) => `<option value="${d.id}" ${d.id === plan.gym.planDayId ? "selected" : ""}>${d.label}</option>`)
        .join("");
      detail = `<div class="day-detail">
        <select class="gym-day-select" data-date="${date}">${options}</select>
      </div>`;
    } else {
      detail = `<p class="day-detail">${plan.gym.planDayLabel}</p>`;
    }
  } else if (plan.type === "home-practice") {
    typeRow = `<div class="day-type-row"><span class="glyph">⛳</span> Home practice</div>`;
    detail = `<div class="day-detail">
      ${plan.golf.focus} ·
      <select class="duration-select" data-date="${date}">
        ${[20, 25, 30, 40, 45, 60].map((m) => `<option value="${m}" ${m === plan.golf.targetDurationMin ? "selected" : ""}>${m} min</option>`).join("")}
      </select>
      <br><span class="small">${drillNames(plan.golf.drillIds) || "Freestyle on the net & mat"}</span>
    </div>`;
  } else {
    typeRow = `<div class="day-type-row type-rest"><span class="glyph">😴</span> Rest day</div>`;
    detail = `<p class="day-detail">Suggested after a run of active days. Change ride status above to override.</p>`;
  }

  return `
    <div class="card day-card ${isToday ? "is-today" : ""}" data-date="${date}">
      <div class="day-head">
        <span class="day-date">${weekdayLabel(date)} · ${formatShort(date)}${isToday ? '<span class="today-badge">Today</span>' : ""}</span>
        <button class="ride-chip ${ride}" data-date="${date}">${RIDE_LABEL[ride]}</button>
      </div>
      ${typeRow}
      ${detail}
      <input type="text" class="day-note" data-date="${date}" placeholder="Add a note…" value="${(plan.notes || "").replace(/"/g, "&quot;")}" />
      ${plan.source === "user" ? `<button class="reset-link" data-date="${date}">Reset to suggested</button>` : ""}
    </div>
  `;
}

export function render(container) {
  const deps = getDeps();
  const dates = sched.windowDates();
  const generated = sched.buildSchedule(dates, deps);
  const dayPlans = { ...deps.dayPlans, ...generated };
  store.setDayPlans(dayPlans);

  container.innerHTML = `
    <div class="section-title">Next ${dates.length} days</div>
    <div class="stack">${dates.map((d) => dayCardHTML(d, dayPlans[d], deps)).join("")}</div>
    <p class="small muted" style="text-align:center; margin-top:16px;">
      Tap the ride status to cycle it. Editing any field locks that day so it won't get auto-replanned.
    </p>
  `;

  container.querySelectorAll(".ride-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const date = btn.dataset.date;
      const current = store.getDayPlans()[date];
      const next = sched.nextRideStatus(current?.rideStatus);
      const updated = sched.applyManualEdit(date, { rideStatus: next }, getDeps());
      persistAndRerender(updated, container);
      showToast(RIDE_LABEL[next]);
    });
  });

  container.querySelectorAll(".gym-day-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const date = sel.dataset.date;
      const planDay = getDeps().gymPlan.days.find((d) => d.id === sel.value);
      const updated = sched.applyManualEdit(
        date,
        { gym: { planDayId: planDay.id, planDayLabel: planDay.label, sessionLogged: store.getDayPlans()[date]?.gym?.sessionLogged || false } },
        getDeps()
      );
      persistAndRerender(updated, container);
      showToast("Gym day updated");
    });
  });

  container.querySelectorAll(".duration-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const date = sel.dataset.date;
      const current = store.getDayPlans()[date];
      const updated = sched.applyManualEdit(
        date,
        { golf: { ...current.golf, targetDurationMin: Number(sel.value) } },
        getDeps()
      );
      persistAndRerender(updated, container);
      showToast("Practice length updated");
    });
  });

  container.querySelectorAll(".day-note").forEach((input) => {
    input.addEventListener("change", () => {
      const date = input.dataset.date;
      const updated = sched.applyManualEdit(date, { notes: input.value }, getDeps());
      store.setDayPlans(updated);
      showToast("Note saved");
    });
  });

  container.querySelectorAll(".reset-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const date = btn.dataset.date;
      const updated = sched.resetToSuggested(date, getDeps());
      persistAndRerender(updated, container);
      showToast("Reset to suggested plan");
    });
  });
}
