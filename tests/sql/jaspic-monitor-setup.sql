-- Disposable PostgreSQL only. No real network calls or credentials.
create role anon;
create role authenticated;
create role service_role;
create schema vault;
create table vault.decrypted_secrets(name text primary key,decrypted_secret text);
create schema cron;
create table cron.job(jobid bigint primary key,jobname text,schedule text,active boolean);
create table cron.job_run_details(jobid bigint,status text,start_time timestamptz);
create function cron.schedule(text,text,text) returns bigint language sql as $$select 42::bigint$$;
create schema net;
create table net._http_response(id bigint,status_code integer,content text);
create table net.requests(id bigserial primary key,url text,body jsonb,headers jsonb);
create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer)
returns bigint language sql as $$insert into net.requests(url,body,headers) values(url,body,headers) returning id$$;
create table public.jaspic_runs(id uuid primary key,started_at timestamptz,finished_at timestamptz,status text,result jsonb,error_code text);
create table public.jaspic_gmail_token_vault(owner_id uuid primary key,encrypted_refresh_token jsonb,updated_at timestamptz);
insert into public.jaspic_gmail_token_vault values('11111111-1111-1111-1111-111111111111','{"synthetic":"one"}','2026-11-08T07:35:49.513Z');
