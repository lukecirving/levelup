import { store } from "../store.js";
import { daysBetween, todayISO } from "../utils/dates.js";
import { showToast, isInstallable, isStandalone, isIOS, triggerInstall } from "../app.js";
import { esc } from "../utils/esc.js";
import { uid } from "../utils/ids.js";

function installSectionHTML() {
  if (isStandalone()) {
    return `<div class="card"><p class="small">✓ You're using the installed app.</p></div>`;
  }
  if (isInstallable()) {
    return `<button class="btn primary block" id="installBtn">Install LevelUp</button>`;
  }
  if (isIOS()) {
    return `<div class="card"><p class="small">On iPhone/iPad: tap the <strong>Share</strong> icon in Safari, then <strong>Add to Home Screen</strong>.</p></div>`;
  }
  return `<div class="card"><p class="small muted">Look for an "Install" or "Add to Home Screen" option in your browser's menu.</p></div>`;
}

export function render(container) {
  const settings = store.getSettings();
  const items = store.getChecklistItems();

  container.innerHTML = `
    <div class="section-title">Goal</div>
    <div class="card field">
      <label for="goalDate">Team tryout date</label>
      <input type="date" id="goalDate" value="${settings.goalDate || ""}" />
      <p class="small muted" id="goalPreview"></p>
    </div>

    <div class="section-title">Install</div>
    ${installSectionHTML()}

    <div class="section-title">Preferences</div>
    <div class="card field">
      <label for="units">Weight units</label>
      <select id="units">
        <option value="lb" ${settings.units === "lb" ? "selected" : ""}>Pounds (lb)</option>
        <option value="kg" ${settings.units === "kg" ? "selected" : ""}>Kilograms (kg)</option>
      </select>
    </div>

    <div class="section-title">Habit checklist items</div>
    <div class="card stack">
      ${items.filter((i) => i.category === "habit").map(itemRowHTML).join("") || `<p class="small muted">No habit items yet.</p>`}
      <div class="row" style="gap:8px;">
        <input type="text" id="newHabitLabel" placeholder="New habit…" style="flex:1;" />
        <button class="btn" id="addHabitBtn">Add</button>
      </div>
    </div>

    <div class="section-title">Diet checklist items</div>
    <div class="card stack">
      ${items.filter((i) => i.category === "diet").map(itemRowHTML).join("") || `<p class="small muted">No diet items yet.</p>`}
      <div class="row" style="gap:8px;">
        <input type="text" id="newDietLabel" placeholder="New diet item…" style="flex:1;" />
        <button class="btn" id="addDietBtn">Add</button>
      </div>
    </div>

    <div class="section-title">Backup</div>
    <div class="card stack">
      <p class="small muted">Everything is stored only on this device. Export a backup
        regularly so you don't lose your logs, and import it if you switch phones.</p>
      <div class="row">
        <button class="btn" id="exportBtn" style="flex:1;">Export backup</button>
        <button class="btn" id="importBtn" style="flex:1;">Import backup</button>
      </div>
      <input type="file" id="importFile" accept="application/json" style="display:none;" />
    </div>

    <div class="section-title">Danger zone</div>
    <div class="card stack">
      <button class="btn danger block" id="resetBtn">Erase all app data</button>
    </div>

    <p class="small muted" style="text-align:center; margin-top:22px;">LevelUp · v0.1</p>
  `;

  const goalInput = container.querySelector("#goalDate");
  const goalPreview = container.querySelector("#goalPreview");
  function updatePreview() {
    if (!goalInput.value) { goalPreview.textContent = "No date set yet."; return; }
    const n = daysBetween(todayISO(), goalInput.value);
    goalPreview.textContent = n >= 0 ? `${n} day${n === 1 ? "" : "s"} to go.` : "That date has passed.";
  }
  updatePreview();
  goalInput.addEventListener("change", () => {
    const s = store.getSettings();
    s.goalDate = goalInput.value || null;
    store.setSettings(s);
    updatePreview();
    showToast("Goal date saved");
  });

  const installBtn = container.querySelector("#installBtn");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      const accepted = await triggerInstall();
      showToast(accepted ? "Installed!" : "Install dismissed");
      render(container);
    });
  }

  container.querySelector("#units").addEventListener("change", (e) => {
    const s = store.getSettings();
    s.units = e.target.value;
    store.setSettings(s);
    showToast("Units updated");
  });

  container.querySelector("#exportBtn").addEventListener("click", () => {
    store.exportAll();
    showToast("Backup downloaded");
  });

  const fileInput = container.querySelector("#importFile");
  container.querySelector("#importBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      store.importAll(text);
      showToast("Backup restored");
      render(container);
    } catch {
      showToast("That file couldn't be read");
    }
    fileInput.value = "";
  });

  container.querySelector("#resetBtn").addEventListener("click", () => {
    if (!confirm("Erase all LevelUp data on this device? This can't be undone unless you have a backup.")) return;
    store.resetAll();
    showToast("All data erased");
    render(container);
  });

  wireChecklistEvents(container);
}

function itemRowHTML(item) {
  return `
    <div class="row between" data-item-id="${item.id}">
      <span class="${item.active ? "" : "muted"}" style="font-size:14px;">${item.icon ? item.icon + " " : ""}${esc(item.label)}</span>
      <div class="row" style="gap:6px;">
        <button class="btn ghost toggle-item-btn" data-id="${item.id}" style="padding:6px 10px; font-size:12px;">${item.active ? "Hide" : "Show"}</button>
        <button class="icon-btn delete-item-btn" data-id="${item.id}" aria-label="Delete item">✕</button>
      </div>
    </div>
  `;
}

function addChecklistItem(category, label) {
  const items = store.getChecklistItems();
  const inCategory = items.filter((i) => i.category === category);
  items.push({
    id: uid(category),
    category,
    label,
    icon: "",
    active: true,
    order: inCategory.length ? Math.max(...inCategory.map((i) => i.order)) + 1 : 1,
  });
  store.setChecklistItems(items);
}

function wireChecklistEvents(container) {
  container.querySelectorAll(".toggle-item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const items = store.getChecklistItems();
      const item = items.find((i) => i.id === btn.dataset.id);
      item.active = !item.active;
      store.setChecklistItems(items);
      render(container);
    });
  });

  container.querySelectorAll(".delete-item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this checklist item? Past history for it is kept, but it won't be logged going forward.")) return;
      const items = store.getChecklistItems().filter((i) => i.id !== btn.dataset.id);
      store.setChecklistItems(items);
      render(container);
      showToast("Item deleted");
    });
  });

  container.querySelector("#addHabitBtn").addEventListener("click", () => {
    const input = container.querySelector("#newHabitLabel");
    const label = input.value.trim();
    if (!label) return;
    addChecklistItem("habit", label);
    render(container);
    showToast("Habit added");
  });

  container.querySelector("#addDietBtn").addEventListener("click", () => {
    const input = container.querySelector("#newDietLabel");
    const label = input.value.trim();
    if (!label) return;
    addChecklistItem("diet", label);
    render(container);
    showToast("Diet item added");
  });
}
