import { api } from "../api.js";
import { $, $$, esc } from "../utils.js";
import { icon } from "../icons.js";
import { toast } from "../toast.js";
import { meter } from "../charts.js";

export const title = "Growth";

const card = (x) => `
  <article class="panel growth-card" data-skill="${esc(x.skill)}">
    <h3>${esc(x.skill)}${x.improvement != null ? `<span class="badge ${x.improvement > 0 ? "up" : "flat"}">${x.improvement >= 0 ? "+" : ""}${x.improvement} pts</span>` : ""}</h3>
    <div class="score-inputs">
      <div class="field"><label>Before (1–10)</label><input class="input sm pre" type="number" min="1" max="10" step="1" inputmode="numeric" value="${x.pre ?? ""}"></div>
      <div class="field"><label>After (1–10)</label><input class="input sm post" type="number" min="1" max="10" step="1" inputmode="numeric" value="${x.post ?? ""}"></div>
      <button class="btn sage g-save" type="button">${icon("check")}Save</button>
    </div>
    <p class="form-error g-err" role="alert"></p>
    ${x.pre != null || x.post != null ? `<div class="compare">
      <div><span>Before</span>${meter((x.pre ?? 0) / 10, "butter")}<b>${x.pre ?? "–"}</b></div>
      <div><span>After</span>${meter((x.post ?? 0) / 10, "sage")}<b>${x.post ?? "–"}</b></div></div>` : ""}
    ${x.suggestion ? `<p class="suggest">${icon("sparkle")}<span>${esc(x.suggestion)}</span></p>` : `<p class="hint">Rate yourself before and after learning to see your improvement and a suggested next step.</p>`}
  </article>`;

export async function render() {
  const list = await api("/growth");
  if (!list.length) {
    return { html: `<section class="panel empty"><span class="e-ico">${icon("trend")}</span><h3>No skills to track yet</h3>
      <p>Add skills you want to learn to your profile and they'll show up here.</p><a class="btn" href="#/profile">Go to profile</a></section>` };
  }
  const rated = list.filter((x) => x.improvement != null);
  const avg = rated.length ? rated.reduce((s, x) => s + x.improvement, 0) / rated.length : null;

  const html = `
  <div class="banner"><span class="b-ico">${icon("trend")}</span>
    <div class="b-copy"><b>${avg == null ? "Start tracking your progress" : `Average improvement ${avg >= 0 ? "+" : ""}${avg.toFixed(1)} points`}</b>
    <span>${rated.length} of ${list.length} skills have before and after scores.</span></div></div>
  <div class="grid g-cards" id="g-grid">${list.map(card).join("")}</div>`;

  return {
    html,
    mount(root) {
      $("#g-grid", root).addEventListener("click", async (e) => {
        const btn = e.target.closest(".g-save");
        if (!btn) return;
        const c = btn.closest(".growth-card"), err = $(".g-err", c);
        const num = (el) => (el.value === "" ? null : Number(el.value));
        const pre = num($(".pre", c)), post = num($(".post", c));
        const bad = (v) => v !== null && !(Number.isInteger(v) && v >= 1 && v <= 10);
        err.textContent = "";
        if (bad(pre) || bad(post)) { err.textContent = "Scores must be whole numbers from 1 to 10."; return; }
        btn.setAttribute("aria-busy", "true");
        try {
          const fresh = await api("/growth", "POST", { skill: c.dataset.skill, pre, post });
          const x = fresh.find((g) => g.skill === c.dataset.skill);
          c.outerHTML = card(x);
          const avgNew = fresh.filter((g) => g.improvement != null);
          const b = $(".banner", root);
          const a = avgNew.length ? avgNew.reduce((s, g) => s + g.improvement, 0) / avgNew.length : null;
          b.querySelector("b").textContent = a == null ? "Start tracking your progress" : `Average improvement ${a >= 0 ? "+" : ""}${a.toFixed(1)} points`;
          b.querySelector("span:last-child").textContent = `${avgNew.length} of ${fresh.length} skills have before and after scores.`;
          toast("Growth saved");
        } catch (ex) {
          err.textContent = ex.message;
          btn.removeAttribute("aria-busy");
        }
      });
    },
  };
}
