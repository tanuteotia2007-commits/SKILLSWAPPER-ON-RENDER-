// Original illustration: two "skill orbs" trading places. Used on the dashboard hero and the sign-in screen.
export const swapIllustration = (cls = "") => `
<svg class="${cls}" viewBox="0 0 250 170" role="img" aria-label="Two people swapping skills" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="o1" cx="32%" cy="28%" r="75%"><stop offset="0" stop-color="#ffd9c6"/><stop offset=".55" stop-color="#f6a789"/><stop offset="1" stop-color="#e97e5b"/></radialGradient>
    <radialGradient id="o2" cx="32%" cy="28%" r="75%"><stop offset="0" stop-color="#e9f6e8"/><stop offset=".55" stop-color="#a9d3b4"/><stop offset="1" stop-color="#5fa488"/></radialGradient>
  </defs>
  <ellipse cx="125" cy="160" rx="108" ry="7" fill="#d9b99b" opacity=".45"/>
  <circle cx="76" cy="88" r="52" fill="url(#o1)"/>
  <circle cx="176" cy="88" r="52" fill="url(#o2)"/>
  <ellipse cx="58" cy="62" rx="16" ry="9" fill="#fff" opacity=".35" transform="rotate(-30 58 62)"/>
  <ellipse cx="158" cy="62" rx="16" ry="9" fill="#fff" opacity=".35" transform="rotate(-30 158 62)"/>
  <!-- left: code brackets -->
  <path d="M64 76 50 90l14 14M88 76l14 14-14 14M80 72l-8 36" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- right: sparkle / design -->
  <path d="m176 62 8 18 18 8-18 8-8 18-8-18-18-8 18-8Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
  <!-- swap arrows -->
  <g fill="none" stroke="#d9623d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M100 30c14-12 36-12 50 0M143 22l8 8-9 7"/>
    <path d="M150 146c-14 12-36 12-50 0M107 154l-8-8 9-7"/>
  </g>
  <g fill="#f3c24f"><circle cx="24" cy="28" r="5"/><circle cx="228" cy="140" r="4"/><path d="m232 30 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></g>
</svg>`;
