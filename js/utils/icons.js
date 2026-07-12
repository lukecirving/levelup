const wrap = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const icons = {
  today: wrap(`<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>`),
  schedule: wrap(`<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v4M16 3v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 16.5h2M11 16.5h2"/>`),
  gym: wrap(`<path d="M3 9v6M21 9v6"/><path d="M6 7v10M18 7v10"/><path d="M6 12h12"/>`),
  golf: wrap(`<path d="M6 21V5.5l10 3.2-6.5 2.9"/><ellipse cx="10" cy="21" rx="6" ry="1.4"/>`),
  settings: wrap(`<path d="M4 7h11M4 12h16M4 17h11"/><circle cx="18" cy="7" r="2.1"/><circle cx="9" cy="17" r="2.1"/>`),
};
