"""Backend API tests. No seed data exists, so the tests create their own real users.
Runs on SQLite by default. To run against Postgres: DATABASE_URL=postgresql://... python tests/test_api.py
"""
import os, sys, tempfile, sqlite3, unittest
if not os.environ.get("DATABASE_URL"):
    os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t.db")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app as A, db


class T(unittest.TestCase):
    def setUp(self): self.c = A.app.test_client()

    def H(self, t): return {"Authorization": "Bearer " + t}

    def signup(self, name, email, teach, learn, level=2, slots=(1, 3)):
        r = self.c.post("/api/register", json={"name": name, "email": email, "password": "secret1"})
        self.assertEqual(r.status_code, 200)
        h = self.H(r.json["token"])
        p = self.c.put("/api/profile", headers=h, json={"name": name, "teach": teach, "learn": learn, "level": level, "slots": list(slots)})
        self.assertEqual(p.status_code, 200)
        return h, p.json["id"]

    def test_fresh_database_has_no_users(self):
        c = db.conn()
        n = c.execute("SELECT COUNT(*) AS n FROM users WHERE email LIKE '%@demo.com'").fetchone()["n"]
        c.close()
        self.assertEqual(n, 0)

    def test_full_flow_with_two_real_users(self):
        # --- auth
        self.assertEqual(self.c.post("/api/register", json={"name": "x", "email": "bad", "password": "123456"}).status_code, 400)
        ha, aid = self.signup("Tanu", "tanu@x.com", ["Python Programming"], ["UI/UX Design"])
        self.assertEqual(self.c.post("/api/register", json={"name": "T", "email": "TANU@x.com", "password": "secret1"}).status_code, 409)
        self.assertEqual(self.c.post("/api/login", json={"email": "tanu@x.com", "password": "nope"}).status_code, 401)
        self.assertEqual(self.c.get("/api/matches").status_code, 401)

        # --- alone on the platform: no matches, but no crash either
        self.assertEqual(self.c.get("/api/matches", headers=ha).json, [])

        # --- a second real user joins; matching is reciprocal
        hb, bid = self.signup("Priya", "priya@x.com", ["UI/UX Design", "Figma"], ["Python Programming"])
        m = self.c.get("/api/matches", headers=ha).json
        self.assertEqual([x["user"]["name"] for x in m], ["Priya"])
        self.assertIn("Python", m[0]["why"])
        self.assertNotIn("email", m[0]["user"])
        self.assertGreater(m[0]["score"], 0.8)

        # --- profile incomplete -> 400
        r = self.c.post("/api/register", json={"name": "New", "email": "new@x.com", "password": "secret1"})
        self.assertEqual(self.c.get("/api/matches", headers=self.H(r.json["token"])).status_code, 400)

        # --- verification persists and updates (upsert)
        self.assertEqual(len(self.c.get("/api/quiz?skill=Python Programming", headers=ha).json["questions"]), 3)
        v = self.c.post("/api/verify", headers=ha, json={"skill": "Python Programming", "answers": [0, 0, 0], "evidence": ""}).json
        self.assertEqual(v["score"], 0)
        v = self.c.post("/api/verify", headers=ha, json={"skill": "Python Programming", "answers": [1, 1, 1], "evidence": "https://github.com/a/b"}).json
        self.assertEqual(v["score"], 100)
        self.assertEqual(self.c.get("/api/profile", headers=ha).json["verified"], {"Python Programming": 100})
        self.assertEqual(self.c.post("/api/verify", headers=ha, json={"skill": "Nope", "answers": []}).status_code, 400)

        # --- plan
        pl = self.c.get(f"/api/plan/{bid}", headers=ha).json
        self.assertEqual(len(pl["plan"]), 4); self.assertEqual(pl["partner"], "Priya")
        self.assertEqual(self.c.get(f"/api/plan/{aid}", headers=ha).status_code, 404)
        self.assertEqual(self.c.get("/api/plan/99999", headers=ha).status_code, 404)

        # --- real two-way chat: no automatic replies
        self.assertEqual(self.c.get("/api/conversations", headers=hb).json, [])
        sent = self.c.post(f"/api/chat/{bid}", headers=ha, json={"text": "hello Priya"}).json
        self.assertEqual(len(sent), 1)
        self.assertEqual(self.c.post(f"/api/chat/{bid}", headers=ha, json={"text": "   "}).status_code, 400)
        inbox = self.c.get("/api/conversations", headers=hb).json
        self.assertEqual([(i["name"], i["text"], i["mine"]) for i in inbox], [("Tanu", "hello Priya", False)])
        self.assertRegex(inbox[0]["ts"], r"^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$")
        thread = self.c.post(f"/api/chat/{aid}", headers=hb, json={"text": "hi Tanu!"}).json
        self.assertEqual([(x["mine"], x["text"]) for x in thread], [(False, "hello Priya"), (True, "hi Tanu!")])
        self.assertEqual(len(self.c.get(f"/api/chat/{bid}", headers=ha).json), 2)

        # --- growth
        self.c.post("/api/growth", headers=ha, json={"skill": "UI/UX Design", "pre": 2})
        g = self.c.post("/api/growth", headers=ha, json={"skill": "UI/UX Design", "post": 7}).json
        self.assertEqual(g[0]["improvement"], 5)
        self.assertEqual(self.c.post("/api/growth", headers=ha, json={"skill": "UI/UX Design", "post": 11}).status_code, 400)
        self.assertEqual(self.c.post("/api/growth", headers=ha, json={"skill": "Nope", "pre": 2}).status_code, 400)

        # --- data survives logging out and back in (this is what "saved to my account" means)
        self.assertEqual(self.c.post("/api/logout", headers=ha).status_code, 200)
        self.assertEqual(self.c.get("/api/profile", headers=ha).status_code, 401)  # old token is dead
        t2 = self.c.post("/api/login", json={"email": "tanu@x.com", "password": "secret1"}).json["token"]
        me = self.c.get("/api/profile", headers=self.H(t2)).json
        self.assertEqual((me["teach"], me["learn"], me["trust"]), (["Python Programming"], ["UI/UX Design"], 100))
        self.assertEqual(self.c.get("/api/growth", headers=self.H(t2)).json[0]["post"], 7)
        self.assertEqual(len(self.c.get(f"/api/chat/{bid}", headers=self.H(t2)).json), 2)

        # --- misc
        self.assertEqual(self.c.get("/").status_code, 200)
        self.assertEqual(self.c.get("/api/health").json["ok"], True)
        self.assertEqual(self.c.get("/api/nope").status_code, 404)

    def test_old_demo_accounts_are_purged(self):
        c = db.conn()
        c.execute("INSERT INTO users(name,email,pw,demo) VALUES('Meera','meera@demo.com','x',1)")
        uid = c.execute("SELECT id FROM users WHERE email='meera@demo.com'").fetchone()["id"]
        c.execute("INSERT INTO skills(user_id,name,kind) VALUES(?,?,'teach')", (uid, "Machine Learning"))
        c.execute("INSERT INTO messages(sender,receiver,text) VALUES(?,?,'hi')", (uid, uid))
        c.commit(); c.close()
        db.init()
        c = db.conn()
        left = [c.execute(q).fetchone()["n"] for q in (
            "SELECT COUNT(*) AS n FROM users WHERE demo=1", "SELECT COUNT(*) AS n FROM skills WHERE name='Machine Learning'",
            "SELECT COUNT(*) AS n FROM messages WHERE text='hi'")]
        c.close()
        self.assertEqual(left, [0, 0, 0])


if __name__ == "__main__":
    unittest.main()
