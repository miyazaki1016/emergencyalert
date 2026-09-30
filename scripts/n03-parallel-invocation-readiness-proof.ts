import { fork, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { startProofHttp } from "./n03-http-worker-readiness-proof";
import { REPRESENTATIVES } from "./n03-readiness-common";
async function main() {
  const [root, layout = "regional", gapText = "0", capText = "2"] = process.argv.slice(2);
  const gapMs = Number(gapText), cap = Number(capText);
  if (!root || !["national", "regional"].includes(layout) || ![2,4].includes(cap) || ![0,3000].includes(gapMs)) throw new Error("root national/regional gap=0/3000 cap=2/4");
  const http = await startProofHttp(root, "nominal");
  const children: ChildProcess[] = []; let peakAggregateRssMiB = 0;
  const timer = setInterval(() => {
    let total = 0;
    for (const child of children) if (child.pid) try {
      total += Number(readFileSync(`/proc/${child.pid}/statm`, "utf8").split(" ")[1]) * 4096 / 1048576;
    } catch { /* finished child */ }
    peakAggregateRssMiB = Math.max(peakAggregateRssMiB, total);
  }, 25);
  const started = performance.now();
  try {
    const pending = Array.from({ length: 4 }, (_, i) => i); const reports: unknown[] = [];
    let invocationCount = 0;
    const slot = async () => {
      while (pending.length) {
        const i = pending.shift()!;
        const targetStart = started + i * gapMs;
        if (targetStart > performance.now()) await new Promise(r => setTimeout(r, targetStart - performance.now()));
        const codes = layout === "national" ? REPRESENTATIVES.join(",") : REPRESENTATIVES[i];
        const child = fork(fileURLToPath(new URL("./n03-http-worker-readiness-proof.ts", import.meta.url)), ["worker", root, codes, "cached", "nominal", process.env.N03_PROOF_CONCURRENCY ?? "4", process.env.N03_PROOF_OFFERED ?? "16"], { env: { ...process.env, N03_PROOF_HTTP_URL: http.baseUrl, N03_PROOF_COLD_ONLY: "1" }, stdio: ["ignore", "pipe", "inherit", "ipc"] });
        children.push(child); invocationCount++;
        let output = ""; child.stdout!.on("data", data => { output += data; });
        await new Promise<void>((resolve, reject) => { child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Worker process exit ${code}`))); });
        reports.push(...output.trim().split("\n").map(line => JSON.parse(line)));
      }
    };
    await Promise.all(Array.from({ length: cap }, slot));
    console.log(JSON.stringify({ mode: "PARALLEL_INVOCATION_HTTP_PROOF", layout, gapMs, globalCap: cap, invocationCount, elapsedMs: performance.now() - started, peakAggregateRssMiB, reports, limitations: ["Actual separate worker processes on shared CI CPU", "All share one throttled localhost HTTP uplink", "Four 16-job invocations; synthetic repeated tiles", "Linux /proc summed worker RSS sampling; excludes server/controller", "Not Vercel runtime, real TLS/Storage/JMA/DB or nationwide arrival proof"], capacityAccepted: false }));
  } finally { clearInterval(timer); children.forEach(c => c.kill()); http.stop(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
