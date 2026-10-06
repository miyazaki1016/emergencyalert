import { readFile } from "node:fs/promises";

const inputPath = process.env.JMA_404_INPUT ?? "/tmp/jma-404-url-evidence.json";
const delayMs = Number(process.env.JMA_404_RETRY_DELAY_MS ?? 150_000);
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
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("invalid JMA_404_RETRY_DELAY_MS");
  if (!Number.isInteger(samplePerFrame) || samplePerFrame < 1) throw new Error("invalid JMA_404_RETRY_SAMPLE_PER_FRAME");

  const evidence = JSON.parse(await readFile(inputPath, "utf8")) as Evidence;
  if (!Array.isArray(evidence.frames)) throw new Error("invalid 404 evidence");

  const selected = evidence.frames.flatMap((frame) =>
    selectEvenly(frame.missing ?? [], samplePerFrame).map((tile) => ({ frame, tile }))
  );

  const startedAt = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const results = await mapLimit(selected, 12, async ({ frame, tile }) => {
    const response = await fetch(tile.url, { cache: "no-store" });
    const bytes = response.ok ? (await response.arrayBuffer()).byteLength : null;
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

  const byFrame = evidence.frames.map((frame) => {
    const rows = results.filter((row) => row.frameIndex === frame.index);
    return {
      index: frame.index,
      basetime: frame.basetime,
      validtime: frame.validtime,
      original404: frame.http404,
      retried: rows.length,
      became200: rows.filter((row) => row.status === 200).length,
      still404: rows.filter((row) => row.status === 404).length,
      otherStatus: rows.filter((row) => row.status !== 200 && row.status !== 404).map((row) => row.status),
    };
  });

  const summary = {
    mode: "JMA_404_DELAYED_RETRY_PROOF",
    inputPath,
    delayMs,
    samplePerFrame,
    startedAt,
    retriedAt: new Date().toISOString(),
    totalRetried: results.length,
    became200: results.filter((row) => row.status === 200).length,
    still404: results.filter((row) => row.status === 404).length,
    otherStatus: results.filter((row) => row.status !== 200 && row.status !== 404).map((row) => row.status),
    byFrame,
    recovered: results.filter((row) => row.status === 200),
    interpretation:
      "Re-fetches the exact same URLs that were previously HTTP 404 after a bounded delay. A 404 remains unavailable, never no-rain. Any 404->200 transition is evidence that publication lag can explain at least some missing detail tiles.",
    limitation:
      "One CI run samples only the current weather/publication regime. Repeated runs are needed before choosing a retry interval as an operational rule.",
  };

  console.log(JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
