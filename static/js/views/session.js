import { api, ApiError } from "../api.js";
import { $, esc, pct, avatar, fmtTime, LEVELS } from "../utils.js";
import { icon } from "../icons.js";
import { toast } from "../toast.js";

export const title = "Session";

const msgsHtml = (ch) => ch.map((m) => `<div class="msg ${m.mine ? "me" : ""}">${esc(m.text)}<time>${esc(fmtTime(m.ts))}</time></div>`).join("")
  || `<p class="muted">No messages yet — say hi and propose a time.</p>`;

async function picker() {
  const [convos, list] = await Promise.all([
    api("/conversations"),
    api("/matches").catch((e) => { if (e instanceof ApiError && e.status === 400) return []; throw e; }),
  ]);
  if (!convos.length && !list.length) {
    return { html: `<section class="panel empty"><span class="e-ico">${icon("chat")}</span><h3>No sessions yet</h3>
      <p>Sessions are built around a partner. Complete your profile, then pick someone from your matches — or invite classmates to join.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn" href="#/matches">Browse matches</a>
      <button class="btn cream" type="button" data-copy-invite>${icon("link")}Copy invite link</button></div></section>` };
  }
  const inbox = convos.length ? `<section class="panel"><div class="panel-head"><h2>Conversations</h2></div>
    <ul class="rows">${convos.map((c) => `<li>${avatar(c.name, c.id, "sm")}
      <div class="grow"><b>${esc(c.name)}</b><span>${c.mine ? "You: " : ""}${esc(c.text)}</span></div>
      ${c.mine ? "" : `<span class="badge">New reply</span>`}<span class="muted small">${esc(fmtTime(c.ts))}</span>
      <a class="btn sm" href="#/session/${c.id}">Open</a></li>`).join("")}</ul></section>` : "";
  const start = list.length ? `<section class="panel"><div class="panel-head"><h2>Start with a match</h2></div>
    <ul class="rows">${list.map((x) => `<li>${avatar(x.user.name, x.user.id, "sm")}
      <div class="grow"><b>${esc(x.user.name)}</b><span>${LEVELS[x.user.level - 1]} · teaches ${esc(x.user.teach.join(", "))}</span></div>
      <span class="pct">${pct(x.score)}%</span>
      <a class="btn sm" href="#/session/${x.user.id}">Start</a></li>`).join("")}</ul></section>` : "";
  return { html: inbox + start };
}

export async function render({ param }) {
  if (!param) return picker();
  const pid = +param;
  let p, ch;
  try { [p, ch] = await Promise.all([api("/plan/" + pid), api("/chat/" + pid)]); } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return { html: `<section class="panel empty"><span class="e-ico">${icon("users")}</span><h3>Partner not found</h3><p>That partner doesn't exist.</p><a class="btn" href="#/matches">Back to matches</a></section>` };
    }
    throw e;
  }

  const html = `
  <section class="panel">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap">${avatar(p.partner, pid)}
      <div style="flex:1;min-width:180px"><h2>Session with ${esc(p.partner)}</h2><span class="muted small">Your reciprocal learning plan</span></div>
      <a class="btn sage" target="_blank" rel="noopener noreferrer" href="${esc(p.meet_url)}">${icon("video")}Open Google Meet</a></div>
    <div class="skill-swap">
      <div class="box learn"><span>You learn</span><b>${esc(p.learn_skill)}</b></div>
      <span class="arrow">${icon("swap")}</span>
      <div class="box teach"><span>You teach</span><b>${esc(p.teach_skill)}</b></div>
    </div>
  </section>
  <div class="grid g-2">
    <section class="panel"><div class="panel-head"><h3>${icon("book")} Study plan: ${esc(p.learn_skill)}</h3></div>
      <ol class="timeline">${p.plan.map((w) => `<li><span class="wk">Wk ${w.week}</span><div><h4>${esc(w.title)}</h4><p>${esc(w.task)}</p></div></li>`).join("")}</ol>
      <div class="panel-head" style="margin:22px 0 6px"><h3>Revision notes</h3></div>
      <ul class="notes">${p.notes.map((n) => `<li>${icon("check")}<span>${esc(n)}</span></li>`).join("")}</ul></section>
    <section class="panel chat"><div class="panel-head"><h3>Chat with ${esc(p.partner)}</h3></div>
      <div class="chat-log" id="c-log" tabindex="0" aria-label="Chat messages">${msgsHtml(ch)}</div>
      <form class="chat-form" id="c-form"><label class="sr-only" for="c-in">Message</label>
        <input class="input" id="c-in" maxlength="500" autocomplete="off" placeholder="Type a message">
        <button class="btn round-btn" type="submit" aria-label="Send message">${icon("send")}</button></form></section>
  </div>`;

  return {
    html,
    mount(root) {
      const log = $("#c-log", root), input = $("#c-in", root);
      const draw = (list) => {
        const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
        log.innerHTML = msgsHtml(list);
        if (stick) log.scrollTop = log.scrollHeight;
      };
      log.scrollTop = log.scrollHeight;

      $("#c-form", root).addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.disabled = true;
        try {
          const list = await api("/chat/" + pid, "POST", { text });
          input.value = "";
          log.scrollTop = log.scrollHeight;
          draw(list);
          log.scrollTop = log.scrollHeight;
        } catch (ex) { toast(ex.message, "err"); }
        finally { input.disabled = false; input.focus(); }
      });

      // Pick up replies from real partners while the page is open.
      const timer = setInterval(async () => {
        if (document.hidden) return;
        try { draw(await api("/chat/" + pid)); } catch { /* transient */ }
      }, 10000);
      return () => clearInterval(timer);
    },
  };
}
