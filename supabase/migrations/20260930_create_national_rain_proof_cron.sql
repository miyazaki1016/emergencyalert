-- PR #59 proof scheduler only. DO NOT apply to Production until explicitly reviewed.
-- Keeps nationwide computation isolated from watch-rain / watch_targets / Push.
--
-- Required Vault secrets before enabling:
--   national_rain_project_url    e.g. https://<app-host>
--   national_rain_worker_secret same bearer secret used by protected routes
--
-- Intentionally offset from the existing watch-rain */5 job:
--   scan   : minute 1,6,11,...
--   worker : minute 2,7,12,...
-- A second worker drain at minute 4 gives queued/retried work another bounded
-- chance without coupling it to the user notification watcher.

select cron.schedule(
  'national-rain-scan-every-5-minutes-proof',
  '1-59/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'national_rain_project_url') || '/api/rain/national-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'national_rain_worker_secret')
    ),
    body := jsonb_build_object('scheduled_at', now()),
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);

select cron.schedule(
  'national-rain-worker-primary-every-5-minutes-proof',
  '2-59/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'national_rain_project_url') || '/api/rain/national-worker?limit=50',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'national_rain_worker_secret')
    ),
    body := jsonb_build_object('scheduled_at', now(), 'pass', 'primary'),
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);

select cron.schedule(
  'national-rain-worker-drain-every-5-minutes-proof',
  '4-59/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'national_rain_project_url') || '/api/rain/national-worker?limit=50',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'national_rain_worker_secret')
    ),
    body := jsonb_build_object('scheduled_at', now(), 'pass', 'drain'),
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);

-- Operational invariants:
-- 1. Existing watch-rain cron is not modified.
-- 2. Scan route is idempotent at queue identity and fails closed before writes.
-- 3. Worker claims use FOR UPDATE SKIP LOCKED, so overlapping worker calls do
--    not claim the same live job.
-- 4. PROCESSING jobs older than 5 minutes are reclaimable; failed jobs retry
--    after one minute, up to five attempts.
-- 5. This migration creates scheduling only; it does not connect results to
--    watch_targets or Push.
