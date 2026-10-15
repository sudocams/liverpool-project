# CyberWolf API

Express API for 20 authored cybersecurity mission scenarios, answer evaluation, and learner progress. Each mission includes an objective, briefing points, hints, a scenario challenge, and a reviewed explanation. Answer keys remain on the server; public challenge endpoints omit them. On MongoDB startup, missing built-in missions are added without overwriting existing administrator edits.

Missions provide optional hints. A first clear earns up to 100 XP, reduced by 20 points per hint to a minimum of 40; wrong attempts earn a small participation award. Replay clears earn less XP than a first clear. Learner ranks and earned badges are saved with progress. Three guided learning paths group missions into everyday self-defense, data/service protection, and security operations; the latter two open after the first path is completed.

Challenge feedback uses the fixed guided explanation by default. To enable AI-assisted feedback, configure `AI_API_KEY`, `AI_API_URL`, and `AI_MODEL`. Only the challenge context, learner's selected answer, correctness, and learning objective are sent; no learner ID is sent. Review the provider's privacy, retention, and licensing before enabling it for a study.

## Run locally

```sh
npm install
cp .env.example .env
npm run dev
```

The API listens on port 4000 by default. When MongoDB is available, progress is stored there. Otherwise, progress is held temporarily in memory and resets when the server restarts. Run the backend unit suite with `npm test`.

## Routes

- `GET /api/health` — service and storage status
- `GET /api/challenges` — public challenge content
- `GET /api/challenges/:challengeId` — one public challenge
- `POST /api/auth/register` — create a learner profile with a generated learner code and chosen password, without identifying details
- `POST /api/auth/login` — sign in with learner code and password; `POST /api/auth/learner-password` — set or replace a password while signed in; `POST /api/auth/logout`, `GET /api/auth/me` — manage the session
- `POST /api/auth/admin-login` — admin username/password sign-in
- `POST /api/auth/bootstrap-admin` — create the first admin with a username/password and the server's one-time setup key
- `POST /api/research/consent`, `DELETE /api/research/consent` — record voluntary learner consent or withdraw and delete saved study records
- `GET /api/progress`, `DELETE /api/progress` — access or reset the signed-in learner's progress
- `POST /api/practice/answer` — check an answer and save pseudonymous learning progress without recording research activity
- `GET /api/recommendations` — rule-based next activity for the signed-in learner
- `GET /api/learning-paths` — guided learning paths and their challenge sequences
- `POST /api/activity/sessions/start`, `/heartbeat`, `/end` — consented active-time tracking
- `POST /api/attempts` — server-side answer evaluation and progress update
- `GET /api/assessments/pre` and `GET /api/assessments/post` — randomized, topic-balanced questions without answer keys
- `POST /api/assessments` — score and store one pre/post assessment
- `POST /api/research/feedback` — save optional structured learner ratings (no free-text collection)
- `GET /api/research/summary` — admin-only per-learner analytics and privacy-thresholded group summaries
- `GET /api/admin/retention`, `POST /api/admin/retention/prune` — inspect and manually apply the configured retention period
- `/api/admin/modules` — admin-only module list, create, edit, and delete routes

The adaptive engine uses explainable rules and three challenge levels (`foundational`, `intermediate`, and `advanced`). An incorrect response taking longer than expected, or repeated low topic accuracy combined with a long response, can lead to a lower-difficulty activity in the active module. Repeated accurate responses (at least three topic attempts with at least 80% accuracy) and an on-time latest response can select the highest available difficulty in that module. A response taking over 150% of the challenge's estimated duration is treated as a slow attempt; time is combined with correctness and prior results rather than used as a measure of ability on its own. Otherwise, recommendations follow module order, retry a recent error, and revisit the lowest-accuracy topic after all paths are complete. Reasons and rule names are returned with each recommendation and shown to learners. Assessment forms sample one question per topic from a two-scenario-per-topic bank, shuffle answer order, and allow up to `ASSESSMENT_MAX_ATTEMPTS` submissions per phase (default three). Weekly learner trends and recommendation follow-up comparisons are derived from recorded history; comparisons by strategy require at least five opted-in learners.

## Authentication, privacy, and roles

New learners create an account using a generated random learner code and a password they choose. They do not enter a name, email, phone number, personal ID, or username. Progress is stored server-side against that pseudonymous account; the browser's HTTP-only session cookie lasts up to 30 days, after which the learner signs in again with their code and password. Clearing browser data or changing devices does not delete server progress. Learners must save both credentials: there is no contact detail for password recovery. Passwords are hashed with Node's scrypt implementation. Existing anonymous sessions can set a password while signed in to make their current profile recoverable.

Admins use a separate username/password form. The first admin is created only with the server's one-time `ADMIN_BOOTSTRAP_KEY`; usernames are unique and normalized to lowercase. A pre-existing admin can enter a new username with their current password on the admin sign-in form to set their username during the first successful sign-in. Admin-only routes protect module management and participant-level and aggregate research analytics.

Pseudonymous access does not mean the system stores no information. Scores, completions, points, and adaptive recommendations are saved for progress continuity even when learners do not participate in the study. Practice mode does not record active-time sessions or assessments and does not include records in research analytics. Study-only activity is collected only after voluntary consent; no direct identity fields are collected.

## Research participation

Learners see participant information after signing in. The wording in the prototype is explicitly a draft and must be replaced with supervisor/ethics-approved information before recruiting participants or treating data as research evidence. Set `STUDY_INFO_VERSION` whenever the approved wording changes. Consent is optional: scores, completions, points, and recommendations are retained on the pseudonymous profile for learning continuity, but are excluded from research analytics unless the learner consents. Practice mode does not record active-time sessions or assessments. Opted-in activity is stored under an internal random account key. The admin dashboard links each opted-in learner to their pseudonymous learner code and shows assessment changes by topic, challenge/module and path completion, weekly performance, visible/focused active time, AI-versus-guided feedback use, saved achievements/ranks, and adaptive recommendation history. Activity sessions send a heartbeat every 15 seconds only while the tab is visible and focused; per-module duration remains an estimate from opening to submission. Research summaries include only events recorded from the participant's current consent time forward. If AI feedback is enabled, challenge context and the selected answer may be sent to the configured provider; disclose the selected provider and its data handling in the final participant information. Group summary means and strategy comparisons are suppressed until at least five learners have consented; questionnaire means also require five responses.

Learners can withdraw at any time from the app. Withdrawal clears consent and deletes their stored progress, assessments, activity sessions, gamification records, and questionnaire ratings while leaving the random learner profile available for practice in the current browser. The optional questionnaire uses five 1–5 ratings and collects no free-text or contact details. `DATA_RETENTION_DAYS=0` disables automatic retention pruning; set a positive value to prune expired activity daily, or apply it using the admin control. Retention removes old activity and derived completion/badge/rank progress but keeps learner profiles. Define the period in the approved study protocol before data collection.

## Backups and deployment

Create `deploy.env` from `deploy.env.example` in the repository root and set long URL-safe MongoDB credentials. Ensure `backend/.env` has a unique `SESSION_SECRET` of at least 32 characters and the approved `FRONTEND_ORIGIN`. Start the containerized app using `docker compose --env-file deploy.env up --build -d`; it serves the frontend on port 8080 by default and persists MongoDB data in a named volume. Place TLS in front of the frontend service before public deployment.

Create a compressed MongoDB backup with `docker compose --env-file deploy.env --profile backup run --rm backup`. Archives are written to `backups/` with owner-only permissions; old archives are removed according to `BACKUP_RETENTION_DAYS`. Protect and encrypt backup copies off-host, and rehearse restoring them into a separate database before relying on backups.

For the first admin, set a private `ADMIN_BOOTSTRAP_KEY` in `.env`, choose **Set up first admin** on the sign-in page, and submit that key with a username and password. This route is disabled after an admin exists. Remove the bootstrap key from `.env` after setup. Set a unique `SESSION_SECRET` (at least 32 characters) and use HTTPS in production.

Without MongoDB, accounts, modules, and progress use in-memory development stores and reset when the server restarts; use MongoDB for durable server-side persistence. No account recovery is available because no contact details are collected. Configure and review production hosting, ethics approval, retention, and security before collecting research data.
