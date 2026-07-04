# QuizApp — Setup Guide

## 1. Backend setup
```bash
cd backend
npm install
cp .env.example .env      # then fill in MONGO_URI, JWT_SECRET, FRONTEND_URL etc.
npm run seed               # creates the AWS/Docker topics + (optionally) an admin user
npm start                   # starts the API on PORT (default 3000)
```

To get an admin account, either:
- Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before running `npm run seed`, or
- Sign up normally on the site, then in MongoDB set that user's `role` field to `"admin"`.

## 2. Frontend
The root-level HTML/CSS/JS files (`index.html`, `topics.html`, `sets.html`, `quiz.html`,
etc.) are static — host them anywhere (S3, Netlify, a simple `http-server`, etc.).
Just make sure `common.js`'s `API_BASE` points at your running backend.

The `quizzes/` folder holds the actual question content as static JSON, organized as
`quizzes/<topic-slug>/<subtopic-slug>/<set-slug>.json`. These must be deployed alongside
the rest of the front-end files (same web server/bucket) — the backend does not serve them.

## 3. What was fixed / completed in this pass

**Critical bugs**
- `User` schema didn't match the `passwordHash` field used by the auth routes — registration was failing on the backend. Fixed.
- Sign-up page (`signup.html`) had an empty `register()` function — now fully wired to `/api/auth/register`.
- Reset-password page had an empty `resetPassword()` function — now fully wired to a new `/api/auth/reset-password` endpoint.
- `forgot-password.html` called a `/api/auth/forgot-password` endpoint that didn't exist — added it (emails a reset link if SMTP is configured, otherwise logs it to the server console for dev use).
- Quiz questions were fetched from `quizzes/<topic>/<subtopic>/<set>.json`, but that folder never existed — created it, with real distinct questions for EC2/S3/IAM (the old S3 and IAM JSON files had accidentally duplicated the EC2 questions).
- `index.html` didn't handle `?topic=` at all, breaking the Topics → Sub-topics → Sets flow — added a sub-topics view.
- Admin "Delete topic" sent the Mongo `_id` to a route that deletes by `slug` — always silently failed. Fixed, and the whole admin panel was rebuilt with full topic/subtopic/set management.
- **Security**: `/api/admin/*` had no authentication at all — anyone could create/delete content. Now requires a logged-in admin (JWT + role check).
- Quiz results were never saved (the `Result` model existed but nothing used it). Added `POST /api/quiz/submit` and `GET /api/quiz/results`, and wired the quiz page + a new Profile "Quiz History" section to them.

**Completed stub pages**
- `settings.html` ("This is a stub...") → real Change Password page, backed by a new `/api/auth/change-password` endpoint.
- Contact form already called a backend endpoint that didn't exist — added `/api/contact`.

**Cleanup**
- Removed leftover dev files (`auth.js.bak.*`, `auth.js.patch`, `.auth.js.swp`, old `backups/` folder).
- Removed an old, unused prototype (`backend/public/*`, root `script.js`, root `data/*.json`) superseded by the real multi-page app + `quizzes/` folder.
- Removed the unauthenticated standalone `/admin` static panel (superseded by the now fully-featured, properly authenticated `admin.html` on the main site).
- De-duplicated the hardcoded backend URL — every page now reads `API_BASE` from `common.js` instead of redefining it locally.

## 4. Notes / things you may still want to do
- SMTP isn't configured by default — without it, password-reset links and contact-form messages are just logged to the server console instead of emailed. Add `SMTP_*` vars in `.env` to send real emails.
- `FRONTEND_URL` in `.env` should be the URL where your front-end is hosted (S3/Netlify/etc.) — it's used to build the link inside password-reset emails.
