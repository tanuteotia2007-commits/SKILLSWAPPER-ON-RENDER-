export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);

export const SLOTS = ["Weekday noon", "Weekday evening", "Weekend morning", "Weekend evening"];
export const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const initial = (name) => (String(name || "?").trim()[0] || "?").toUpperCase();
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "there";
export const avClass = (id) => "av-" + (Number(id) || 0) % 6;
export const pct = (v) => Math.round((Number(v) || 0) * 100);

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "Hello" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// SQLite CURRENT_TIMESTAMP is UTC ("YYYY-MM-DD HH:MM:SS").
export function fmtTime(ts) {
  const d = new Date(String(ts).replace(" ", "T") + "Z");
  if (isNaN(d)) return "";
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? time : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " · " + time;
}

export const tagList = (arr, cls = "") => arr.map((s) => `<span class="tag ${cls}">${esc(s)}</span>`).join("");
export const avatar = (name, id, size = "") => `<span class="avatar ${size} ${avClass(id)}" aria-hidden="true">${esc(initial(name))}</span>`;
