import { api, ApiError } from "../api.js";
import { $, esc, pct, avatar, tagList, SLOTS, LEVELS } from "../utils.js";
import { icon } from "../icons.js";
import { ring, meter } from "../charts.js";

export const title = "Matches";

const card = (x) => `
  <article class="panel match" data-id="${x.user.id}">
    <div class="match-top">${avatar(x.user.name, x.user.id)}
      <div class="grow"><h3>${esc(x.user.name)}${x.user.trust ? `<span class="badge">${icon("shield")}Trust ${x.user.trust}</span>` : ""}</h3>
        <span class="muted small">${LEVELS[x.user.level - 1]}</span></div>
      ${ring(x.score)}</div>
    <div class="mini-bars">
      <div><span>Skill fit</span>${meter(x.mutual)}<b>${pct(x.mutual)}%</b></div>
      <div><span>Level</span>${meter(x.level, "butter")}<b>${pct(x.level)}%</b></div>
      <div><span>Availability</span>${meter(x.availability, "sky")}<b>${pct(x.availability)}%</b></div>
    </div>
    <div><div class="kv">Teaches</div><div class="tags">${tagList(x.user.teach)}</div></div>
    <div><div class="kv">Wants to learn</div><div class="tags">${tagList(x.user.learn, "want")}</div></div>
    ${x.common_slots.length ? `<div><div class="kv">Shared availability</div><div class="tags">${tagList(x.common_slots.map((i) => SLOTS[i]), "slot")}</div></div>` : ""}
    <p class="why">${icon("bulb")}<span>${esc(x.why)}</span></p>
    <a class="btn" href="#/session/${x.user.id}">${icon("chat")}Start session</a>
  </article>`;

export async function render({ query }) {
  let list;
  try { list = await api("/matches"); } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      return { html: `<section class="panel empty"><span class="e-ico">${icon("user")}</span><h3>Complete your profile first</h3>
        <p>Tell us what you can teach and want to learn so the AI can rank your best partners.</p><a class="btn" href="#/profile">Go to profile</a></section>` };
    }
    throw e;
  }

  if (!list.length) {
    return { html: `<section class="panel empty"><span class="e-ico">${icon("users")}</span><h3>No other learners yet</h3>
      <p>You're one of the first members. As soon as classmates sign up and add what they teach and want to learn, the AI will rank them here.</p>
      <button class="btn" type="button" data-copy-invite>${icon("link")}Copy invite link</button></section>` };
  }

  const html = `
  <div class="toolbar"><p class="muted grow" id="m-count" aria-live="polite"></p>
    <div class="seg"><label><input type="checkbox" id="m-verified"><span>${icon("check")}Verified only</span></label></div></div>
  <div class="grid g-cards" id="m-grid"></div>`;

  return {
    html,
    mount(root) {
      const grid = $("#m-grid", root), count = $("#m-count", root), ver = $("#m-verified", root);
      const draw = () => {
        const q = (new URLSearchParams(location.hash.split("?")[1] || "").get("q") || "").trim().toLowerCase();
        const items = list.filter((x) => (!ver.checked || x.user.trust > 0) &&
          (!q || [x.user.name, ...x.user.teach, ...x.user.learn].some((s) => s.toLowerCase().includes(q))));
        count.textContent = `${items.length} of ${list.length} partner${list.length === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}, best first`;
        grid.innerHTML = items.map(card).join("") ||
          `<section class="panel empty" style="grid-column:1/-1"><span class="e-ico">${icon("search")}</span><h3>No matches found</h3><p>Try a different search or turn off the verified filter.</p></section>`;
      };
      ver.addEventListener("change", draw);
      window.addEventListener("hashchange", draw);
      draw();
      return () => window.removeEventListener("hashchange", draw);
    },
  };
}
