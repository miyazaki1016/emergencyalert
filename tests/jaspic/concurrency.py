"""Disposable Postgres race tests. Uses only CI PG* environment variables."""
import concurrent.futures
import subprocess

def sql(query):
    return subprocess.run(['psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-c',query],capture_output=True,text=True)

def race(queries):
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        return list(pool.map(sql,queries))

snapshot="'{\"shiga-person:RACE\":{\"id\":\"RACE\"}}'::jsonb"
results=race([f"select public.jaspic_commit_dry_run('shiga',0,{snapshot},'[]');"]*2)
assert sum(r.returncode==0 for r in results)==1, 'CAS must admit exactly one baseline'
version='b'*64
assert sql(f"insert into public.jaspic_deliveries(province,record_key,version,status) values ('shiga','shiga-person:RACE','{version}','PREPARED');").returncode==0
results=race([f"select public.jaspic_claim('shiga','shiga-person:RACE','{version}','00000000-0000-0000-0000-00000000000{i}');" for i in (1,2)])
assert all(r.returncode==0 for r in results)
assert sorted(r.stdout.strip() for r in results)==['f','t'], 'Only one worker may own a delivery'
print('Independent-province CAS and delivery claim races passed')
