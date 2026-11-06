-- Rain Lab hysteresis audit, READ ONLY, experimental research only.
-- Never run against other owners' data. Supply both parameters in a private session.
-- This script does not change production settings or send notifications.
-- Parameter as_of should be the SAME instant as the saved UI comparison.
WITH params AS (
 SELECT NULL::uuid AS owner_id, NULL::timestamptz AS as_of
), chosen AS (
 SELECT e.id,e.snapshot,e.shadow_state
 FROM public.rain_notification_evaluations e CROSS JOIN params p
 WHERE p.owner_id IS NOT NULL AND p.as_of IS NOT NULL
   AND e.owner_id=p.owner_id AND e.accepted_count>0
   AND e.created_at>=p.as_of-interval '7 days'
   AND e.created_at<=p.as_of
 ORDER BY e.created_at DESC,e.id DESC LIMIT 100
), result_groups AS (
 SELECT e.id AS evaluation_id,e.snapshot->>'decidedAt' AS decided_at,
        g->>'baseTime' AS base_time,g->'point'->'scores' AS point_scores,
        v->'area'->'series' AS area_series,
        v->'area'->'scores' AS area_scores,
        v->'combined'->'series' AS combined_series,
        s.features
 FROM chosen e
 JOIN public.rain_area_shadow_results s
   ON s.evaluation_id=e.id AND s.algorithm_version='area-shadow-v1'
 CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
 CROSS JOIN LATERAL jsonb_array_elements(g->'variants') v
 WHERE e.shadow_state<>'PENDING'
   AND abs((v->>'threshold')::numeric-0.4)<0.0001
), rows AS (
 SELECT r.evaluation_id,r.base_time,r.decided_at,
        p.value->>'validTime' AS valid_time,
        p.value->>'predicted' AS point_state,
        p.value->>'actual' AS radar_actual,
        a.n AS area_matches,a.state AS area_state,a.reason AS area_reason,
        axs.n AS area_score_matches,axs.actual AS area_radar_actual,
        a.prev_state AS prev_area,a.prev_time AS prev_valid_time,
        c.n AS combined_matches,c.state AS combined_state,
        f.n AS feature_matches,f.fraction,
        p.ordinality AS point_ordinal
 FROM result_groups r
 CROSS JOIN LATERAL jsonb_array_elements(r.point_scores)
   WITH ORDINALITY p(value,ordinality)
 CROSS JOIN LATERAL (
   SELECT count(*) AS n,
          CASE WHEN count(*)=1 THEN max(z.state) END AS state,
          CASE WHEN count(*)=1 THEN max(z.reason) END AS reason,
          CASE WHEN count(*)=1 THEN max(z.prev_state) END AS prev_state,
          CASE WHEN count(*)=1 THEN max(z.prev_time) END AS prev_time
   FROM (
     SELECT x->>'validTime' AS valid_time,x->>'state' AS state,
            x->>'reason' AS reason,
            lag(x->>'state') OVER(ORDER BY ord) AS prev_state,
            lag(x->>'validTime') OVER(ORDER BY ord) AS prev_time
     FROM jsonb_array_elements(r.area_series) WITH ORDINALITY t(x,ord)
   ) z
   WHERE z.valid_time=p.value->>'validTime'
 ) a
 CROSS JOIN LATERAL (
   SELECT count(*) AS n,
          CASE WHEN count(*)=1 THEN max(x->>'actual') END AS actual
   FROM jsonb_array_elements(r.area_scores) x
   WHERE x->>'validTime'=p.value->>'validTime'
 ) axs
 CROSS JOIN LATERAL (
   SELECT count(*) AS n,
          CASE WHEN count(*)=1 THEN max(x->>'state') END AS state
   FROM jsonb_array_elements(r.combined_series) x
   WHERE x->>'validTime'=p.value->>'validTime'
 ) c
 CROSS JOIN LATERAL (
   SELECT count(*) AS n,
          CASE WHEN count(*)=1 THEN max((x->'metrics'->'circles'->'500'->>'rainFraction')::numeric) END AS fraction
   FROM jsonb_array_elements(r.features) x
   WHERE x->>'kind'='FORECAST'
     AND x->>'baseTime'=r.base_time
     AND x->>'validTime'=p.value->>'validTime'
 ) f
), typed AS (
 SELECT *,
   CASE WHEN valid_time~'^[0-9]{14}$' THEN
     (substr(valid_time,1,4)||'-'||substr(valid_time,5,2)||'-'||
      substr(valid_time,7,2)||' '||substr(valid_time,9,2)||':'||
      substr(valid_time,11,2)||':'||substr(valid_time,13,2)||'+00')::timestamptz
   END AS valid_at
 FROM rows
), ordered AS (
 SELECT *,
   count(*) OVER(PARTITION BY evaluation_id,base_time,valid_time) AS point_matches,
   CASE WHEN prev_valid_time~'^[0-9]{14}$' THEN
     (substr(prev_valid_time,1,4)||'-'||substr(prev_valid_time,5,2)||'-'||
      substr(prev_valid_time,7,2)||' '||substr(prev_valid_time,9,2)||':'||
      substr(prev_valid_time,11,2)||':'||substr(prev_valid_time,13,2)||'+00')::timestamptz
   END AS prev_at
 FROM typed
), classified AS (
 SELECT *,
 CASE
   WHEN point_matches<>1 OR area_matches<>1 OR area_score_matches<>1 OR combined_matches<>1 OR feature_matches<>1 THEN 'DATA_MULTIPLICITY'
   WHEN area_reason IS DISTINCT FROM 'EXPERIMENTAL_RULE' OR fraction IS NULL THEN 'RULE_OR_FEATURE_UNVERIFIED'
   WHEN area_state='RAIN' AND fraction>=0.4 THEN 'THRESHOLD_RAIN'
   WHEN area_state='RAIN' AND fraction>0.2 AND fraction<0.4
     AND prev_area='RAIN' AND valid_at-prev_at=interval '5 minutes' THEN 'CARRIED_RAIN'
   WHEN area_state='NO_RAIN' AND fraction<=0.2 AND prev_area='RAIN' AND valid_at-prev_at=interval '5 minutes' THEN 'RELEASED_DRY'
   WHEN area_state='NO_RAIN' AND fraction<=0.2 THEN 'THRESHOLD_DRY'
   ELSE 'OTHER'
 END AS attribution
 FROM ordered CROSS JOIN params p
 WHERE valid_at IS NOT NULL
   AND decided_at IS NOT NULL
   AND valid_at>decided_at::timestamptz
   AND valid_at<=p.as_of
   AND radar_actual IN ('RAIN','NO_RAIN')
   AND area_radar_actual=radar_actual
   AND point_state IN ('RAIN','NO_RAIN')
   AND area_state IN ('RAIN','NO_RAIN')
   AND combined_state IN ('RAIN','NO_RAIN')
)
SELECT attribution,radar_actual,count(*) AS frames,
       count(*) FILTER (WHERE area_state='RAIN' AND radar_actual='NO_RAIN') AS area_false_rain,
       count(*) FILTER (WHERE area_state='NO_RAIN' AND radar_actual='RAIN') AS area_missed_rain,
       count(*) FILTER (WHERE point_state='RAIN' AND radar_actual='NO_RAIN') AS point_false_rain,
       count(*) FILTER (WHERE point_state='NO_RAIN' AND radar_actual='RAIN') AS point_missed_rain
FROM classified
GROUP BY attribution,radar_actual
ORDER BY attribution,radar_actual;

-- Caveats:
-- 1. Radar center is NOT on-site ground truth.
-- 2. To reproduce UI, use the same owner, as_of and selected evaluation IDs.
-- 3. Malformed timestamps can cause a cast error; validate first.
-- 4. Duplicated groups/variants must be separately checked.
-- 5. This attributes area 40% states; it is NOT a causal counterfactual.
-- 6. Prior state comes from the full area series, including pre-decision frames.
-- 7. This SQL has NOT been executed or schema-validated against live DB.
-- 8. RELEASED_DRY requires a preceding contiguous RAIN frame; THRESHOLD_DRY does not.

-- This audit covers the 40% variant only. Do not infer the 20%-only
-- false-positive count from these results; a separate paired-key comparison is needed.

-- Exclude point/area truth mismatches rather than silently treating differing
-- stored radar labels as equivalent; audit mismatches separately if any.
