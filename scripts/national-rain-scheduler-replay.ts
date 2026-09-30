/** Measured-service replay, NOT a live 5-minute/Production queue proof. */
export type ServiceProfile = { jobs: number; elapsedMs: number; rssMiB: number };
type Job = { id: number; region: string; created: number };
export function replayScheduler(options: {
  policy: "national" | "regional" | "staggered";
  profiles: Record<string, ServiceProfile>;
  mixed: ServiceProfile;
  arrivals: Record<string, number>;
  cycles: number;
  globalCap: number;
  staggerMs?: number;
  serviceMultiplier?: number;
}) {
  const regions = Object.keys(options.arrivals);
  if (!regions.length || !Number.isInteger(options.globalCap) || options.globalCap < 1 || !Number.isInteger(options.cycles) || options.cycles < 1) throw new Error("Invalid replay configuration");
  for (const region of regions) if (!Number.isInteger(options.arrivals[region]) || options.arrivals[region] < 0 || !options.profiles[region]?.jobs || options.profiles[region].elapsedMs <= 0) throw new Error("Invalid measured profile/arrival");
  const queue: Job[] = [], active: { end: number; jobs: Job[]; rss: number }[] = [];
  const completed = new Set<number>(), claimed = new Set<number>();
  let now = 0, cycle = 0, submitted = 0, invocationCount = 0, peakQueue = 0, peakRssMiB = 0;
  const rows: { cycle: number; submitted: number; processed: number; remaining: number; oldestAgeSeconds: number; invocationCount: number; byRegion: Record<string, { remaining: number; oldestAgeSeconds: number }> }[] = [];
  const period = 300_000, horizon = options.cycles * period;
  const eligible = (job: Job) => options.policy === "staggered" ? job.created + regions.indexOf(job.region) * (options.staggerMs ?? 3000) : job.created;
  while (now <= horizon) {
    for (let i = active.length - 1; i >= 0; i--) if (active[i].end <= now) {
      const finished = active.splice(i, 1)[0];
      for (const job of finished.jobs) { if (completed.has(job.id)) throw new Error("Duplicate completion"); completed.add(job.id); }
    }
    if (now === cycle * period && cycle < options.cycles) {
      if (cycle) snapshot(cycle);
      // Deliberately interleaved national arrivals; a regional dispatcher may
      // select same-region work without changing a tile's unique identity.
      const largest = Math.max(...Object.values(options.arrivals));
      for (let i = 0; i < largest; i++) for (const region of regions) if (i < options.arrivals[region]) queue.push({ id: ++submitted, region, created: now });
      cycle++;
    }
    while (active.length < options.globalCap) {
      const first = queue.find(j => eligible(j) <= now); if (!first) break;
      const profile = options.policy === "national" ? options.mixed : options.profiles[first.region];
      const chosen = queue.filter(j => eligible(j) <= now && (options.policy === "national" || j.region === first.region)).slice(0, profile.jobs);
      const ids = new Set(chosen.map(j => j.id));
      for (const job of chosen) { if (claimed.has(job.id)) throw new Error("Duplicate claim"); claimed.add(job.id); }
      for (let i = queue.length - 1; i >= 0; i--) if (ids.has(queue[i].id)) queue.splice(i, 1);
      active.push({ end: now + profile.elapsedMs * (options.serviceMultiplier ?? 1.5), jobs: chosen, rss: profile.rssMiB });
      invocationCount++;
    }
    peakQueue = Math.max(peakQueue, queue.length + active.reduce((s, a) => s + a.jobs.length, 0));
    peakRssMiB = Math.max(peakRssMiB, active.reduce((s, a) => s + a.rss, 0));
    if (now === horizon) { snapshot(options.cycles); break; }
    const wake = queue.filter(j => eligible(j) > now).map(eligible);
    const next = Math.min(horizon, cycle < options.cycles ? cycle * period : horizon, ...active.map(a => a.end), ...(active.length < options.globalCap ? wake : []));
    if (next <= now) throw new Error("Replay failed to advance"); now = next;
  }
  function snapshot(cycleNumber: number) {
    const outstanding = [...queue, ...active.flatMap(a => a.jobs)];
    const oldestCreated = outstanding.reduce((oldest, job) => Math.min(oldest, job.created), Infinity);
    const byRegion = Object.fromEntries(regions.map(region => {
      const pending = outstanding.filter(job => job.region === region);
      const oldest = pending.reduce((time, job) => Math.min(time, job.created), Infinity);
      return [region, { remaining: pending.length, oldestAgeSeconds: pending.length ? (now - oldest) / 1000 : 0 }];
    }));
    rows.push({ cycle: cycleNumber, submitted, processed: completed.size, remaining: outstanding.length, oldestAgeSeconds: outstanding.length ? (now - oldestCreated) / 1000 : 0, invocationCount, byRegion });
  }
  return { mode: "MEASURED_SERVICE_SCHEDULER_REPLAY", policy: options.policy, globalCap: options.globalCap, staggerMs: options.staggerMs ?? 3000, serviceMultiplier: options.serviceMultiplier ?? 1.5, arrivals: options.arrivals, cycles: options.cycles, horizonSeconds: horizon / 1000, submitted, processed: completed.size, remaining: submitted - completed.size, invocationCount, peakOutstanding: peakQueue, summedWorkerPeakRssMiB: peakRssMiB, rows, capacityAccepted: false, limitations: ["Virtual 5-minute arrivals, measured worker service profiles", "No real continuously arriving Production queue/DB/JMA", "Sum of process peaks is a conservative proxy, not simultaneous measured RSS", "Arrival demand and 1.5 service multiplier are scenario assumptions", "Only four representative region workloads, not nationwide coverage evidence"] };
}
