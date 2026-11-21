# Supabase capacity and retention baseline — 2026-11-09

**Read-only production inspection; no objects, rows, schedules or deployment changed.** This is a capacity *baseline*, not authorization to increase capture.

## Actual current footprint
- PostgreSQL `pg_database_size(current_database())`: **135,687,315 bytes (~129 MiB)**.
- Top relations by `pg_total_relation_size` include `cron.job_run_details` ~32 MB, `public.rain_diagnostic_history` ~22 MB, audit backup `amefuru_audit_20261109.rain_diagnostic_history` ~14 MB, `public.rain_image_runs` ~7.2 MB and audit backup ~5.1 MB. Relation size includes indexes and TOAST, not just logical payload.
- Supabase Storage `storage.objects` metadata: bucket `national-rain-n03` **47 objects, 461,844,361 bytes (~440.4 MiB)**, all object creation timestamps in a ~1 minute interval on 2026-09-30. **This is separate from PostgreSQL database size**. Do not delete without verifying use, ownership and dependencies.
- Scheduled jobs: `watch-rain-every-5-minutes`, `evaluate-rain-every-5-minutes`, `archive-rain-every-minute`, `shadow-rain-every-5-minutes` and JASPIC daily delivery are active. Particularly, archive-rain runs **every minute**; increasing archived frames can multiply write/retention costs.

## Safe implementation gates
1. **No extended image retention yet.** First inspect archive-rain selection, retention cleanup and the exact row/image schema; check existing payload sizes and rate. Existing snapshot image data should be reused where possible.
2. Prefer compact per-case categorical observations (intensity class, source-valid timestamp, center and precomputed area fractions) to PNG/tiles. Deduplicate by target + valid observation time, not by processing time.
3. Enforce explicit hard caps (per-case samples, per-day bytes/rows, total retained bytes), a bounded retention policy, and skip rather than retry indefinitely on capacity limit.
4. Do not alter `cron` schedules, `storage.objects`, or backup schemas as part of this research. The Sep 30 storage objects and Nov 9 backups must be separately audited before any deletion.
5. Monitor database and Storage separately. Actual remaining quota and plan-specific limits were **not** obtained from these SQL queries; do not present 129 MiB or 440 MiB as a percentage of available quota.
6. Vercel builds are independent from these Supabase byte counts; avoid production deploys for research.

**Decision:** remain read-only in production until a bounded retention proposal with measured marginal bytes and dependencies is reviewed.
