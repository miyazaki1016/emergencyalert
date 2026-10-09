import { readFile } from "node:fs/promises";

const inputPath = process.env.JMA_404_INPUT ?? "/tmp/jma-404-url-evidence.json";
const retryScheduleMs = String(process.env.JMA_404_RETRY_SCHEDULE_MS ?? "150000,300000,450000,600000")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 0)
  .sort((a, b) => a - b);
const samplePerFrame = Number(process.env.JMA_404_RETRY_SAMPLE_PER_FRAME ?? 120);

type MissingTile = { x: number; y: number; url: string };
type EvidenceFrame = {
  index: number;
  basetime: string;
  validtime: string;
  http404: number;
  missing: MissingTile[];
};
type Evidence = {
  mode: string;
  coarseZoom: number;
  detailZoom: number;
  frames: EvidenceFrame[];
};

function selectEvenly<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  if (limit <= 1) return items.slice(0, 1);
  return Array.from({ length: limit }, (_, i) =>
    items[Math.floor(i * (items.length - 1) / (limit - 1))]
  );
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  if (!retryScheduleMs.length) throw new Error("invalid JMA_404_RETRY_SCHEDULE_MS");
  if (!Number.isInteger(samplePerFrame) || samplePerFrame < 1) throw new Error("invalid JMA_404_RETRY_SAMPLE_PER_FRAME");

  const evidence = JSON.parse(await readFile(inputPath, "utf8")) as Evidence;
  if (!Array.isArray(evidence.frames)) throw new Error("invalid 404 evidence");

  const selected = evidence.frames.flatMap((frame) =>
    selectEvenly(frame.missing ?? [], samplePerFrame).map((tile) => ({ frame, tile }))
  );

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const attempts: Array<{
    delayMs: number;
    checkedAt: string;
    results: Array<{
      frameIndex: number;
      basetime: string;
      validtime: string;
      x: number;
      y: number;
      url: string;
      status: number;
      bytes: number | null;
    }>;
  }> = [];

  const unresolved = new Map(
    selected.map(({ frame, tile }) => [
      `${frame.index}:${tile.x}:${tile.y}`,
      { frame, tile },
    ]),
  );

  for (const scheduledDelayMs of retryScheduleMs) {
    const remainingWait = Math.max(0, startedAtMs + scheduledDelayMs - Date.now());
    if (remainingWait > 0) await new Promise((resolve) => setTimeout(resolve, remainingWait));

    const batch = [...unresolved.entries()];
    const results = await mapLimit(batch, 12, async ([key, { frame, tile }]) => {
      const response = await fetch(tile.url, { cache: "no-store" });
      const bytes = response.ok ? (await response.arrayBuffer()).byteLength : null;
      if (response.status === 200) unresolved.delete(key);
      return {
        frameIndex: frame.index,
        basetime: frame.basetime,
        validtime: frame.validtime,
        x: tile.x,
        y: tile.y,
        url: tile.url,
        status: response.status,
        bytes,
      };
    });

    attempts.push({
      delayMs: scheduledDelayMs,
      checkedAt: new Date().toISOString(),
      results,
    });
  }

  const firstRecovery = new Map<string, number>();
  for (const attempt of attempts) {
    for (const row of attempt.results) {
      if (row.status !== 200) continue;
      const key = `${row.frameIndex}:${row.x}:${row.y}`;
      if (!firstRecovery.has(key)) firstRecovery.set(key, attempt.delayMs);
    }
  }

  const byAttempt = attempts.map((attempt) => ({
    delayMs: attempt.delayMs,
    retried: attempt.results.length,
    became200: attempt.results.filter((row) => row.status === 200).length,
    still404: attempt.results.filter((row) => row.status === 404).length,
    otherStatus: attempt.results.filter((row) => row.status !== 200 && row.status !== 404).map((row) => row.status),
  }));

  const byFrame = evidence.frames.map((frame) => {
    const frameSelected = selected.filter((row) => row.frame.index === frame.index);
    const recoveries = [...firstRecovery.entries()]
      .filter(([key]) => key.startsWith(`${frame.index}:`))
      .map(([, delay]) => delay);
    return {
      index: frame.index,
      basetime: frame.basetime,
      validtime: frame.validtime,
      original404: frame.http404,
      sampled: frameSelected.length,
      recovered: recoveries.length,
      unrecovered: frameSelected.length - recoveries.length,
      recoveryDelayMs: recoveries,
    };
  });

  const summary = {
    mode: "JMA_404_DELAYED_RETRY_PROOF",
    inputPath,
    retryScheduleMs,
    samplePerFrame,
    startedAt,
    finishedAt: new Date().toISOString(),
    totalSampled: selected.length,
    totalRecovered: firstRecovery.size,
    totalUnrecovered: selected.length - firstRecovery.size,
    byAttempt,
    byFrame,
    recovered: [...firstRecovery.entries()].map(([key, delayMs]) => ({ key, delayMs })),
    interpretation:
      "Re-fetches the exact same URLs that were previously HTTP 404 at 2.5, 5, 7.5, and 10 minute checkpoints by default. A 404 remains unavailable, never no-rain. Any 404->200 transition is evidence that publication lag can explain at least some missing detail tiles.",
    limitation:
      "One CI run samples only the current weather/publication regime. Repeated runs are needed before choosing a retry interval as an operational rule.",
  };

  console.log(JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
