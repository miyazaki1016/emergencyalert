select cron.schedule(
 'evaluate-rain-every-5-minutes',
 '2-57/5 * * * *',
 $job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='watch_project_url') || '/functions/v1/evaluate-rain',
  headers := jsonb_build_object('Content-Type','application/json','x-watch-token',(select decrypted_secret from vault.decrypted_secrets where name='watch_cron_token')),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
 );
 $job$
);
