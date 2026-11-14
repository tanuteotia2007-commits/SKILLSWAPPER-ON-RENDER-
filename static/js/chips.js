// Tag-style input: type a skill and press Enter or comma. Produces the same string[] the API expects.
import { esc } from "./utils.js";
import { icon } from "./icons.js";

const chipHtml = (v) =>
  `<span class="chip" data-v="${esc(v)}">${esc(v)}<button type="button" aria-label="Remove ${esc(v)}">${icon("x")}</button></span>`;

export function chipInputHtml({ id, label, values = [], kind = "teach", placeholder, hint, max = 15 }) {
  return `<div class="field">
    <label for="${id}">${esc(label)}</label>
    <div class="chips" data-chips="${id}" data-kind="${kind}" data-max="${max}">
      ${values.map(chipHtml).join("")}
      <input id="${id}" type="text" autocomplete="off" placeholder="${esc(placeholder || "")}" aria-describedby="${id}-hint">
    </div>
    <span class="hint" id="${id}-hint">${esc(hint || "")}</span>
  </div>`;
}

export function mountChips(root) {
  root.querySelectorAll("[data-chips]").forEach((box) => {
    const input = box.querySelector("input");
    const max = +box.dataset.max || 15;
    const values = () => [...box.querySelectorAll(".chip")].map((c) => c.dataset.v);

    const add = (raw) => {
      raw.split(",").map((s) => s.trim()).filter(Boolean).forEach((v) => {
        if (values().length >= max || values().some((x) => x.toLowerCase() === v.toLowerCase())) return;
        input.insertAdjacentHTML("beforebegin", chipHtml(v));
      });
      input.value = "";
    };

    box.addEventListener("click", (e) => {
      const rm = e.target.closest(".chip button");
      if (rm) { rm.closest(".chip").remove(); input.focus(); } else input.focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input.value); }
      else if (e.key === "Backspace" && !input.value) box.querySelector(".chip:last-of-type")?.remove();
    });
    input.addEventListener("blur", () => add(input.value));
    input.addEventListener("paste", (e) => {
      const t = (e.clipboardData || window.clipboardData).getData("text");
      if (t.includes(",") || t.includes("\n")) { e.preventDefault(); add(t.replace(/\n/g, ",")); }
    });
  });
}

/** Read the current chips (also commits any text still typed in the box). */
export function readChips(root, id) {
  const box = root.querySelector(`[data-chips="${id}"]`);
  const input = box.querySelector("input");
  if (input.value.trim()) input.dispatchEvent(new Event("blur"));
  return [...box.querySelectorAll(".chip")].map((c) => c.dataset.v);
}
