# Listener/document limits — release 2026-06-26

Runtime limits enforced in the app:

- User workout realtime listener: latest 500 workouts per user.
- User measurements realtime listener: latest 365 measurements per user.
- Strava realtime listener: latest 500 activities per user.
- Admin users realtime listener: first 200 users.
- Admin AI usage realtime listener: 500 monthly usage docs.
- Admin telemetry realtime listener: 1000 daily telemetry docs for the last 7 days.

Screens that need older history must use explicit paginated/export paths instead of
unbounded realtime listeners.
