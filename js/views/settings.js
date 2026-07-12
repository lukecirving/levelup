import { store } from "../store.js";
import { daysBetween, todayISO } from "../utils/dates.js";
import { showToast } from "../app.js";

export function render(container) {
  const settings = store.getSettings();

  container.innerHTML = `
    <div class="section-title">Goal</div>
    <div class="card field">
      <label for="goalDate">Team tryout date</label>
      <input type="date" id="goalDate" value="${settings.goalDate || ""}" />
      <p class="small muted" id="goalPreview"></p>
    </div>

    <div class="section-title">Preferences</div>
    <div class="card field">
      <label for="units">Weight units</label>
      <select id="units">
        <option value="lb" ${settings.units === "lb" ? "selected" : ""}>Pounds (lb)</option>
        <option value="kg" ${settings.units === "kg" ? "selected" : ""}>Kilograms (kg)</option>
      </select>
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
}
