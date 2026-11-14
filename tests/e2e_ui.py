"""Optional browser end-to-end test (needs: pip install playwright && playwright install chromium).

Start the app on an EMPTY database first, e.g.:
    DB_PATH=/tmp/e2e.db PORT=5055 python app.py
then:
    python tests/e2e_ui.py http://localhost:5055 [--shots docs/screenshots]

There is no seed data, so the test starts as the very first user (empty states), then creates a few
other real accounts through the public API and drives every workflow through the real UI:
register, profile, matches, verify, chat, growth, logout/login persistence, expired token, mobile layout.
Fails on any unexpected console error or failed API call.
"""
import sys, os, time
from playwright.sync_api import sync_playwright, expect

base = next((a for a in sys.argv[1:] if a.startswith("http")), "http://localhost:5000")
shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
if shots: os.makedirs(shots, exist_ok=True)
stamp = int(time.time())
EMAIL, PW = f"tanu{stamp}@test.com", "secret1"
problems = []
# Expected noise: web-font fetch blocked offline, and the 401s this test provokes on purpose (bad password / dead token).
EXPECTED = ("ERR_TUNNEL_CONNECTION_FAILED", "ERR_INTERNET_DISCONNECTED", "ERR_NAME_NOT_RESOLVED", "401 (UNAUTHORIZED)")


def pick(page, sel):
    """Click the styled label wrapping a visually-hidden radio/checkbox, as a user would."""
    page.locator(f"label:has({sel})").click()


def shot(page, name):
    page.evaluate("document.getElementById('toasts').replaceChildren()")  # keep transient toasts out of screenshots
    if shots: page.screenshot(path=os.path.join(shots, name + ".png"), full_page=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1366, "height": 900}, device_scale_factor=1)
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and not any(x in m.text for x in EXPECTED) and problems.append("console: " + m.text))
    page.on("pageerror", lambda e: problems.append("pageerror: " + str(e)))
    page.on("response", lambda r: r.status >= 500 and problems.append(f"{r.status} {r.url}"))

    def real_user(name, teach, learn, level, slots, verify_skill=None):
        """Another person signing up (through the public API, exactly what the Register form calls)."""
        r = ctx.request.post(base + "/api/register", data={"name": name, "email": f"{name.lower()}{stamp}@test.com", "password": PW})
        h = {"Authorization": "Bearer " + r.json()["token"]}
        ctx.request.put(base + "/api/profile", headers=h, data={"name": name, "teach": teach, "learn": learn, "level": level, "slots": slots})
        if verify_skill:
            ctx.request.post(base + "/api/verify", headers=h, data={"skill": verify_skill, "answers": [0, 1, 0], "evidence": "https://example.com/p"})
        return h, ctx.request.get(base + "/api/profile", headers=h).json()["id"]

    # --- Login screen: nothing about demo accounts
    page.goto(base)
    expect(page.locator("#a-title")).to_have_text("Welcome back")
    expect(page.locator("body")).not_to_contain_text("demo")
    shot(page, "login")
    page.click("#a-submit"); expect(page.locator("#a-err")).to_contain_text("valid email")
    page.fill("#a-email", "nobody@test.com"); page.fill("#a-pw", "wrongpass"); page.click("#a-submit")
    expect(page.locator("#a-err")).to_contain_text("Wrong email or password")

    # --- Register as the very first user
    page.click("#tab-register")
    page.fill("#a-name", "Tanu Tester"); page.fill("#a-email", EMAIL); page.fill("#a-pw", PW); page.click("#a-submit")
    expect(page).to_have_url(base + "/#/profile")

    # --- Profile: validation then save
    page.click("#p-save"); expect(page.locator("#p-err")).to_contain_text("at least one skill")
    page.fill("#p-teach", "Python Programming"); page.keyboard.press("Enter")
    page.fill("#p-teach", "Data Analysis,"); page.fill("#p-learn", "UI/UX Design"); page.keyboard.press("Enter")
    expect(page.locator('[data-chips="p-teach"] .chip')).to_have_count(2)
    page.locator('[data-chips="p-teach"] .chip button').last.click()
    expect(page.locator('[data-chips="p-teach"] .chip')).to_have_count(1)
    pick(page, "input[name=slot][value='1']"); pick(page, "input[name=slot][value='3']")
    page.click("#p-save")
    expect(page).to_have_url(base + "/#/matches")

    # --- Empty platform: honest empty states, no fake people
    expect(page.locator(".empty h3")).to_have_text("No other learners yet")
    expect(page.locator("[data-copy-invite]")).to_be_visible()
    page.click("[data-nav=dashboard] >> nth=0")
    expect(page.locator(".hero")).to_contain_text("one of the first")
    assert page.locator(".match").count() == 0
    page.click("[data-nav=session] >> nth=0")
    expect(page.locator(".empty h3")).to_have_text("No sessions yet")

    # --- Other real people join
    priya_h, priya_id = real_user("Priya", ["UI/UX Design", "Figma"], ["Python Programming"], 2, [1, 3], verify_skill="UI/UX Design")
    real_user("Rohit", ["Video Editing", "Premiere Pro"], ["Machine Learning"], 2, [2, 3])
    real_user("Sneha", ["Machine Learning", "Deep Learning"], ["Web Development"], 3, [1, 3], verify_skill="Machine Learning")
    real_user("Dev", ["React Web Development", "HTML CSS"], ["Video Editing"], 1, [0, 2])

    # --- Matches: ranking, search, verified filter
    page.click("[data-nav=matches] >> nth=0")
    expect(page.locator(".match")).to_have_count(4)
    assert page.locator(".match").first.locator("h3").inner_text().startswith("Priya"), "Priya should rank first"
    shot(page, "matches")
    page.fill("#search", "video"); page.wait_for_timeout(500)
    names = [n.split("\n")[0] for n in page.locator(".match h3").all_inner_texts()]
    assert sorted(names) == ["Dev", "Rohit"], names
    page.fill("#search", "zzzz"); page.wait_for_timeout(500)
    expect(page.locator("#m-grid .empty")).to_be_visible()
    page.fill("#search", ""); page.wait_for_timeout(500)
    pick(page, "#m-verified")
    expect(page.locator(".match")).to_have_count(2)  # Priya + Sneha are verified
    pick(page, "#m-verified")
    expect(page.locator(".match")).to_have_count(4)

    # --- Verify
    page.click("[data-nav=verify] >> nth=0")
    expect(page.locator(".quiz-q")).to_have_count(3)
    for i in range(3): pick(page, f"input[name=q{i}][value='1']")
    expect(page.locator("#q-count")).to_have_text("3 of 3 answered")
    page.fill("#v-ev", "https://github.com/a/b"); page.click("#v-submit")
    expect(page.locator("#v-result")).to_contain_text("100/100")
    expect(page.locator("#v-list")).to_contain_text("Python Programming")
    shot(page, "verify")

    # --- Session with a real partner: no automatic replies
    page.click("[data-nav=matches] >> nth=0"); page.locator(".match a.btn").first.click()
    expect(page.locator(".timeline li")).to_have_count(4)
    expect(page.locator("a[href='https://meet.google.com/new']")).to_be_visible()
    page.fill("#c-in", "Hi Priya, want to swap Python for UI/UX?"); page.press("#c-in", "Enter")
    expect(page.locator(".msg.me")).to_contain_text("swap Python")
    page.wait_for_timeout(800)
    expect(page.locator(".msg")).to_have_count(1)  # nobody answered on her behalf
    # Priya (a real person) answers from her own account
    ctx.request.post(base + f"/api/chat/{ctx.request.get(base + '/api/profile', headers={'Authorization': 'Bearer ' + page.evaluate('localStorage.t')}).json()['id']}",
                     headers=priya_h, data={"text": "Yes! Let's do Wednesday evening."})
    page.reload()
    expect(page.locator(".msg")).to_have_count(2)
    shot(page, "session")
    # the reply is visible from the Session inbox too
    page.click("[data-nav=session] >> nth=0")
    expect(page.locator(".rows").first).to_contain_text("Priya")
    expect(page.locator(".rows").first).to_contain_text("New reply")
    shot(page, "messages")

    # --- Growth
    page.click("[data-nav=growth] >> nth=0")
    page.fill(".pre", "2"); page.fill(".post", "11"); page.click(".g-save")
    expect(page.locator(".g-err")).to_contain_text("1 to 10")
    page.fill(".post", "7"); page.click(".g-save")
    expect(page.locator(".growth-card .badge")).to_contain_text("+5")
    expect(page.locator(".suggest")).to_contain_text("Great progress")
    shot(page, "growth")

    # --- Dashboard
    page.click("[data-nav=dashboard] >> nth=0")
    expect(page.locator(".hero h2")).to_contain_text("Tanu")
    expect(page.locator(".hero")).to_contain_text("Priya")
    expect(page.locator(".tile")).to_have_count(4)
    expect(page.locator(".bars .bar-col").first).to_be_visible()
    shot(page, "dashboard")
    page.click("[data-nav=profile] >> nth=0"); shot(page, "profile")

    # --- Mobile layout
    m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    mp = m.new_page(); mp.on("pageerror", lambda e: problems.append("mobile pageerror: " + str(e)))
    tok = page.evaluate("localStorage.t")
    mp.goto(base); mp.evaluate(f"localStorage.t='{tok}'"); mp.goto(base + "/#/dashboard"); mp.reload()
    expect(mp.locator(".bottom-nav")).to_be_visible(); expect(mp.locator(".sidebar")).to_be_hidden()
    mp.wait_for_selector(".tile")
    assert mp.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "horizontal overflow on mobile"
    if shots: mp.screenshot(path=os.path.join(shots, "mobile-dashboard.png"))

    # --- Logout, then log back in: everything was saved to the account
    page.click("#logout-side")
    expect(page.locator("#a-title")).to_be_visible()
    page.fill("#a-email", EMAIL); page.fill("#a-pw", PW); page.click("#a-submit")
    expect(page.locator(".hero h2")).to_contain_text("Tanu")
    page.click("[data-nav=profile] >> nth=0")
    expect(page.locator('[data-chips="p-teach"] .chip')).to_have_text(["Python Programming"])
    expect(page.locator('[data-chips="p-learn"] .chip')).to_have_text(["UI/UX Design"])
    page.click("[data-nav=verify] >> nth=0")
    expect(page.locator("#v-list")).to_contain_text("Python Programming")
    page.click("[data-nav=growth] >> nth=0")
    expect(page.locator(".growth-card .badge")).to_contain_text("+5")
    # the old token was invalidated server-side by logout
    status = ctx.request.get(base + "/api/profile", headers={"Authorization": "Bearer " + tok}).status
    assert status == 401, f"old token still valid after logout ({status})"

    # --- Dead / forged token is handled gracefully
    page.evaluate("localStorage.t='bogus'"); page.reload()
    expect(page.locator("#a-err")).to_contain_text("expired")
    b.close()

if problems:
    print("PROBLEMS:"); [print(" -", x) for x in problems]; sys.exit(1)
print("E2E OK")
