"""AI Skill Swapper - Flask backend (REST API + serves the frontend)."""
import json, re, secrets
try:  # optional: load variables from a local .env file if python-dotenv is installed
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from functools import wraps
from flask import Flask, request, jsonify, g
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash, check_password_hash
import db, matching, quiz

app = Flask(__name__, static_folder="static", static_url_path="")
db.init()


def auth(f):
    @wraps(f)
    def wrap(*a, **k):
        t = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        c = db.conn()
        u = c.execute("SELECT id FROM users WHERE token=?", (t,)).fetchone() if t else None
        if not u:
            c.close(); return jsonify(error="Please log in"), 401
        g.c, g.uid = c, u["id"]
        return f(*a, **k)
    return wrap


@app.teardown_request
def _close(_):
    c = g.pop("c", None)
    if c: c.close()


@app.errorhandler(Exception)
def _error(e):
    if isinstance(e, HTTPException):
        return (jsonify(error=e.name), e.code) if request.path.startswith("/api") else e
    app.logger.exception("Unhandled error")
    return jsonify(error="Server error. Please try again in a moment."), 500


@app.get("/")
def home():
    return app.send_static_file("index.html")


@app.get("/api/health")
def health():
    c = db.conn()
    try:
        c.execute("SELECT 1").fetchone()
    finally:
        c.close()
    return jsonify(ok=True, database="postgresql" if db.PG else "sqlite")


@app.post("/api/register")
def register():
    d = request.get_json(silent=True) or {}
    name, email, pw = (d.get("name") or "").strip(), (d.get("email") or "").strip().lower(), d.get("password") or ""
    if not name or not re.match(r"^[^@\s]+@[^@\s]+$", email) or len(pw) < 6:
        return jsonify(error="Valid name, email and 6+ char password required"), 400
    c, t = db.conn(), secrets.token_hex(16)
    if c.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        c.close(); return jsonify(error="Email already registered"), 409
    try:
        c.execute("INSERT INTO users(name,email,pw,token) VALUES(?,?,?,?)", (name, email, generate_password_hash(pw), t))
        c.commit()
    except Exception:
        c.close()  # most likely a concurrent sign-up with the same email; anything else is a real error
        c2 = db.conn()
        taken = c2.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone()
        c2.close()
        if taken: return jsonify(error="Email already registered"), 409
        raise
    c.close()
    return jsonify(token=t)


@app.post("/api/login")
def login():
    d = request.get_json(silent=True) or {}
    c = db.conn()
    u = c.execute("SELECT * FROM users WHERE email=?", ((d.get("email") or "").strip().lower(),)).fetchone()
    if not u or not check_password_hash(u["pw"], d.get("password") or ""):
        c.close(); return jsonify(error="Wrong email or password"), 401
    t = secrets.token_hex(16)
    c.execute("UPDATE users SET token=? WHERE id=?", (t, u["id"])); c.commit(); c.close()
    return jsonify(token=t)


@app.post("/api/logout")
@auth
def logout():
    g.c.execute("UPDATE users SET token=NULL WHERE id=?", (g.uid,)); g.c.commit()
    return jsonify(ok=True)


@app.get("/api/profile")
@auth
def get_profile():
    return jsonify(db.full(g.c, g.uid))


@app.put("/api/profile")
@auth
def put_profile():
    d = request.get_json(silent=True) or {}
    clean = lambda v: [s.strip() for s in (v or []) if isinstance(s, str) and s.strip()][:15]
    teach, learn = clean(d.get("teach")), clean(d.get("learn"))
    if not teach or not learn: return jsonify(error="Add at least one skill to teach and one to learn"), 400
    level = d.get("level") if d.get("level") in (1, 2, 3) else 2
    slots = [s for s in (d.get("slots") or []) if s in (0, 1, 2, 3)]
    g.c.execute("UPDATE users SET name=?,level=?,slots=? WHERE id=?", ((d.get("name") or "").strip() or "Student", level, json.dumps(slots), g.uid))
    g.c.execute("DELETE FROM skills WHERE user_id=?", (g.uid,))
    for s in teach: g.c.execute("INSERT INTO skills(user_id,name,kind) VALUES(?,?,'teach')", (g.uid, s))
    for s in learn: g.c.execute("INSERT INTO skills(user_id,name,kind) VALUES(?,?,'learn')", (g.uid, s))
    g.c.commit()
    return jsonify(db.full(g.c, g.uid))


def _me_and_others():
    people = db.everyone(g.c)
    me = people[g.uid]
    return me, [p for i, p in people.items() if i != g.uid and p["teach"] and p["learn"]]


@app.get("/api/matches")
@auth
def matches():
    me, others = _me_and_others()
    if not me["teach"] or not me["learn"]: return jsonify(error="Complete your profile first"), 400
    return jsonify(matching.rank(me, others)[:10])


@app.get("/api/quiz")
@auth
def get_quiz():
    skill = request.args.get("skill", "")
    if skill not in db.full(g.c, g.uid)["teach"]: return jsonify(error="Not one of your teach skills"), 400
    return jsonify(questions=quiz.questions(skill))


@app.post("/api/verify")
@auth
def verify():
    d = request.get_json(silent=True) or {}
    skill = d.get("skill", "")
    if skill not in db.full(g.c, g.uid)["teach"]: return jsonify(error="Not one of your teach skills"), 400
    r = quiz.score(skill, d.get("answers") or [], d.get("evidence", ""))
    g.c.execute("INSERT INTO verifications(user_id,skill,score,evidence) VALUES(?,?,?,?) "
                "ON CONFLICT(user_id,skill) DO UPDATE SET score=excluded.score, evidence=excluded.evidence",
                (g.uid, skill, r["score"], d.get("evidence", "")[:300]))
    g.c.commit()
    return jsonify(r)


@app.get("/api/plan/<int:pid>")
@auth
def plan(pid):
    me, p = db.full(g.c, g.uid), db.full(g.c, pid)
    if not p or pid == g.uid: return jsonify(error="Partner not found"), 404
    cmp = matching.compare(me, p)
    ls, ts = cmp["learn_from"] or me["learn"][0], cmp["teach_to"] or me["teach"][0]
    return jsonify(partner=p["name"], learn_skill=ls, teach_skill=ts, plan=quiz.study_plan(ls, me["level"]),
                   notes=quiz.revision_notes(ls), meet_url="https://meet.google.com/new")


@app.route("/api/chat/<int:pid>", methods=["GET", "POST"])
@auth
def chat(pid):
    p = db.full(g.c, pid)
    if not p or pid == g.uid: return jsonify(error="Partner not found"), 404
    if request.method == "POST":
        text = ((request.get_json(silent=True) or {}).get("text") or "").strip()[:500]
        if not text: return jsonify(error="Empty message"), 400
        g.c.execute("INSERT INTO messages(sender,receiver,text) VALUES(?,?,?)", (g.uid, pid, text))
        g.c.commit()
    rows = g.c.execute("SELECT sender,text,ts FROM messages WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY id",
                       (g.uid, pid, pid, g.uid)).fetchall()
    return jsonify([{"mine": r["sender"] == g.uid, "text": r["text"], "ts": db.ts(r["ts"])} for r in rows])


@app.get("/api/conversations")
@auth
def conversations():
    """One row per person you've exchanged messages with, newest first (lets users see incoming messages)."""
    rows = g.c.execute("SELECT sender,receiver,text,ts FROM messages WHERE sender=? OR receiver=? ORDER BY id DESC",
                       (g.uid, g.uid)).fetchall()
    last = {}
    for r in rows:
        last.setdefault(r["receiver"] if r["sender"] == g.uid else r["sender"], r)
    names = {}
    if last:
        marks = ",".join("?" * len(last))
        names = {u["id"]: u["name"] for u in g.c.execute(f"SELECT id,name FROM users WHERE id IN ({marks})", tuple(last)).fetchall()}
    return jsonify([{"id": pid, "name": names[pid], "text": r["text"], "mine": r["sender"] == g.uid, "ts": db.ts(r["ts"])}
                    for pid, r in last.items() if pid in names])


@app.route("/api/growth", methods=["GET", "POST"])
@auth
def growth():
    if request.method == "POST":
        d = request.get_json(silent=True) or {}
        skill = d.get("skill", "")
        if skill not in db.full(g.c, g.uid)["learn"]: return jsonify(error="Not one of your learn skills"), 400
        ok = lambda v: v is None or (isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 10)
        if not (ok(d.get("pre")) and ok(d.get("post"))): return jsonify(error="Scores must be 1-10"), 400
        g.c.execute("INSERT INTO growth(user_id,skill) VALUES(?,?) ON CONFLICT DO NOTHING", (g.uid, skill))
        for col in ("pre", "post"):
            if d.get(col) is not None: g.c.execute(f"UPDATE growth SET {col}=? WHERE user_id=? AND skill=?", (d[col], g.uid, skill))
        g.c.commit()
    me = db.full(g.c, g.uid)
    rows = {r["skill"]: r for r in g.c.execute("SELECT * FROM growth WHERE user_id=?", (g.uid,)).fetchall()}
    out = []
    for s in me["learn"]:
        r = rows.get(s); pre, post = (r["pre"], r["post"]) if r else (None, None)
        out.append({"skill": s, "pre": pre, "post": post, "improvement": None if pre is None or post is None else post - pre,
                    "suggestion": quiz.suggestion(pre, post)})
    return jsonify(out)


if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
