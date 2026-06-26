# Observability and release alerts — 2026-06-26

Required production signals before enabling Firebase deploy:

- sync conflicts: client telemetry counter `workout_conflict` and Functions logs containing `PLAN_CONFLICT` / `WORKOUT_CONFLICT`;
- failed final sync: client telemetry `sync_failure`, `sync_validation_failed`, `final_sync_pending`;
- stale drafts: client telemetry `final_sync_pending` with age bucket from Sync Center export/support dump;
- webhook drops: RevenueCat webhook non-2xx logs and ignored/out-of-order event counters;
- FCM failures: `admin_push` notification logs with `failed`, `invalidTokens`, `cleanedTokenRefs`;
- partial deletion: `deletion_operations` where `state in ["pending", "failed"]` and `updatedAt` older than one retry interval;
- AI stream errors: Functions logs `[StreamOpenAI] Stream error`, OpenAI 5xx/502, and `ai_usage_events` not transitioning out of `reserved`.

Release gate:

- create Cloud Logging metrics for each log pattern above;
- alert on any P0/P1 signal above threshold during release soak;
- keep Firebase deploy job disabled until artifact checksum has been uploaded and reviewed.
