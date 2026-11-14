// Inline stroke icons (24x24). Decorative by default (aria-hidden).
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><circle cx="17.5" cy="9.5" r="2.7"/><path d="M17 14.2c2.5.2 4.2 1.8 4.7 4.6"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.4 3.1 7.9 7.5 9.5 4.4-1.6 7.5-5.1 7.5-9.5V6L12 3Z"/><path d="m8.8 12 2.4 2.4 4-4.4"/>',
  chat: '<path d="M4 5.5h16v10.5H9.5L5 19.5V16H4V5.5Z"/><path d="M8 9.5h8M8 12.5h5"/>',
  trend: '<path d="M3.5 17.5 9.5 11l4 4 7-8"/><path d="M15 7h5.5v5.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
  logout: '<path d="M9.5 4.5H5v15h4.5"/><path d="m15 8 4 4-4 4M19 12H9.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  swap: '<path d="M5 8h13l-3.5-3.5M19 16H6l3.5 3.5"/>',
  send: '<path d="m21 3-9.5 18-2.5-7.5L3 11 21 3Z"/><path d="m21 3-12 10.5"/>',
  flame: '<path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1.5 1 2.5 2 2.5 0-3-1-5 1-8.5Z"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 10 18.7l1-1"/>',
  video: '<rect x="3" y="6.5" width="12" height="11" rx="2.5"/><path d="m15 11 6-3.5v9L15 13"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5 9 9M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/>',
  book: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5v-13Z"/><path d="M12 6v13.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeoff: '<path d="M3 3l18 18M10.5 5.7c.5-.1 1-.2 1.5-.2 6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.6 7.3A15.600 15.600 0 0 0 2.5 12S6 18.5 12 18.5c1.500 0 2.800-.4 4-.9"/><path d="M9.900 9.900a2.800 2.800 0 0 0 4 4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.500 10.900c.6.5 1 1.200 1 2V16h5v-.1c0-.8.4-1.500 1-2A6 6 0 0 0 12 3Z"/>',
  calendar: '<rect x="3.500" y="5" width="17" height="15" rx="3"/><path d="M3.500 10h17M8 3v4M16 3v4"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/>',
  award: '<circle cx="12" cy="9" r="5.500"/><path d="m8.500 13.500-1.500 7 5-2.500 5 2.500-1.500-7"/>',
};

export const icon = (name, cls = "") =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || ""}</svg>`;
