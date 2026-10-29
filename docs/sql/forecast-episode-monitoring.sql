-- Administrative, read-only monitoring. Never invokes claim or sends Push.
SELECT count(*) AS runtime_targets,count(*) FILTER(WHERE lease_id IS NOT NULL) AS leased_targets,
 count(*) FILTER(WHERE leased_until<now()) AS expired_leases
FROM public.rain_watch_runtime;
SELECT status,count(*) AS attempts,min(claimed_at) AS earliest,max(claimed_at) AS latest
FROM public.rain_push_attempts GROUP BY status;
-- CLAIMED after a crash/timeout is not permission to resend.
SELECT target_id,event_key,status,claimed_at,finished_at
FROM public.rain_push_attempts WHERE status IN ('UNCERTAIN','CLAIMED') AND claimed_at<now()-interval '2 minutes';
SELECT status_code,created,content::jsonb->>'checked' AS checked,
 (SELECT count(*) FROM jsonb_array_elements(content::jsonb->'results') r WHERE r->>'status'='CHECK_FAILED') AS failures,
 (SELECT count(*) FROM jsonb_array_elements(content::jsonb->'results') r WHERE r->>'suppressionReason'='FORECAST_EPISODE_ALREADY_NOTIFIED') AS suppressed_approaches
FROM net._http_response WHERE content LIKE '%forecastEpisode%' ORDER BY created DESC LIMIT 5;
