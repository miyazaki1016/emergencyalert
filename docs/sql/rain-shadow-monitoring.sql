-- Authorized administrative read-only queries. These are radar-center agreement, NOT ground-rain accuracy.
SELECT mode,started_at,finished_at,status,summary FROM public.rain_shadow_runs ORDER BY id DESC LIMIT 10;
SELECT shadow_state,count(*) FROM public.rain_notification_evaluations WHERE accepted_count>0 GROUP BY 1;
-- Same forecast issuance + validtime + same observed center, all three methods classifiable.
WITH paired AS (
 SELECT v->>'threshold' AS threshold,p->>'verdict' AS point_verdict,a->>'verdict' AS area_verdict,c->>'verdict' AS combined_verdict
 FROM public.rain_area_shadow_results s
 JOIN public.rain_notification_evaluations e ON e.id=s.evaluation_id
 CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
 CROSS JOIN LATERAL jsonb_array_elements(g->'point'->'scores') p
 CROSS JOIN LATERAL jsonb_array_elements(g->'variants') v
 CROSS JOIN LATERAL jsonb_array_elements(v->'area'->'scores') a
 CROSS JOIN LATERAL jsonb_array_elements(v->'combined'->'scores') c
 WHERE e.accepted_count>0 AND e.shadow_state<>'PENDING'
 AND s.algorithm_version='area-shadow-v1'
 AND a->>'validTime'=p->>'validTime' AND c->>'validTime'=p->>'validTime'
 AND p->>'actual'=a->>'actual' AND p->>'actual'=c->>'actual'
 AND p->>'verdict'<>'INDETERMINATE' AND a->>'verdict'<>'INDETERMINATE' AND c->>'verdict'<>'INDETERMINATE'
)
SELECT threshold,count(*) AS paired_frames,
 count(*) FILTER(WHERE point_verdict='MATCH') AS point_radar_matches,
 count(*) FILTER(WHERE area_verdict='MATCH') AS area_radar_matches,
 count(*) FILTER(WHERE combined_verdict='MATCH') AS combined_radar_matches
FROM paired GROUP BY 1;
-- Auxiliary human reports are read live, never fed back as forecast input or assumed to be exact ground truth.
SELECT e.id,e.event_type,e.target_time,f.actual_weather,f.observed_at,f.observed_time_source,
 extract(epoch FROM(f.observed_at-e.target_time))/60 AS reported_minutes_from_target
FROM public.rain_notification_evaluations e
JOIN public.rain_notification_feedback f ON f.notification_id=e.notification_id AND f.owner_id=e.owner_id
WHERE e.accepted_count>0 ORDER BY e.created_at DESC LIMIT 30;
SELECT public.rain_shadow_storage_bytes() AS shadow_physical_bytes;
