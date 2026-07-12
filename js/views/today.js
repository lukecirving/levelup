import { store } from "../store.js";
import { showToast } from "../app.js";
import { formatPretty, todayISO } from "../utils/dates.js";
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

export function render(container) {
  const plan = ensureToday();

  container.innerHTML = `
    <div class="card">
      <div class="row between">
        <p class="small muted">${formatPretty(todayISO())}</p>
        <button class="ride-chip ${plan.rideStatus}" id="rideChip">${RIDE_LABEL[plan.rideStatus]}</button>
      </div>
      <div style="margin-top:10px;">${planCardHTML(plan)}</div>
    </div>

    <div class="section-title">Coming soon</div>
    <div class="card stack">
      <p class="small">Gym and golf session logging, inline habit/diet check-ins, and a proper
        dashboard land in the next few updates. Full week view is already live on the
        <strong>Schedule</strong> tab.</p>
    </div>
  `;

  container.querySelector("#rideChip").addEventListener("click", () => {
    const date = todayISO();
    const current = store.getDayPlans()[date];
    const next = sched.nextRideStatus(current?.rideStatus);
    const updated = sched.applyManualEdit(date, { rideStatus: next }, getDeps());
    store.setDayPlans(updated);
    render(container);
    showToast(RIDE_LABEL[next]);
  });
}
