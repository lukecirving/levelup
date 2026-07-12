import { addDays, daysBetween, todayISO } from "./utils/dates.js";
import { GOLF_DRILLS } from "./data/golfDrills.js";

export const RIDE_STATUS_CYCLE = ["confirmed", "maybe", "none", "unset"];
export const WINDOW_DAYS = 9;

export function nextRideStatus(current) {
  const i = RIDE_STATUS_CYCLE.indexOf(current || "unset");
  return RIDE_STATUS_CYCLE[(i + 1) % RIDE_STATUS_CYCLE.length];
}

export function typeFromRideStatus(rideStatus) {
  return rideStatus === "confirmed" || rideStatus === "maybe" ? "gym" : "home-practice";
}

// Weeks-until-goal -> how hard to lean on home practice. Suggestion only;
// never locks anything, never overrides a manual edit.
export function emphasisTier(dateISO, goalDate) {
  if (!goalDate) return { durationMin: 30, focus: "Balanced practice" };
  const weeksLeft = daysBetween(dateISO, goalDate) / 7;
  if (weeksLeft > 8) return { durationMin: 30, focus: "Balanced practice" };
  if (weeksLeft > 4) return { durationMin: 45, focus: "Ball-striking + short game" };
  if (weeksLeft > 1) return { durationMin: 45, focus: "Short game + scoring" };
  if (weeksLeft >= 0) return { durationMin: 25, focus: "Tempo + light taper" };
  return { durationMin: 30, focus: "Balanced practice" };
}

export function windowDates(startISO = todayISO(), count = WINDOW_DAYS) {
  return Array.from({ length: count }, (_, i) => addDays(startISO, i));
}

function dateHash(dateISO) {
  let h = 0;
  for (let i = 0; i < dateISO.length; i++) h = (h * 31 + dateISO.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Deterministic per-date drill pick: same (date, tier, recent logs) always
 * produces the same result, so it's stable across re-renders. It only
 * changes when the tier shifts (goal date getting closer) or the user
 * actually logs a practice session — never just from reopening the app.
 */
function pickHomeDrills(dateISO, tier, golfPracticeLogs) {
  const home = GOLF_DRILLS.filter((d) => d.location === "home");
  if (!home.length) return [];

  const focusText = tier.focus.toLowerCase();
  const priority = home.filter((d) => d.focus.some((f) => focusText.includes(f.replace("-", " "))));
  const ordered = priority.length ? [...priority, ...home.filter((d) => !priority.includes(d))] : home;

  const recentIds = new Set(
    [...golfPracticeLogs]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3)
      .flatMap((log) => log.drills.map((d) => d.drillId))
  );
  const fresh = ordered.filter((d) => !recentIds.has(d.id));
  const pool = fresh.length >= 2 ? fresh : ordered;

  const count = Math.max(2, Math.min(4, Math.round(tier.durationMin / 15)));
  const start = dateHash(dateISO) % pool.length;
  const picks = [];
  for (let i = 0; i < count && i < pool.length; i++) picks.push(pool[(start + i) % pool.length].id);
  return picks;
}

function findPlanDayIndex(gymPlan, planDayId) {
  if (!planDayId) return -1;
  return gymPlan.days.findIndex((d) => d.id === planDayId);
}

function seedCursor(gymPlan, existingDayPlans, gymSessions, beforeDate) {
  // Prefer the most recent gym day already on the calendar before this window...
  const priorDates = Object.keys(existingDayPlans)
    .filter((d) => d < beforeDate && existingDayPlans[d].type === "gym" && existingDayPlans[d].gym?.planDayId)
    .sort();
  if (priorDates.length) {
    const last = existingDayPlans[priorDates[priorDates.length - 1]];
    const idx = findPlanDayIndex(gymPlan, last.gym.planDayId);
    if (idx !== -1) return idx;
  }
  // ...else fall back to the most recent actually-logged session.
  const sessions = [...gymSessions].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sessions.length) {
    const idx = findPlanDayIndex(gymPlan, sessions[sessions.length - 1].planDayId);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Recompute the schedule for `dates` (in order), preserving any day the
 * user has manually locked. Returns a plain { [date]: dayPlan } object —
 * callers merge it into the full store.
 */
export function buildSchedule(dates, { gymPlan, gymSessions, dayPlans, checklistItems, goalDate, golfPracticeLogs = [] }) {
  const result = {};
  const habitFocus = checklistItems.filter((i) => i.active).map((i) => i.id);
  let cursor = seedCursor(gymPlan, dayPlans, gymSessions, dates[0]);
  const recentTypes = [];
  for (let i = 1; i <= 6; i++) {
    const d = addDays(dates[0], -i);
    recentTypes.unshift(dayPlans[d]?.type || null);
  }

  for (const date of dates) {
    const existing = dayPlans[date];

    if (existing?.locked) {
      result[date] = existing;
      if (existing.type === "gym" && existing.gym?.planDayId) {
        const idx = findPlanDayIndex(gymPlan, existing.gym.planDayId);
        if (idx !== -1) cursor = idx;
      }
      recentTypes.push(existing.type);
      recentTypes.shift();
      continue;
    }

    const rideStatus = existing?.rideStatus || "unset";
    let type = typeFromRideStatus(rideStatus);
    const trailing6Active = recentTypes.every((t) => t === "gym" || t === "home-practice");
    if (rideStatus === "unset" && trailing6Active) type = "rest";

    const plan = { date, rideStatus, type, habitFocus, notes: existing?.notes || "", source: "auto", locked: false };

    if (type === "gym") {
      if (gymPlan.days.length) {
        cursor = (cursor + 1) % gymPlan.days.length;
        const planDay = gymPlan.days[cursor];
        plan.gym = { planDayId: planDay.id, planDayLabel: planDay.label, sessionLogged: existing?.gym?.sessionLogged || false };
      } else {
        plan.gym = { planDayId: null, planDayLabel: "Set up your plan in Gym → My Plan", sessionLogged: false };
      }
    } else if (type === "home-practice") {
      const tier = emphasisTier(date, goalDate);
      const durationMin = existing?.golf?.targetDurationMin || tier.durationMin;
      plan.golf = {
        targetDurationMin: durationMin,
        focus: tier.focus,
        drillIds: pickHomeDrills(date, { ...tier, durationMin }, golfPracticeLogs),
        sessionLogged: existing?.golf?.sessionLogged || false,
      };
    }

    result[date] = plan;
    recentTypes.push(type);
    recentTypes.shift();
  }

  return result;
}

/**
 * Apply a manual edit to one day: recompute *just that day* in rotation
 * context, then lock it. Only `date`'s entry is written — neighboring days
 * are left untouched here since they're recomputed live on every render
 * anyway (see buildSchedule), so touching them here would just be stale
 * the moment the view re-renders.
 */
export function applyManualEdit(date, patch, deps) {
  const dayPlans = { ...deps.dayPlans };
  const working = { ...dayPlans, [date]: { ...(dayPlans[date] || {}), ...patch, locked: false } };
  const contextDates = windowDates(addDays(date, -6), 7);
  const rebuilt = buildSchedule(contextDates, { ...deps, dayPlans: working });
  const finalDay = { ...rebuilt[date], ...patch, locked: true, source: "user" };
  return { ...dayPlans, [date]: finalDay };
}

export function resetToSuggested(date, deps) {
  const dayPlans = { ...deps.dayPlans };
  const working = { ...dayPlans };
  if (working[date]) working[date] = { ...working[date], locked: false };
  const contextDates = windowDates(addDays(date, -6), 7);
  const rebuilt = buildSchedule(contextDates, { ...deps, dayPlans: working });
  return { ...dayPlans, [date]: rebuilt[date] };
}
