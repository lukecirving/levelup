import { icons } from "./utils/icons.js";
import { store } from "./store.js";
import { daysBetween, todayISO } from "./utils/dates.js";
import * as todayView from "./views/today.js";
import * as scheduleView from "./views/schedule.js";
import * as gymView from "./views/gym.js";
import * as golfView from "./views/golf.js";
import * as settingsView from "./views/settings.js";

const TABS = [
  { id: "today", label: "Today", view: todayView },
  { id: "schedule", label: "Schedule", view: scheduleView },
  { id: "gym", label: "Gym", view: gymView },
  { id: "golf", label: "Golf", view: golfView },
  { id: "settings", label: "Settings", view: settingsView },
];

const viewEl = document.getElementById("view");
const navEl = document.getElementById("tabbar");
const goalChipEl = document.getElementById("goalChip");

function currentRoute() {
  const id = (location.hash || "#today").replace("#", "");
  return TABS.some((t) => t.id === id) ? id : "today";
}

function renderNav() {
  const active = currentRoute();
  navEl.innerHTML = TABS.map(
    (t) => `
    <button class="tab" data-route="${t.id}" aria-current="${t.id === active ? "page" : "false"}">
      ${icons[t.id]}
      <span>${t.label}</span>
    </button>`
  ).join("");
  navEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => { location.hash = "#" + btn.dataset.route; });
  });
}

function renderGoalChip() {
  const settings = store.getSettings();
  if (!settings.goalDate) {
    goalChipEl.textContent = "Set tryout date";
    goalChipEl.classList.add("is-empty");
    return;
  }
  const n = daysBetween(todayISO(), settings.goalDate);
  goalChipEl.classList.remove("is-empty");
  goalChipEl.textContent = n >= 0 ? `${n}d to tryout` : "Tryout date passed";
}

function renderView() {
  const route = currentRoute();
  const tab = TABS.find((t) => t.id === route);
  viewEl.innerHTML = "";
  tab.view.render(viewEl);
  renderNav();
  renderGoalChip();
  viewEl.scrollTo(0, 0);
}

export function showToast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

window.addEventListener("hashchange", renderView);
renderView();
