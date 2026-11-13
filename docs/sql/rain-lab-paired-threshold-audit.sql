-- READ ONLY: paired 20% vs 40% area rain classifications.
-- Set BOTH owner_id and as_of to the exact values used by the UI.
-- Defaults to zero rows; never remove the owner restriction.
WITH params AS (
 SELECT NULL::uuid AS owner_id, NULL::timestamptz AS as_of
), chosen AS (
 SELECT e.id,e.snapshot
 FROM public.rain_notification_evaluations e CROSS JOIN params p
 WHERE p.owner_id IS NOT NULL AND p.as_of IS NOT NULL
   AND e.owner_id=p.owner_id AND e.accepted_count>0
   AND e.created_at BETWEEN p.as_of-interval '7 days' AND p.as_of
   AND e.shadow_state<>'PENDING'
 ORDER BY e.created_at DESC,e.id DESC LIMIT 100
), groups AS (
 SELECT e.id AS evaluation_id,e.snapshot->>'decidedAt' AS decided_at,
        g->>'baseTime' AS base_time,g->'point'->'scores' AS point_scores,
        g->'variants' AS variants
 FROM chosen e
 JOIN public.rain_area_shadow_results s
   ON s.evaluation_id=e.id AND s.algorithm_version='area-shadow-v1'
 CROSS JOIN LATERAL jsonb_array_elements(s.comparison->'groups') g
), variant_rows AS (
 SELECT g.evaluation_id,g.base_time,g.decided_at,g.point_scores,
        v->>'threshold' AS threshold,
        v->'area'->'scores' AS area_scores,
        v->'combined'->'scores' AS combined_scores
 FROM groups g CROSS JOIN LATERAL jsonb_array_elements(g.variants) v
 WHERE (v->>'threshold')::numeric IN (0.2,0.4)
), scores AS (
 SELECT v.evaluation_id,v.base_time,v.decided_at,v.threshold,
        x->>'validTime' AS valid_time,
        x->>'predicted' AS predicted,x->>'actual' AS actual
 FROM variant_rows v CROSS JOIN LATERAL jsonb_array_elements(v.area_scores) x
), paired AS (
 SELECT evaluation_id,base_time,valid_time,
        count(*) FILTER(WHERE threshold='0.2') AS n20,
        count(*) FILTER(WHERE threshold='0.4') AS n40,
        max(predicted) FILTER(WHERE threshold='0.2') AS pred20,
        max(predicted) FILTER(WHERE threshold='0.4') AS pred40,
        max(actual) FILTER(WHERE threshold='0.2') AS truth20,
        max(actual) FILTER(WHERE threshold='0.4') AS truth40,
        max(decided_at) AS decided_at
 FROM scores GROUP BY evaluation_id,base_time,valid_time
), valid AS (
 SELECT p.*,
        (substr(valid_time,1,4)||'-'||substr(valid_time,5,2)||'-'||
         substr(valid_time,7,2)||' '||substr(valid_time,9,2)||':'||
         substr(valid_time,11,2)||':'||substr(valid_time,13,2)||'+00')::timestamptz AS valid_at
 FROM paired p WHERE valid_time~'^[0-9]{14}$'
), classified AS (
 SELECT *,
 CASE
  WHEN n20<>1 OR n40<>1 THEN 'UNPAIRED_OR_DUPLICATE'
  WHEN truth20 IS DISTINCT FROM truth40 THEN 'TRUTH_CONFLICT'
  WHEN truth20 NOT IN ('RAIN','NO_RAIN') THEN 'RADAR_UNKNOWN'
  WHEN pred20 NOT IN ('RAIN','NO_RAIN') OR pred40 NOT IN ('RAIN','NO_RAIN') THEN 'PREDICTION_UNDECIDED'
  WHEN pred20='RAIN' AND pred40='NO_RAIN' AND truth20='RAIN' THEN '20_ONLY_RAIN_CORRECT'
  WHEN pred20='RAIN' AND pred40='NO_RAIN' AND truth20='NO_RAIN' THEN '20_ONLY_RAIN_FALSE'
  WHEN pred20='NO_RAIN' AND pred40='RAIN' THEN 'MONOTONICITY_VIOLATION'
  WHEN pred20='RAIN' AND pred40='RAIN' AND truth20='NO_RAIN' THEN 'BOTH_FALSE_RAIN'
  WHEN pred20='NO_RAIN' AND pred40='NO_RAIN' AND truth20='RAIN' THEN 'BOTH_MISSED_RAIN'
  ELSE 'OTHER_PAIRED'
 END AS category
 FROM valid CROSS JOIN params q
 WHERE decided_at IS NOT NULL
   AND valid_at>decided_at::timestamptz
   AND valid_at<=q.as_of
)
SELECT category,count(*) AS frames
FROM classified GROUP BY category ORDER BY category;
-- Scope: 7-day, latest 100 accepted evaluations per owner, same as research UI.
-- Radar center is a proxy, NOT verified on-site rain.
-- No live DB execution or syntax validation has been performed.
