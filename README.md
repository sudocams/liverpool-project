# CyberWolf

CyberWolf is a web-based cybersecurity learning project. The repository is organized into separate frontend and backend folders.

## Frontend

The React app is in `frontend/` and uses Vite. With Node.js and npm installed, run:

```sh
cd frontend
npm install
npm run dev
```

The frontend presents five short learning modules with objectives, briefing points, and scenario challenges. It includes optional hints, achievements, a missed-module review list, topic mastery summaries, AI-assisted feedback with a guided fallback, and pre/post knowledge checks. Accounts are password-only: the server issues a random sign-in handle, with no name, email, phone number, or personal ID requested. Learner progress is scoped to the signed-in account. Research participation is optional, with practice-only mode, explicit consent, withdrawal and deletion, an optional structured experience questionnaire, and aggregate admin reporting.

## Backend

The API in `backend/` provides challenge content, server-side answer evaluation, and learner progress persistence. See its README for setup and routes. The frontend Vite server proxies `/api` requests to port 4000.

Run the backend in one terminal:

```sh
cd backend
npm install
npm run dev
```

Run the frontend in a second terminal using the steps above. The backend uses MongoDB when configured, or temporary in-memory progress for local development.
