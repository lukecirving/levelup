export function render(container) {
  container.innerHTML = `
    <div class="empty-state">
      <span class="glyph">🏋️</span>
      <h2 style="font-size:17px; margin-bottom:6px;">Gym logging is coming</h2>
      <p>You'll be able to enter your existing program once, then log real
        sets/reps/weight against it every session and track progress over time.</p>
    </div>
  `;
}
