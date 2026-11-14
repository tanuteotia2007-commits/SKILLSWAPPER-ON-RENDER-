// Dependency-free chart helpers (HTML/SVG strings). Colours come from CSS custom properties.
import { esc, pct } from "./utils.js";

export const PALETTE = ["var(--coral)", "#e3a92b", "var(--sage-deep)", "#5b8db8", "#a07bc0", "#d9778a"];

/** Vertical bars. items: [{label, value (0..1), display, color?}] */
export function barChart(items, aria) {
  return `<div class="bars" role="img" aria-label="${esc(aria)}">${items.map((it, i) => `
    <div class="bar-col">
      <span class="bar-val">${esc(it.display)}</span>
      <div class="bar-track"><i style="height:${Math.max(0, Math.min(1, it.value)) * 100}%;--c:${it.color || PALETTE[i % PALETTE.length]}"></i></div>
      <span class="bar-lab" title="${esc(it.label)}">${esc(it.label)}</span>
    </div>`).join("")}</div>`;
}

/** Donut. parts: [{label, value, color}] — values are counts. */
export function donut(parts, centerBig, centerSmall) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let offset = 0;
  const segs = parts.filter((p) => p.value > 0).map((p) => {
    const len = (p.value / total) * 100;
    const gap = parts.filter((q) => q.value > 0).length > 1 ? 1.2 : 0;
    const s = `<circle cx="21" cy="21" r="15.915" stroke="${p.color}" stroke-dasharray="${Math.max(0, len - gap)} ${100 - Math.max(0, len - gap)}" stroke-dashoffset="${-offset}" stroke-linecap="round"/>`;
    offset += len;
    return s;
  }).join("");
  const label = parts.map((p) => `${p.label}: ${p.value}`).join(", ");
  return `<div class="donut-wrap">
    <div class="donut" role="img" aria-label="${esc(label)}">
      <svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.915" stroke="#f1e3d2"/>${segs}</svg>
      <div class="center"><b>${esc(centerBig)}</b><span>${esc(centerSmall)}</span></div>
    </div>
    <ul class="legend">${parts.map((p) => `<li><i style="--c:${p.color}"></i>${esc(p.label)}<b>${p.value}</b></li>`).join("")}</ul>
  </div>`;
}

/** Circular progress ring for a 0..1 value. */
export function ring(value, color = "var(--coral)") {
  const v = Math.max(0, Math.min(1, value));
  return `<div class="ring" role="img" aria-label="${pct(v)} percent">
    <svg viewBox="0 0 42 42"><circle class="track" cx="21" cy="21" r="15.915"/>
    <circle cx="21" cy="21" r="15.915" stroke="${color}" stroke-linecap="round" stroke-dasharray="${v * 100} ${100 - v * 100}"/></svg>
    <b>${pct(v)}%</b></div>`;
}

export const meter = (v, cls = "") =>
  `<div class="meter ${cls}" role="presentation"><i style="width:${Math.max(0, Math.min(1, v)) * 100}%"></i></div>`;
