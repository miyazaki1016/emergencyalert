const { SUPABASE_URL, WATCH_CRON_TOKEN } = process.env;
if (!WATCH_CRON_TOKEN || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL ?? "")) {
  throw new Error("Missing watch-rain invocation configuration");
}

const response = await fetch(new URL("/functions/v1/watch-rain", SUPABASE_URL), {
  method: "POST",
  headers: { "x-watch-token": WATCH_CRON_TOKEN },
  redirect: "error",
  signal: AbortSignal.timeout(180_000),
});
if (!response.ok) throw new Error(`watch-rain HTTP ${response.status}`);
const body = await response.json();
if (body?.ok !== true || !Number.isSafeInteger(body.checked) || !Array.isArray(body.results)
    || body.checked !== body.results.length) {
  throw new Error("Invalid watch-rain result");
}
const failed = body.results.filter(result => result.status === "CHECK_FAILED" || result.failed > 0).length;
const busy = body.results.filter(result => result.status === "BUSY").length;
console.log(JSON.stringify({ checked: body.checked, failed, busy }));
if (failed || busy) throw new Error("watch-rain did not complete for all targets");
