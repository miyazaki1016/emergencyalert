"""Disposable Postgres only. No Supabase, credentials, endpoints or Push calls."""
import concurrent.futures, subprocess
T='11111111-1111-4111-8111-111111111111';S='22222222-2222-4222-8222-222222222222'
def sql(q):
 return subprocess.check_output(['psql','-q','-X','-A','-t','-v','ON_ERROR_STOP=1','-c','set role service_role; '+q],text=True).strip()
def race(q):
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:return list(ex.map(sql,[q,q]))
leases=race(f"select coalesce(public.claim_rain_watch_target('{T}')::text,'BUSY')")
assert leases.count('BUSY')==1,leases
lease=next(x for x in leases if x!='BUSY')
claims=race(f"select coalesce(public.claim_rain_push_attempt('{T}','{lease}','episode/APPROACH','{S}')::text,'SKIP')")
assert claims.count('SKIP')==1,claims
attempt=next(x for x in claims if x!='SKIP')
assert sql('select count(*) from rain_push_attempts')=='1'
# Transport accepted, history/state update could fail. A new lease cannot resend.
sql(f"select public.finish_rain_push_attempt('{attempt}','ACCEPTED')")
sql(f"update rain_watch_runtime set leased_until=now()-interval '1 second'")
new=sql(f"select public.claim_rain_watch_target('{T}')")
assert sql(f"select public.save_rain_watch_runtime('{T}','{lease}','{{\"stale\":true}}')")=='f'
assert sql(f"select coalesce(public.claim_rain_push_attempt('{T}','{new}','episode/APPROACH','{S}')::text,'SKIP')")=='SKIP'
# Crash/unknown intent: no automatic retry even after lease expiration.
unknown=sql(f"select public.claim_rain_push_attempt('{T}','{new}','episode/SEVERE_1','{S}')")
sql("update rain_watch_runtime set leased_until=now()-interval '1 second'")
latest=sql(f"select public.claim_rain_watch_target('{T}')")
assert sql(f"select coalesce(public.claim_rain_push_attempt('{T}','{latest}','episode/SEVERE_1','{S}')::text,'SKIP')")=='SKIP'
# Escalation and a genuinely new episode retain separate send rights.
assert sql(f"select public.claim_rain_push_attempt('{T}','{latest}','episode/SEVERE_2','{S}')")
assert sql(f"select public.claim_rain_push_attempt('{T}','{latest}','new-episode/APPROACH','{S}')")
assert sql("select has_table_privilege('authenticated','rain_push_attempts','SELECT')")=='f'
assert sql("select has_function_privilege('anon','public.claim_rain_watch_target(uuid)','EXECUTE')")=='f'
assert sql("select count(*) from rain_push_attempts where status='ACCEPTED'")=='1'
print('PASS: 2 independent Postgres connections, exclusive target lease and subscription intent; stale writer fenced; accepted/unknown/crash not resent; escalation/new episode allowed; private permissions')
