import { esc } from "./utils.js";
import { icon } from "./icons.js";

export function toast(message, type = "ok", ms = 3800) {
  const host = document.getElementById("toasts");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML = `${icon(type === "ok" ? "check" : "x")}<span>${esc(message)}</span>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Copies the site address so the user can invite classmates (matches appear as people join). */
export async function copyInvite() {
  const url = location.origin;
  try {
    await navigator.clipboard.writeText(url);
    toast("Invite link copied — share it with your classmates");
  } catch {
    window.prompt("Copy this link and share it:", url);
  }
}
