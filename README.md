<div align="center">

# 🔄 AI Skill Swapper

**A peer-to-peer skill exchange platform. An AI matcher pairs you with someone who teaches what you want to learn, and learns what you can teach.**

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-production-4169E1?logo=postgresql&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20(ES%20modules)-F7DF1E?logo=javascript&logoColor=black)

<img src="docs/screenshots/dashboard.png" alt="Dashboard" width="900">

</div>

---

## Table of contents
1. [Overview](#overview)
2. [Features](#features)
3. [Screenshots](#screenshots)
4. [Tech stack](#tech-stack)
5. [Architecture & folder structure](#architecture--folder-structure)
6. [Getting started](#getting-started)
7. [Configuration](#configuration)
8. [Database](#database)
9. [API overview](#api-overview)
10. [How the AI matching works](#how-the-ai-matching-works)
11. [Testing](#testing)
12. [Deployment (Render + persistent database)](#deployment-render--persistent-database)
13. [Design system](#design-system)
14. [Known limitations](#known-limitations)

## Overview
Learning is faster when you teach. AI Skill Swapper (SkillSync · CSE-AIML(B), MIET) lets students list what they can **teach** and what they want to **learn**, then ranks other learners by how well the two sides line up, factoring in skill similarity, experience level and shared availability. From a match you get a 4-week study plan, revision notes, a real-time-ish chat and a Google Meet link, and you can track your before/after growth.

**There is no demo or seed data.** The platform starts empty; every profile, match and message comes from real people who register. Each account's data is stored in the database and is there the next time that person logs in.

## Features
| | Feature | What it does |
|---|---|---|
| 🤝 | **AI reciprocal matching** | Semantic skill similarity + level + availability, with a plain-English explanation of every match |
| 🛡️ | **Skill verification & trust** | 3-question quiz (70 pts) + project evidence link (30 pts) → trust score shown on your profile |
| 💬 | **Learning session copilot** | Study plan, revision notes, two-way partner chat with an inbox, and a one-click Google Meet |
| 📈 | **Growth & proof of learning** | Before/after self-scores, improvement, and an AI-suggested next step |
| 🏠 | **Dashboard** | Overview of your skills, trust, best matches, growth and a suggested next action |
| 🔗 | **Invite link** | One click copies the site address to bring classmates in (matches appear as people join) |

UI extras: responsive layout (sidebar → icon rail → bottom nav), searchable/filterable matches, tag-style skill inputs, toasts, loading skeletons, empty and error states, keyboard and screen-reader support, reduced-motion support.

## Screenshots
Screenshots were captured from a test database with a few sample accounts created through the normal sign-up API.

| Sign in | Profile |
|---|---|
| ![Login](docs/screenshots/login.png) | ![Profile](docs/screenshots/profile.png) |

| Matches | Verify |
|---|---|
| ![Matches](docs/screenshots/matches.png) | ![Verify](docs/screenshots/verify.png) |

| Session & messages | Chat |
|---|---|
| ![Messages](docs/screenshots/messages.png) | ![Session](docs/screenshots/session.png) |

| Growth | Mobile |
|---|---|
| ![Growth](docs/screenshots/growth.png) | <img src="docs/screenshots/mobile-dashboard.png" alt="Mobile dashboard" width="260"> |

## Tech stack
- **Frontend:** HTML5, CSS3 (custom properties, no framework), vanilla JavaScript ES modules. No build step.
- **Backend:** Python 3, Flask REST API, Gunicorn for production
- **Database:** SQLite for local development, **PostgreSQL** in production (selected automatically by `DATABASE_URL`)
- **AI:** hashed n-gram + synonym embeddings with cosine similarity (built in), or optionally `sentence-transformers` (`all-MiniLM-L6-v2`)
- **Auth:** per-user bearer token, passwords hashed with Werkzeug (scrypt)

## Architecture & folder structure
```
skill-swapper/
├── app.py              # Flask app: REST API + serves the frontend
├── db.py               # Database layer: SQLite (local) / PostgreSQL (DATABASE_URL), schema, helpers
├── matching.py         # Embeddings, cosine similarity, multi-factor ranking
├── quiz.py             # Quiz bank, scoring, study plan, revision notes, growth tips
├── static/
│   ├── index.html      # App shell (loads CSS + one ES module entry)
│   ├── css/styles.css  # Design tokens + all components, responsive rules
│   └── js/
│       ├── main.js     # Shell (sidebar, topbar, search), hash router, auth gate
│       ├── api.js      # fetch wrapper, token storage, 401 handling
│       ├── state.js    # Cached profile shared by shell and views
│       ├── charts.js   # Dependency-free bar / donut / ring / meter helpers
│       ├── chips.js    # Tag input used for skills
│       ├── icons.js · art.js · toast.js · utils.js
│       └── views/      # auth · dashboard · profile · matches · verify · session · growth
├── tests/
│   ├── test_api.py     # Backend API tests (unittest) — SQLite or PostgreSQL
│   └── e2e_ui.py       # Optional browser end-to-end test (Playwright)
├── docs/screenshots/
├── .env.example · requirements.txt · Procfile
```
**Data flow:** the browser loads `index.html`, the router in `main.js` picks a view from `location.hash` (`#/matches`, `#/session/3` …), the view calls the REST API through `api.js` with the stored bearer token, and renders HTML. The dashboard has no endpoint of its own: it combines `/api/profile`, `/api/matches` and `/api/growth`.

## Getting started
**Prerequisites:** Python 3.10+.

```bash
git clone <your-repo-url> && cd <repo>
python -m venv .venv && source .venv/bin/activate     # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py                                         # → http://localhost:5000
```
Open the page, click **Register**, create an account and fill in your profile. A local SQLite file (`skillswapper.db`) is created automatically. To see matches locally, register a second account in a private window.

There is no frontend build or install step; Flask serves `static/` directly.

## Configuration
All settings are environment variables (see [`.env.example`](.env.example)). `.env` is loaded automatically if `python-dotenv` is installed; otherwise export the variables in your shell.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Port for `python app.py` (hosts like Render set this) |
| `DATABASE_URL` | *(empty)* | PostgreSQL connection string. **Set this in production** so data persists. When empty, SQLite is used |
| `DB_PATH` | `./skillswapper.db` | SQLite file location (used only when `DATABASE_URL` is empty) |
| `USE_ST` | `0` | `1` enables `sentence-transformers` embeddings (`pip install sentence-transformers`) |

No secrets are hardcoded. Keep `DATABASE_URL` in your host's environment settings, never in the repository.

## Database
Tables are created automatically on start-up (`CREATE TABLE IF NOT EXISTS`), on both SQLite and PostgreSQL. Existing data is never touched.

| Table | Purpose |
|---|---|
| `users` | name, email (unique), password hash, session token, level (1–3), availability slots (JSON) |
| `skills` | `user_id`, `name`, `kind` = `teach` \| `learn` |
| `verifications` | `(user_id, skill)` → score, evidence |
| `messages` | sender, receiver, text, UTC timestamp |
| `growth` | `(user_id, skill)` → pre / post self-scores |

**Migrations:** there are no schema changes to apply. On start-up the app also removes any leftover demo accounts (rows flagged `demo=1` by older versions of this project) together with their skills, messages and scores. Real accounts are never touched.

**Backups:** use your database provider's backup/export tools (e.g. `pg_dump "$DATABASE_URL" > backup.sql`).

## API overview
All endpoints are under `/api`. Everything except register, login and health needs `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | `{name, email, password≥6}` → `{token}` |
| POST | `/login` | `{email, password}` → `{token}` |
| POST | `/logout` | Invalidates the current token |
| GET / PUT | `/profile` | Read / update name, teach[], learn[], level (1–3), slots[] (0–3) |
| GET | `/matches` | Top 10 ranked partners with score breakdown and explanation |
| GET | `/quiz?skill=` | Quiz questions for one of your teach skills |
| POST | `/verify` | `{skill, answers[], evidence}` → score |
| GET | `/plan/<partner_id>` | Study plan, revision notes, Meet link |
| GET / POST | `/chat/<partner_id>` | Conversation / send `{text}` |
| GET | `/conversations` | Everyone you've exchanged messages with, newest first |
| GET / POST | `/growth` | Per-skill before/after (1–10) with improvement and suggestion |
| GET | `/health` | `{ok, database}` — handy for uptime checks |

Errors are `{ "error": "message" }` with an appropriate status code (400, 401, 404, 409, 500).

## How the AI matching works
For each pair the score is `0.6 × skill fit + 0.2 × level closeness + 0.2 × shared availability + 0.05 × trust`, capped at 1. Skill fit is computed in both directions (what they teach vs. what you want, and the reverse) using cosine similarity between skill embeddings. The built-in embedding needs no downloads; setting `USE_ST=1` swaps in MiniLM for better semantics.

## Testing
```bash
python tests/test_api.py                  # backend: auth, profile, matching, quiz, plan, two-way chat, growth, persistence
```
The suite creates its own users (there is no seed data), and also verifies that old demo accounts are purged. To run it against PostgreSQL: `DATABASE_URL=postgresql://... python tests/test_api.py` (use a scratch database).

Optional full-UI test (drives a real browser against the real API; fails on any console error):
```bash
pip install playwright && playwright install chromium
DB_PATH=./e2e.db PORT=5055 python app.py &          # must start from an EMPTY database
python tests/e2e_ui.py http://localhost:5055 --shots docs/screenshots
```
It starts as the very first user (checking the empty states), then covers register/login/logout, validation errors, profile save, matches search and filters, quiz verification, two-way chat, growth, the dashboard, persistence across logout/login, token invalidation and a mobile viewport overflow check.

## Deployment (Render + persistent database)
**Why a database is needed:** free web hosts such as Render give the app an *ephemeral* disk, so a SQLite file is wiped on every restart or redeploy. Use a hosted PostgreSQL database and give the app its connection string in `DATABASE_URL`.

### 1. Create a PostgreSQL database (pick one)
- **Neon (or Supabase / another free Postgres host):** create a project, then copy the **connection string** (it looks like `postgresql://user:password@host/dbname?sslmode=require`). Free plans have storage and compute limits and may pause when idle — check the provider's current terms.
- **Render PostgreSQL:** *New + → PostgreSQL*, then copy the **Internal Database URL** (use it if the web service is in the same Render region). Note: Render's **free** Postgres expires 30 days after creation, so pick a paid plan for anything long-lived.

### 2. Create the web service on Render
1. Push this repo to GitHub.
2. *New + → Web Service* → select the repo.
3. Settings: **Build** `pip install -r requirements.txt` · **Start** `gunicorn app:app` · Root Directory empty.
4. Under **Environment**, add `DATABASE_URL` = the connection string from step 1.
5. *Create Web Service* (or *Manual Deploy → Deploy latest commit* if it already exists).

### 3. Check it
Open `https://<your-service>.onrender.com/api/health`. You should see `{"database":"postgresql","ok":true}`. Then register, log out, and log back in: your profile is stored in the database and survives restarts and redeploys.

Free web services sleep after ~15 minutes of inactivity; the first request afterwards can take up to a minute.

## Design system
Soft "clay" pastel look: cream canvas, sage navigation, peach / butter / mint / sky cards, raised rounded surfaces with inner highlights, coral primary actions. Tokens (colours, radii, shadows) live at the top of [`static/css/styles.css`](static/css/styles.css). The rounded font is **Nunito** from Google Fonts, with a system rounded fallback if offline.
Responsive tiers: ≥1000px full sidebar · 760–1000px icon rail · <760px bottom tab bar.

## Known limitations
- Auth tokens don't expire by time (they're replaced on each login and cleared on logout). There is no password reset or email verification yet. Add both before a large public launch.
- Chat picks up new messages by polling every 10 seconds, not WebSockets; the Session page lists conversations but there are no push notifications.
- No rate limiting or CSRF layer; add them (e.g. Flask-Limiter) for production.
- The quiz bank is small (3 questions per topic area).
