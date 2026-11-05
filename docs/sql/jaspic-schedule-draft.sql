-- REVIEW TEMPLATE ONLY. This file cannot activate a job as supplied.
do $$ begin raise exception 'Not authorized: review dry-run deployment and DB changes first'; end $$;
-- After explicit authorization, use two independent cron.schedule calls below.
-- Confirm pg_cron's configured timezone is UTC. 09:00 UTC = 18:00 JST.
-- Store project URL and per-province job tokens in Vault; never place token literals in job text.
/*
select cron.schedule('jaspic-hiroshima-dry-run','0 9 * * *',$job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='jaspic_project_url') || '/functions/v1/jaspic-hiroshima',
  headers := jsonb_build_object('Content-Type','application/json',
    'x-jaspic-token',(select decrypted_secret from vault.decrypted_secrets where name='jaspic_hiroshima_job_token')),
  body := '{"mode":"dry-run","persist":true}'::jsonb,
  timeout_milliseconds := 60000);
$job$);
select cron.schedule('jaspic-shiga-dry-run','0 9 * * *',$job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='jaspic_project_url') || '/functions/v1/jaspic-shiga',
  headers := jsonb_build_object('Content-Type','application/json',
    'x-jaspic-token',(select decrypted_secret from vault.decrypted_secrets where name='jaspic_shiga_job_token')),
  body := '{"mode":"dry-run","persist":true}'::jsonb,
  timeout_milliseconds := 60000);
$job$);
*/
