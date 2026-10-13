# CyberWolf

CyberWolf is a web-based cybersecurity learning project. The repository is organized into separate frontend and backend folders.

## Frontend

The React app is in `frontend/` and uses Vite. With Node.js and npm installed, run:

```sh
cd frontend
npm install
npm run dev
```

The frontend presents 20 manually authored cybersecurity scenarios and three guided learning paths. Gamification includes XP, saved ranks and achievements, path progress, adaptive recommendations, and learning feedback. Randomized pre/post checks sample one question per topic and support limited retakes. The admin dashboard includes per-learner and group analytics for assessment gains, completion, active time, AI feedback usage, and adaptive progression. Accounts are password-only: the server issues a random sign-in handle, with no name, email, phone number, or personal ID requested. Learner progress is scoped to the signed-in account. Research participation is optional, with practice-only mode, explicit consent, withdrawal and deletion, an optional structured experience questionnaire, configurable retention, and backup/deployment configuration.

## Backend

The API in `backend/` provides challenge content, server-side answer evaluation, and learner progress persistence. See its README for setup and routes. The frontend Vite server proxies `/api` requests to port 4000.

Run the backend in one terminal:

```sh
cd backend
npm install
npm run dev
```

Run the frontend in a second terminal using the steps above. The backend uses MongoDB when configured, or temporary in-memory progress for local development. Backend unit tests are available with `cd backend && npm test`. See `backend/README.md` for retention, backup, and Docker deployment instructions.
