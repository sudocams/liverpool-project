# CyberWolf API

Express API for 20 authored cybersecurity mission scenarios, answer evaluation, and learner progress. Each mission includes an objective, briefing points, hints, a scenario challenge, and a reviewed explanation. Answer keys remain on the server; public challenge endpoints omit them. On MongoDB startup, missing built-in missions are added without overwriting existing administrator edits.

Missions provide optional hints. A first clear earns up to 100 XP, reduced by 20 points per hint to a minimum of 40; wrong attempts earn a small participation award. Replay clears earn less XP than a first clear. Learner ranks are based on unique missions cleared, while badges reward accuracy, hint-free clears, and progress across the campaign.

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
- `POST /api/research/consent`, `DELETE /api/research/consent` — record voluntary learner consent or withdraw and delete saved study records
- `GET /api/progress`, `DELETE /api/progress` — access or reset the signed-in learner's progress
- `POST /api/practice/answer` — check an answer without saving it for learners who do not participate in research
- `GET /api/recommendations` — rule-based next activity for the signed-in learner
- `POST /api/attempts` — server-side answer evaluation and progress update
- `GET /api/assessments/pre` and `GET /api/assessments/post` — assessment questions without answer keys
- `POST /api/assessments` — score and store one pre/post assessment
- `POST /api/research/feedback` — save optional structured learner ratings (no free-text collection)
- `GET /api/research/summary` — admin-only aggregate pre/post, completion, and questionnaire results for opted-in learners
- `/api/admin/modules` — admin-only module list, create, edit, and delete routes

The adaptive engine uses four explainable rules: start with the first challenge, revisit a recent incorrect answer, move to an unfinished challenge after a correct answer, and revisit the lowest-accuracy topic after all challenges are complete.

## Password-only accounts and roles

Learner registration requests a password only. The server issues a random sign-in handle; no name, email address, phone number, or personal ID is collected. Sign-in uses that handle and password. Handles cannot be recovered, so users must save them. Passwords are hashed with Node's scrypt implementation; the browser receives an HTTP-only, SameSite cookie. Learner progress and assessments are scoped to the authenticated account. Admin-only routes protect module management and aggregate research summaries.

## Research participation

Learners see participant information after signing in. The wording in the prototype is explicitly a draft and must be replaced with supervisor/ethics-approved information before recruiting participants or treating data as research evidence. Set `STUDY_INFO_VERSION` whenever the approved wording changes. Consent is optional: learners can use practice-only mode, where answers are sent to CyberWolf for grading but are not saved, and progress stays only in the current browser session. Opted-in activity is stored under an internal random account key, without the handle or password in event records. Research summaries include only events recorded from the participant's consent time forward. If AI feedback is enabled, challenge context and the selected answer may be sent to the configured provider; disclose the selected provider and its data handling in the final participant information. The admin endpoint returns aggregates only, and suppresses summary metrics until at least five learners have consented; questionnaire means also require five responses.

Learners can withdraw at any time from the app. Withdrawal clears consent and deletes their stored progress, assessments, and questionnaire ratings while leaving the password-only account available for practice. The optional questionnaire uses five 1–5 ratings and collects no free-text or contact details. This prototype does not implement an interview workflow or a formal retention schedule; define those in the approved study protocol before data collection.

For the first admin, set a private `ADMIN_BOOTSTRAP_KEY` in `.env`, choose **Set up first admin** on the sign-in page, and submit that key with a password. This route is disabled after an admin exists. Remove the bootstrap key from `.env` after setup. Set a unique `SESSION_SECRET` (at least 32 characters) and use HTTPS in production.

Without MongoDB, accounts, modules, and progress use in-memory development stores and reset when the server restarts. No account recovery is available because no contact details are collected. Configure and review production hosting, ethics approval, retention, and security before collecting research data.
