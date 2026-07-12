import { formatPretty, todayISO } from "../utils/dates.js";

export function render(container) {
  container.innerHTML = `
    <div class="card">
      <p class="small muted">${formatPretty(todayISO())}</p>
      <h2 style="margin-top:6px; font-size:20px;">Today's plan is coming soon</h2>
      <p class="muted small" style="margin-top:8px; line-height:1.5;">
        This dashboard will show your gym-or-home-practice plan for today,
        plus quick habit and diet check-ins, once the schedule engine is built.
      </p>
    </div>
    <div class="section-title">In the meantime</div>
    <div class="card stack">
      <p class="small">Head to <strong>Settings</strong> to set your team-tryout date so the app can start
        weighting your practice plan as it gets closer.</p>
    </div>
  `;
}
