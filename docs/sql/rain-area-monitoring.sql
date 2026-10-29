-- Read-only; admin/service access only. Point evaluation and image quality remain separate.
SELECT mode,started_at,finished_at,status,summary FROM public.rain_image_runs ORDER BY id DESC LIMIT 10;
SELECT image_state,count(*) FROM public.rain_notification_evaluations WHERE accepted_count>0 GROUP BY 1;
SELECT frame_kind,complete,metadata->>'matchesInputPixel' AS input_pixel_match,
 count(*),sum(octet_length(crop_png)) AS png_bytes,sum(octet_length(availability_mask)) AS mask_bytes
FROM public.rain_evaluation_images GROUP BY 1,2,3;
SELECT public.rain_image_storage_bytes() AS physical_image_bytes;
SELECT count(*) AS incomplete_or_overdue FROM public.rain_notification_evaluations
WHERE accepted_count>0 AND (image_state='INCOMPLETE' OR (image_state='PENDING' AND deadline_at+interval '10 minutes'<now()));
