# FerixCourse — Monorepo (Web + Backend, App deferred)

## Structure
```
FerixCourse/
  Web/
    UserPhase/   # Student-facing Next.js 14 + TS + Tailwind (landing, auth, dashboard, learn, classroom, bookings)
    AdminPort/   # Admin Next.js app (Phase 6) — deferred until student flows work
  Backend/       # Express + TS API (single service, modular routes)
  App/           # Mobile — explicitly out of scope for now
```

## Phase order (per spec)
1. Init + env + DB + auth + base UI  <- WE ARE HERE
2. Courses/Classrooms + Flutterwave + webhook
3. LiveKit + recording + storage
4. Recorded courses + progress
5. Requests/Bookings/Messaging/Notifications
6. AdminPort
7. Polish/security/prod

## Run
Backend: `cd Backend && cp .env.example .env && npm i && npm run dev`
UserPhase: `cd Web/UserPhase && cp .env.example .env.local && npm i && npm run dev`
