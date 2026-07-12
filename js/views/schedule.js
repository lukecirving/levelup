export function render(container) {
  container.innerHTML = `
    <div class="empty-state">
      <span class="glyph">📅</span>
      <h2 style="font-size:17px; margin-bottom:6px;">Schedule is next up</h2>
      <p>This will let you mark which days you've got a ride to the gym, and
        auto-fill the rest with home practice around your front-yard net and mat.</p>
    </div>
  `;
}
