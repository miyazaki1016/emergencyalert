-- Read-only operations queries. Run with an authorized administrative connection.
SELECT started_at,finished_at,status,summary FROM public.rain_evaluation_runs ORDER BY id DESC LIMIT 10;
SELECT state,delivery_status,delivery_record_status,count(*) FROM public.rain_notification_evaluations GROUP BY 1,2,3;
-- This is conditional on recorded, Push-service-accepted notifications, not overall recall.
SELECT event_type,radar_result->>'exact' AS exact,radar_result->>'within5' AS within5,
 radar_result->>'within10' AS within10,count(*)
FROM public.rain_notification_evaluations WHERE accepted_count>0 AND state<>'PENDING' GROUP BY 1,2,3,4;
SELECT count(*) AS overdue_pending FROM public.rain_notification_evaluations WHERE state='PENDING' AND deadline_at<now();
