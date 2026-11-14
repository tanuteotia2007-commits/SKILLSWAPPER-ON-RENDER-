import { api, ApiError } from "../api.js";
import { loadMe } from "../state.js";
import { esc, firstName, greeting, pct, avatar, LEVELS } from "../utils.js";
import { icon } from "../icons.js";
import { barChart, donut, meter, PALETTE } from "../charts.js";
import { swapIllustration } from "../art.js";

export const title = "Dashboard";

export async function render() {
  const [me, growth, matches] = await Promise.all([
    loadMe(true),
    api("/growth"),
    api("/matches").catch((e) => {
      if (e instanceof ApiError && e.status === 400) return null; // profile incomplete
      throw e;
    }),
  ]);

  const verifiedN = Object.keys(me.verified).length;
  const incomplete = matches === null;
  const top = matches?.[0];
  const rated = growth.filter((g) => g.improvement != null);
  const avgGain = rated.length ? rated.reduce((s, g) => s + g.improvement, 0) / rated.length : null;
  const unverified = me.teach.filter((s) => me.verified[s] == null);

  const hero = incomplete
    ? { text: "Add the skills you can teach and the ones you want to learn, and the AI will find your swap partners.", cta: `<a class="btn" href="#/profile">${icon("user")}Complete profile</a>` }
    : top
      ? { text: `Your best swap right now is <b>${esc(top.user.name)}</b> — ${pct(top.score)}% compatible. Ready to start learning together?`,
          cta: `<a class="btn" href="#/session/${top.user.id}">${icon("chat")}Start a session</a><a class="btn cream" href="#/matches">See all matches</a>` }
      : { text: "You're one of the first here! Invite your classmates — your best swap partners will appear the moment they join and add their skills.",
          cta: `<button class="btn" type="button" data-copy-invite>${icon("link")}Copy invite link</button><a class="btn cream" href="#/profile">Edit profile</a>` };

  const tiles = `
  <div class="grid g-4">
    <article class="tile mint"><span class="t-ico">${icon("award")}</span><span class="t-label">Skills I teach</span>
      <span class="t-value">${me.teach.length}</span><span class="t-sub">${verifiedN} verified</span></article>
    <article class="tile peach"><span class="t-ico">${icon("book")}</span><span class="t-label">Skills I'm learning</span>
      <span class="t-value">${me.learn.length}</span><span class="t-sub">${rated.length} tracked in Growth</span></article>
    <article class="tile butter"><span class="t-ico">${icon("shield")}</span><span class="t-label">Trust score</span>
      <span class="t-value">${me.trust}<small> / 100</small></span><span class="t-sub">${verifiedN ? "Best verified skill" : "Take a quiz to earn trust"}</span></article>
    <article class="tile sky"><span class="t-ico">${icon("flame")}</span><span class="t-label">${top ? "Top match" : "Average growth"}</span>
      <span class="t-value">${top ? pct(top.score) + "<small>%</small>" : avgGain == null ? "—" : (avgGain >= 0 ? "+" : "") + avgGain.toFixed(1)}</span>
      <span class="t-sub">${top ? esc(top.user.name) : avgGain == null ? "Log before/after scores" : "points per skill"}</span></article>
  </div>`;

  const matchChart = matches?.length
    ? barChart(matches.slice(0, 6).map((m, i) => ({ label: m.user.name, value: m.score, display: pct(m.score) + "%", color: PALETTE[i % PALETTE.length] })), "Compatibility with your top matches")
    : `<div class="empty"><span class="e-ico">${icon("users")}</span><h3>No matches yet</h3><p>${incomplete ? "Complete your profile to see how compatible you are with other learners." : "Matches appear as soon as other learners join. Invite a few classmates!"}</p>${incomplete ? "" : `<button class="btn sm" type="button" data-copy-invite>${icon("link")}Copy invite link</button>`}</div>`;

  const verifyChart = me.teach.length
    ? donut([{ label: "Verified", value: me.teach.length - unverified.length, color: "var(--sage-deep)" }, { label: "Not verified", value: unverified.length, color: "#f2c9b4" }],
        `${me.teach.length - unverified.length}/${me.teach.length}`, "verified")
    : `<div class="empty"><span class="e-ico">${icon("shield")}</span><h3>Nothing to verify</h3><p>Add a skill you teach first.</p></div>`;

  const topList = matches?.length
    ? `<ul class="rows">${matches.slice(0, 3).map((m) => `
        <li>${avatar(m.user.name, m.user.id, "sm")}
          <div class="grow"><b>${esc(m.user.name)}</b><span>${LEVELS[m.user.level - 1]} · teaches ${esc(m.user.teach[0] || "—")}</span></div>
          <span class="pct">${pct(m.score)}%</span>
          <a class="btn round-btn sm" href="#/session/${m.user.id}" aria-label="Start session with ${esc(m.user.name)}">${icon("arrow")}</a></li>`).join("")}</ul>`
    : `<p class="muted">${incomplete ? "Complete your profile and your best partners will appear here." : "No other learners have joined yet. Share the invite link and they'll show up here."}</p>`;

  const growthList = growth.length
    ? `<ul class="rows">${growth.slice(0, 3).map((g) => `
        <li><div class="grow"><b>${esc(g.skill)}</b>${meter((g.post ?? g.pre ?? 0) / 10, "sage")}</div>
          ${g.improvement != null ? `<span class="badge ${g.improvement > 0 ? "up" : "flat"}">${g.improvement >= 0 ? "+" : ""}${g.improvement}</span>` : `<span class="badge neutral">Not rated</span>`}</li>`).join("")}</ul>`
    : `<p class="muted">Add skills you want to learn to start tracking growth.</p>`;

  const banner = unverified.length
    ? { t: `Verify “${esc(unverified[0])}” to boost your trust`, d: "A 3-question quiz plus a project link can earn up to 100 points.", href: "#/verify", b: "Verify now", ico: "shield" }
    : rated.length < growth.length
      ? { t: "Log your before / after scores", d: "See how much you've improved and get your next-step suggestion.", href: "#/growth", b: "Open Growth", ico: "trend" }
      : { t: "Keep the momentum going", d: "Open a session with a match to plan your next week of learning.", href: "#/matches", b: "Find a partner", ico: "sparkle" };

  const html = `
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <h2 id="hero-title">${greeting()}, ${esc(firstName(me.name))}!</h2>
      <p>${hero.text}</p>
      <div class="hero-actions">${hero.cta}</div>
    </div>
    ${swapIllustration("hero-art")}
  </section>
  ${tiles}
  <div class="grid g-2">
    <section class="panel"><div class="panel-head"><h3>Top match compatibility</h3><a href="#/matches">View all</a></div>${matchChart}</section>
    <section class="panel"><div class="panel-head"><h3>Teaching skills verified</h3><a href="#/verify">Verify</a></div>${verifyChart}</section>
  </div>
  <div class="grid g-2">
    <section class="panel"><div class="panel-head"><h3>Best partners</h3><a href="#/matches">See all</a></div>${topList}</section>
    <section class="panel"><div class="panel-head"><h3>Growth snapshot</h3><a href="#/growth">See all</a></div>${growthList}</section>
  </div>
  <aside class="banner"><span class="b-ico">${icon(banner.ico)}</span>
    <div class="b-copy"><b>${banner.t}</b><span>${banner.d}</span></div>
    <a class="btn sage" href="${banner.href}">${banner.b}</a></aside>`;

  return { html };
}
