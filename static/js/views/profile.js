import { api } from "../api.js";
import { loadMe } from "../state.js";
import { $, $$, esc, SLOTS, LEVELS, avatar } from "../utils.js";
import { icon } from "../icons.js";
import { chipInputHtml, mountChips, readChips } from "../chips.js";
import { toast } from "../toast.js";
import { meter } from "../charts.js";

export const title = "My Profile";

export async function render() {
  const m = await loadMe(true);
  const checks = [
    ["Add your name", !!m.name.trim()],
    ["List a skill you teach", m.teach.length > 0],
    ["List a skill you want to learn", m.learn.length > 0],
    ["Pick your availability", m.slots.length > 0],
    ["Verify one skill", Object.keys(m.verified).length > 0],
  ];
  const done = checks.filter((c) => c[1]).length;

  const html = `
  <div class="grid g-main">
    <form class="panel" id="profile-form" novalidate>
      <div class="panel-head"><h2>Your details</h2></div>
      <div class="field"><label for="p-name">Name</label><input class="input" id="p-name" value="${esc(m.name)}" autocomplete="name" maxlength="60"></div>
      ${chipInputHtml({ id: "p-teach", label: "Skills I can teach", values: m.teach, kind: "teach", placeholder: "e.g. Python, Figma — press Enter", hint: "Up to 15 skills. Press Enter or comma to add." })}
      ${chipInputHtml({ id: "p-learn", label: "Skills I want to learn", values: m.learn, kind: "learn", placeholder: "e.g. Machine Learning — press Enter", hint: "The AI pairs these with what others teach." })}
      <fieldset><legend class="label">My level</legend>
        <div class="seg">${LEVELS.map((x, i) => `<label><input type="radio" name="level" value="${i + 1}" ${m.level === i + 1 ? "checked" : ""}><span>${icon("check")}${x}</span></label>`).join("")}</div></fieldset>
      <fieldset><legend class="label">Availability</legend>
        <div class="seg">${SLOTS.map((x, i) => `<label><input type="checkbox" name="slot" value="${i}" ${m.slots.includes(i) ? "checked" : ""}><span>${icon("check")}${x}</span></label>`).join("")}</div></fieldset>
      <p class="form-error" id="p-err" role="alert"></p>
      <button class="btn" type="submit" id="p-save">${icon("sparkle")}Save &amp; find matches</button>
    </form>
    <aside class="panel">
      <div class="panel-head"><h3>Profile strength</h3><span class="pct">${Math.round((done / checks.length) * 100)}%</span></div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">${avatar(m.name, m.id, "lg")}<div><b>${esc(m.name)}</b><br><span class="muted small">${LEVELS[m.level - 1]} · Trust ${m.trust}/100</span></div></div>
      ${meter(done / checks.length, "sage")}
      <ul class="strength" style="margin-top:12px">${checks.map(([t, ok]) => `<li class="${ok ? "done" : ""}"><span class="dot">${icon("check")}</span>${t}</li>`).join("")}</ul>
    </aside>
  </div>`;

  return {
    html,
    mount(root) {
      mountChips(root);
      $("#profile-form", root).addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = $("#p-err", root), btn = $("#p-save", root);
        const teach = readChips(root, "p-teach"), learn = readChips(root, "p-learn");
        err.textContent = "";
        if (!teach.length || !learn.length) { err.textContent = "Add at least one skill to teach and one to learn."; return; }
        btn.setAttribute("aria-busy", "true");
        try {
          await api("/profile", "PUT", {
            name: $("#p-name", root).value,
            teach, learn,
            level: +($("input[name=level]:checked", root)?.value || 2),
            slots: $$("input[name=slot]:checked", root).map((x) => +x.value),
          });
          await loadMe(true);
          toast("Profile saved — finding your matches");
          location.hash = "#/matches";
        } catch (ex) {
          err.textContent = ex.message;
        } finally {
          btn.removeAttribute("aria-busy");
        }
      });
    },
  };
}
