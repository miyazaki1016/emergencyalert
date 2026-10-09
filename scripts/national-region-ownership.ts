// Proof only: resource-weighted ownership, independent of geographic labels.
export type OwnedChunk = { code: string; file: string; bytes: number };
export function assignRegions(chunks: OwnedChunk[], regionCount = 8) {
  if (!Number.isInteger(regionCount) || regionCount < 1) throw new Error('Invalid region count');
  const seen = new Set<string>();
  for (const c of chunks) {
    const key = `${c.code}/${c.file}`;
    if (!/^(0[1-9]|[1-3][0-9]|4[0-7])$/.test(c.code) || seen.has(key) || !Number.isSafeInteger(c.bytes) || c.bytes < 1) throw new Error('Invalid/duplicate ownership input');
    seen.add(key);
  }
  const loads = Array(regionCount).fill(0) as number[];
  const owners: Record<string, number> = {};
  // LPT bin packing: oversized indivisible original components stay intact.
  for (const c of [...chunks].sort((a,b) => b.bytes-a.bytes || a.code.localeCompare(b.code) || a.file.localeCompare(b.file))) {
    const owner = loads.indexOf(Math.min(...loads));
    owners[`${c.code}/${c.file}`] = owner; loads[owner] += c.bytes;
  }
  return { owners, loads, regionCount };
}
export function ownedTasks(jobKey: string, chunks: OwnedChunk[], ownership: ReturnType<typeof assignRegions>) {
  return chunks.map(c => {
    const chunkKey = `${c.code}/${c.file}`, region = ownership.owners[chunkKey];
    if (region === undefined) throw new Error('Unowned chunk');
    return { key: `${jobKey}/${chunkKey}`, chunkKey, region };
  });
}
// Gather only after every expected task completed; retain canonical N03 order.
export function gatherOwnedResults(expected: string[], rows: { key: string; municipalities: {code:string; prefecture:string; municipality:string}[] }[], canonicalCodes?: string[]) {
  const keys = new Set(rows.map(r=>r.key));
  if (keys.size !== rows.length || keys.size !== expected.length || expected.some(k=>!keys.has(k))) throw new Error('Duplicate/incomplete gather');
  const result = new Map<string, {code:string; prefecture:string; municipality:string}>();
  for (const row of rows) for (const m of row.municipalities) {
    const previous = result.get(m.code);
    if (previous && JSON.stringify(previous) !== JSON.stringify(m)) throw new Error('Conflicting municipality identity');
    result.set(m.code,m);
  }
  const rank = canonicalCodes ? new Map(canonicalCodes.map((c,i)=>[c,i])) : undefined;
  if (rank && [...result.keys()].some(c=>!rank.has(c))) throw new Error('Unknown canonical municipality');
  return [...result.values()].sort((a,b)=>rank ? rank.get(a.code)!-rank.get(b.code)! : a.code.localeCompare(b.code));
}
