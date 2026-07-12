/** Minimal hand-rolled line chart — no charting library. Expects points
 * sorted ascending by date: [{x: "YYYY-MM-DD", y: number}]. */
export function lineChartSVG(points, opts = {}) {
  const { width = 320, height = 130, color = "var(--accent)", unit = "" } = opts;
  const padding = 14;

  if (!points.length) return `<p class="small muted">No data yet.</p>`;
  if (points.length === 1) {
    return `<p class="small muted">Log a couple more to see a trend — latest: ${points[0].y}${unit}</p>`;
  }

  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => [
    padding + i * stepX,
    padding + innerH - ((p.y - minY) / rangeY) * innerH,
  ]);

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1][0].toFixed(1)} ${(height - padding).toFixed(1)} L ${coords[0][0].toFixed(1)} ${(height - padding).toFixed(1)} Z`;

  const gridLines = [0.25, 0.5, 0.75]
    .map((f) => {
      const y = (padding + innerH * f).toFixed(1);
      return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border)" stroke-width="1" />`;
    })
    .join("");

  const last = coords[coords.length - 1];
  const labelAnchor = last[0] > width - 46 ? "end" : "middle";
  const gradId = "grad-" + Math.random().toString(36).slice(2, 9);

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:${height}px; display:block; overflow:visible;">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.28" />
          <stop offset="100%" stop-color="${color}" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#${gradId})" stroke="none" />
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" fill="${color}" />
      <text x="${last[0].toFixed(1)}" y="${Math.max(11, last[1] - 9).toFixed(1)}" font-size="11" font-weight="700" fill="${color}" text-anchor="${labelAnchor}">${points[points.length - 1].y}${unit}</text>
    </svg>
  `;
}

export function heatmapRowHTML(doneDates, days = 14) {
  const cells = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push(`<span class="heat-cell ${doneDates.has(iso) ? "done" : ""}"></span>`);
  }
  return `<div class="heat-row">${cells.join("")}</div>`;
}
