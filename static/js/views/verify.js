import { api } from "../api.js";
import { loadMe } from "../state.js";
import { $, $$, esc } from "../utils.js";
import { icon } from "../icons.js";
import { toast } from "../toast.js";
import { meter } from "../charts.js";

export const title = "Verify Skills";

let selected = null;

const quizHtml = (qs) => `
  <div class="progress-line"><span id="q-count">0 of ${qs.length} answered</span>${meter(0)}</div>
  ${qs.map((q, i) => `<fieldset class="quiz-q"><legend><h4>${i + 1}. ${esc(q.q)}</h4></legend>
    <div class="opts">${q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"><span>${esc(o)}</span></label>`).join("")}</div></fieldset>`).join("")}`;

const verifiedList = (v) => Object.keys(v).length
  ? `<ul class="rows">${Object.entries(v).map(([k, s]) => `<li><div class="grow"><b>${esc(k)}</b>${meter(s / 100, "sage")}</div><span class="pct">${s}/100</span></li>`).join("")}</ul>`
  : `<p class="muted">No verified skills yet — take a quiz to earn your first badge.</p>`;

export async function render() {
  const me = await loadMe(true);
  if (!me.teach.length) {
    return { html: `<section class="panel empty"><span class="e-ico">${icon("shield")}</span><h3>Add a skill you teach first</h3><p>Verification is for the skills you offer to others.</p><a class="btn" href="#/profile">Go to profile</a></section>` };
  }
  if (!me.teach.includes(selected)) selected = me.teach[0];
  const qs = (await api("/quiz?skill=" + encodeURIComponent(selected))).questions;

  const html = `
  <div class="grid g-main">
    <section class="panel">
      <div class="panel-head"><h2>Skill verification</h2></div>
      <fieldset><legend class="label">Choose a skill to verify</legend>
        <div class="seg" id="v-skills">${me.teach.map((s) => `<label><input type="radio" name="vskill" value="${esc(s)}" ${s === selected ? "checked" : ""}><span>${icon("check")}${esc(s)}</span></label>`).join("")}</div></fieldset>
      <form id="v-form" novalidate>
        <div id="v-quiz">${quizHtml(qs)}</div>
        <div class="field"><label for="v-ev">Project evidence link <span class="muted">(GitHub / portfolio, +30 points)</span></label>
          <input class="input" id="v-ev" type="url" inputmode="url" placeholder="https://github.com/you/project">
          <span class="hint" id="v-ev-hint">Quiz is worth 70 points. Unanswered questions count as incorrect.</span></div>
        <p class="form-error" id="v-err" role="alert"></p>
        <button class="btn sage" type="submit" id="v-submit">${icon("shield")}Get skill score</button>
      </form>
      <div class="result" id="v-result" hidden role="status"></div>
    </section>
    <aside class="panel"><div class="panel-head"><h3>Verified skills</h3></div><div id="v-list">${verifiedList(me.verified)}</div>
      <p class="hint" style="margin-top:14px">Your trust score is your highest verified skill. Higher trust boosts how you rank in other people's matches.</p></aside>
  </div>`;

  return {
    html,
    mount(root) {
      const total = qs.length;
      const updateProgress = () => {
        const n = $$(".quiz-q", root).filter((f) => f.querySelector("input:checked")).length;
        $("#q-count", root).textContent = `${n} of ${$$(".quiz-q", root).length} answered`;
        $(".progress-line .meter i", root).style.width = (n / total) * 100 + "%";
      };
      $("#v-quiz", root).addEventListener("change", updateProgress);

      $("#v-ev", root).addEventListener("input", (e) => {
        const v = e.target.value.trim();
        $("#v-ev-hint", root).textContent = v && !/^https?:\/\/\S+$/.test(v)
          ? "Link must start with http:// or https:// to earn the +30 evidence points."
          : "Quiz is worth 70 points. Unanswered questions count as incorrect.";
      });

      $("#v-skills", root).addEventListener("change", async (e) => {
        selected = e.target.value;
        $("#v-result", root).hidden = true;
        try {
          const q = (await api("/quiz?skill=" + encodeURIComponent(selected))).questions;
          $("#v-quiz", root).innerHTML = quizHtml(q);
          updateProgress();
        } catch (ex) { toast(ex.message, "err"); }
      });

      $("#v-form", root).addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = $("#v-submit", root);
        const answers = $$(".quiz-q", root).map((f) => { const c = f.querySelector("input:checked"); return c ? +c.value : -1; });
        btn.setAttribute("aria-busy", "true");
        $("#v-err", root).textContent = "";
        try {
          const r = await api("/verify", "POST", { skill: selected, answers, evidence: $("#v-ev", root).value.trim() });
          const box = $("#v-result", root);
          box.hidden = false;
          box.innerHTML = `<span class="score-pill">${r.score}</span><div><b>${esc(selected)}: ${r.score}/100</b><br>
            <span class="muted">${r.correct}/${r.total} correct${r.evidence ? " · evidence link added (+30)" : " · no valid evidence link"}</span></div>`;
          const fresh = await loadMe(true);
          $("#v-list", root).innerHTML = verifiedList(fresh.verified);
          toast(`Verified ${selected}: ${r.score}/100`);
        } catch (ex) {
          $("#v-err", root).textContent = ex.message;
        } finally {
          btn.removeAttribute("aria-busy");
        }
      });
    },
  };
}
