# CyberWolf

CyberWolf is a web-based cybersecurity learning project. The repository is organized into separate frontend and backend folders.

## Frontend

The React app is in `frontend/` and uses Vite. With Node.js and npm installed, run:

```sh
cd frontend
npm install
npm run dev
```

The frontend presents 20 manually authored cybersecurity scenarios and three guided learning paths. Gamification includes XP, saved ranks and achievements, path progress, adaptive recommendations, and learning feedback. Randomized assessment phases include pre-test, post-test, transfer questions with unfamiliar scenarios, and a delayed retention test scheduled 21 days after post-test by default. Admins can review topic scores across the phases and pre/post score gain per recorded learning hour in the Research Outcomes tab. The assessment delay is configurable with `RETENTION_TEST_DELAY_DAYS` (minimum 14). These app-only measures do not establish superiority to classroom instruction; that comparison needs classroom-group assessment data collected with a comparable design. Learners receive sequential codes such as `wolf-1` and choose a password, without submitting personal details; progress is stored server-side and can be accessed after clearing browser data by signing in again. Learners can request password resets for admin review, and admins can reset passwords or change learner codes. Admins have a separate username/password sign-in, with first-admin setup protected by a server key. Research participation is optional, with practice mode, explicit consent, withdrawal and deletion, an optional structured experience questionnaire, configurable retention, and backup/deployment configuration.

## Backend

The API in `backend/` provides challenge content, server-side answer evaluation, and learner progress persistence. See its README for setup and routes. The frontend Vite server proxies `/api` requests to port 4000.

Run the backend in one terminal:

```sh
cd backend
npm install
npm run dev
```

Run the frontend in a second terminal using the steps above. The backend uses MongoDB when configured; without it, accounts and progress persist locally under `backend/data/` (ignored by git). Back up that folder for local deployments and use MongoDB with protected backups for production. Learners can sign in with their learner code and password after the 30-day browser session expires or browser data is cleared. Backend unit tests are available with `cd backend && npm test`. See `backend/README.md` for retention, backup, and Docker deployment instructions.
