# CyberWolf API

Express API for five short cybersecurity learning modules, answer evaluation, and learner progress. Each module includes an objective, briefing points, and a scenario challenge. Answer keys remain on the server; public challenge endpoints omit them.

Modules provide optional hints. Correct answers earn 100 points without hints, reduced by 20 points per hint to a minimum of 40; incorrect attempts earn 10 points. Hint use is recorded with each attempt for learner progress analysis.

Challenge feedback uses the fixed guided explanation by default. To enable AI-assisted feedback, configure `AI_API_KEY`, `AI_API_URL`, and `AI_MODEL`. Only the challenge context, learner's selected answer, correctness, and learning objective are sent; no learner ID is sent. Review the provider's privacy, retention, and licensing before enabling it for a study.

## Run locally

```sh
npm install
cp .env.example .env
npm run dev
```

The API listens on port 4000 by default. When MongoDB is available, progress is stored there. Otherwise, progress is held temporarily in memory and resets when the server restarts.

## Routes

- `GET /api/health` — service and storage status
- `GET /api/challenges` — public challenge content
- `GET /api/challenges/:challengeId` — one public challenge
- `POST /api/auth/register` — create a password-only learner account and issue a random handle
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — manage the signed-in session
- `POST /api/auth/bootstrap-admin` — create the first admin when the one-time setup key is configured
- `GET /api/progress`, `DELETE /api/progress` — access or reset the signed-in learner's progress
- `GET /api/recommendations` — rule-based next activity for the signed-in learner
- `POST /api/attempts` — server-side answer evaluation and progress update
- `GET /api/assessments/pre` and `GET /api/assessments/post` — assessment questions without answer keys
- `POST /api/assessments` — score and store one pre/post assessment
- `GET /api/research/summary` — admin-only aggregate pre/post scores and module completion
- `/api/admin/modules` — admin-only module list, create, edit, and delete routes

The adaptive engine uses four explainable rules: start with the first challenge, revisit a recent incorrect answer, move to an unfinished challenge after a correct answer, and revisit the lowest-accuracy topic after all challenges are complete.

## Password-only accounts and roles

Learner registration requests a password only. The server issues a random sign-in handle; no name, email address, phone number, or personal ID is collected. Sign-in uses that handle and password. Handles cannot be recovered, so users must save them. Passwords are hashed with Node's scrypt implementation; the browser receives an HTTP-only, SameSite cookie. Learner progress and assessments are scoped to the authenticated account. Admin-only routes protect module management and aggregate research summaries.

For the first admin, set a private `ADMIN_BOOTSTRAP_KEY` in `.env`, choose **Set up first admin** on the sign-in page, and submit that key with a password. This route is disabled after an admin exists. Remove the bootstrap key from `.env` after setup. Set a unique `SESSION_SECRET` (at least 32 characters) and use HTTPS in production.

Without MongoDB, accounts, modules, and progress use in-memory development stores and reset when the server restarts. No account recovery is available because no contact details are collected. Configure and review production hosting, ethics approval, retention, and security before collecting research data.
