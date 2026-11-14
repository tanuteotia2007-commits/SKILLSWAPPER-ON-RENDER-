import { api, getToken, clearToken, setAuthFailHandler, ApiError } from "./api.js";
import { state, loadMe, onMeChange, resetState } from "./state.js";
import { $, $$, esc, initial, firstName, avClass } from "./utils.js";
import { icon } from "./icons.js";
import { toast, copyInvite } from "./toast.js";
import { renderAuth } from "./views/auth.js";
import * as dashboard from "./views/dashboard.js";
import * as profile from "./views/profile.js";
import * as matches from "./views/matches.js";
import * as verify from "./views/verify.js";
import * as session from "./views/session.js";
import * as growth from "./views/growth.js";

const VIEWS = { dashboard, profile, matches, verify, session, growth };
const NAV = [
  ["dashboard", "Dashboard", "home"], ["profile", "Profile", "user"], ["matches", "Matches", "users"],
  ["verify", "Verify", "shield"], ["session", "Session", "chat"], ["growth", "Growth", "trend"],
];

const root = $("#root");
let navId = 0, cleanup = null, lastKey = null, unsubMe = null, authShown = false;

/* ---------- Auth gate ---------- */
function showAuth(notice) {
  authShown = true;
  cleanup?.(); cleanup = null; lastKey = null; resetState(); unsubMe?.();
  if (location.hash) history.replaceState(null, "", location.pathname);
  document.title = "Sign in · AI Skill Swapper";
  renderAuth(root, {
    notice,
    onSuccess(mode) {
      location.hash = mode === "register" ? "#/profile" : "#/dashboard";
      showApp();
    },
  });
}
setAuthFailHandler(() => showAuth("Your session expired. Please log in again."));

async function logout() {
  try { await api("/logout", "POST"); } catch { /* token already invalid — still sign out locally */ }
  clearToken();
  showAuth();
  toast("You've been logged out");
}

/* ---------- Shell ---------- */
function paintMe(me) {
  const card = $("#me-card");
  if (!card) return;
  card.innerHTML = `<span class="avatar lg ${avClass(me.id)}" aria-hidden="true">${esc(initial(me.name))}</span>
    <strong>Hi, ${esc(firstName(me.name))}!</strong><span>${me.trust ? `Trust score ${me.trust}` : "Not verified yet"}</span>`;
  const av = $("#top-avatar");
  if (av) av.textContent = initial(me.name);
}

function showApp() {
  authShown = false;
  const navLinks = (cls) => NAV.map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}">${icon(i)}<span>${l}</span></a>`).join("");
  root.innerHTML = `
  <div class="app">
    <aside class="sidebar" aria-label="Primary">
      <div class="brand"><span class="brand-mark">${icon("swap")}</span><span class="brand-text">Skill Swapper<small>AI peer exchange</small></span></div>
      <div class="me-card" id="me-card"></div>
      <nav class="nav" aria-label="Main">${navLinks()}</nav>
      <div class="side-foot">
        <div class="side-tip"><b>Tip</b>Verified skills rank higher in everyone's matches.</div>
        <button class="btn soft" id="logout-side" style="width:100%">${icon("logout")}<span>Logout</span></button>
      </div>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <h1 id="page-title">Dashboard</h1>
        <form class="search" role="search" id="search-form"><span aria-hidden="true">${icon("search")}</span>
          <label class="sr-only" for="search">Search matches by name or skill</label>
          <input id="search" type="search" placeholder="Search matches by name or skill…" autocomplete="off"></form>
        <button class="icon-btn" id="top-avatar-btn" aria-label="Log out" title="Log out"><span id="top-avatar" style="font-weight:800"></span></button>
      </header>
      <main id="main" tabindex="-1"></main>
    </div>
    <nav class="bottom-nav" aria-label="Mobile">${navLinks()}</nav>
  </div>`;

  $("#logout-side").onclick = logout;
  $("#top-avatar-btn").onclick = logout;

  const input = $("#search");
  let t;
  const go = () => {
    const q = input.value.trim();
    const target = "#/matches" + (q ? "?q=" + encodeURIComponent(q) : "");
    if (parseHash().name === "matches") {
      history.replaceState(null, "", target);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else location.hash = target;
  };
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(go, 200); });
  $("#search-form").addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(t); go(); });

  unsubMe?.();
  unsubMe = onMeChange(paintMe);
  loadMe().then(paintMe).catch(() => {});
  route();
}

/* ---------- Router ---------- */
function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, "").split("?");
  const [name, param] = path.split("/");
  return { name: VIEWS[name] ? name : "dashboard", param, query: new URLSearchParams(qs || "") };
}

async function route() {
  if (!getToken()) { if (!authShown) showAuth(); return; }
  if (authShown) return;
  const r = parseHash();
  const key = r.name + "/" + (r.param || "");
  if (r.name === "matches" && lastKey === key && $("#m-grid")) return; // the view handles query changes itself

  const id = ++navId;
  cleanup?.(); cleanup = null; lastKey = key;
  const view = VIEWS[r.name];
  $$("[data-nav]").forEach((a) => (a.dataset.nav === r.name ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  $("#page-title").textContent = view.title;
  document.title = `${view.title} · AI Skill Swapper`;
  const search = $("#search");
  if (search && r.name !== "matches") search.value = "";
  else if (search) search.value = r.query.get("q") || "";

  const main = $("#main");
  main.innerHTML = `<div class="skeleton" style="min-height:190px"></div><div class="grid g-2"><div class="skeleton"></div><div class="skeleton"></div></div>`;
  window.scrollTo({ top: 0 });
  try {
    const out = await view.render(r);
    if (id !== navId) return;
    main.innerHTML = out.html;
    cleanup = out.mount?.(main) || null;
    main.focus({ preventScroll: true });
  } catch (e) {
    if (id !== navId || (e instanceof ApiError && e.status === 401)) return;
    main.innerHTML = `<section class="panel empty"><span class="e-ico">${icon("x")}</span><h3>Something went wrong</h3><p>${esc(e.message)}</p>
      <button class="btn" id="retry">${icon("sparkle")}Try again</button></section>`;
    $("#retry").onclick = () => { lastKey = null; route(); };
  }
}

document.addEventListener("click", (e) => { if (e.target.closest("[data-copy-invite]")) copyInvite(); });
window.addEventListener("hashchange", route);
getToken() ? showApp() : showAuth();
