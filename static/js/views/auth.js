import { api, setToken } from "../api.js";
import { $, esc } from "../utils.js";
import { icon } from "../icons.js";
import { swapIllustration } from "../art.js";

/** Renders the sign-in / register screen into `root`. onSuccess(mode) runs after a token is stored. */
export function renderAuth(root, { onSuccess, notice } = {}) {
  let mode = "login";

  root.innerHTML = `
  <div class="auth-page"><main class="auth" id="main">
    <aside class="auth-art">
      <div class="brand"><span class="brand-mark">${icon("swap")}</span><span class="brand-text">Skill Swapper<small>AI peer exchange</small></span></div>
      <h2>Teach what you know. Learn what you love.</h2>
      <ul>
        <li><i>${icon("users")}</i>AI matches you with peers whose skills mirror yours</li>
        <li><i>${icon("shield")}</i>Verify your skills with a quiz and project proof</li>
        <li><i>${icon("chat")}</i>Get a study plan, notes, chat and a Meet link</li>
        <li><i>${icon("trend")}</i>Track before/after growth for every skill</li>
      </ul>
      ${swapIllustration("illu")}
    </aside>
    <section class="auth-form">
      <h1 id="a-title">Welcome back</h1>
      <p class="muted" id="a-sub">Sign in to continue swapping skills.</p>
      <div class="auth-tabs" role="tablist" aria-label="Account">
        <button type="button" role="tab" id="tab-login" aria-selected="true" aria-controls="auth-form">Login</button>
        <button type="button" role="tab" id="tab-register" aria-selected="false" aria-controls="auth-form">Register</button>
      </div>
      <form id="auth-form" novalidate>
        <div class="field" id="name-field" hidden><label for="a-name">Name</label>
          <input class="input" id="a-name" autocomplete="name" placeholder="Your name"></div>
        <div class="field"><label for="a-email">Email</label>
          <input class="input" id="a-email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
        <div class="field"><label for="a-pw">Password</label>
          <div class="input-wrap"><input class="input" id="a-pw" type="password" autocomplete="current-password" placeholder="At least 6 characters" required>
          <button type="button" id="pw-toggle" aria-label="Show password">${icon("eye")}</button></div></div>
        <p class="form-error" id="a-err" role="alert">${esc(notice || "")}</p>
        <button class="btn" type="submit" id="a-submit" style="width:100%">Login</button>
      </form>
    </section>
  </main></div>`;

  const f = $("#auth-form", root), err = $("#a-err", root), submit = $("#a-submit", root);

  const setMode = (m) => {
    mode = m;
    $("#tab-login", root).setAttribute("aria-selected", m === "login");
    $("#tab-register", root).setAttribute("aria-selected", m === "register");
    $("#name-field", root).hidden = m !== "register";
    $("#a-title", root).textContent = m === "login" ? "Welcome back" : "Create your account";
    $("#a-sub", root).textContent = m === "login" ? "Sign in to continue swapping skills." : "Join in a minute — then tell us what you teach and want to learn.";
    $("#a-pw", root).autocomplete = m === "login" ? "current-password" : "new-password";
    submit.textContent = m === "login" ? "Login" : "Create account";
    err.textContent = "";
  };
  $("#tab-login", root).onclick = () => setMode("login");
  $("#tab-register", root).onclick = () => setMode("register");

  $("#pw-toggle", root).onclick = (e) => {
    const pw = $("#a-pw", root), show = pw.type === "password";
    pw.type = show ? "text" : "password";
    e.currentTarget.innerHTML = icon(show ? "eyeoff" : "eye");
    e.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
  };


  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#a-name", root).value.trim(), email = $("#a-email", root).value.trim(), password = $("#a-pw", root).value;
    err.textContent = "";
    if (mode === "register" && !name) return (err.textContent = "Please enter your name.");
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) return (err.textContent = "Enter a valid email address.");
    if (!password) return (err.textContent = "Enter your password.");
    if (mode === "register" && password.length < 6) return (err.textContent = "Password must be at least 6 characters.");
    submit.setAttribute("aria-busy", "true");
    try {
      const r = mode === "login" ? await api("/login", "POST", { email, password }) : await api("/register", "POST", { name, email, password });
      setToken(r.token);
      onSuccess?.(mode);
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      submit.removeAttribute("aria-busy");
    }
  });
}
