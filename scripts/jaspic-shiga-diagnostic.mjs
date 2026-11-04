// Read-only Shiga source diagnostic. Never sends email or persists incident data.
// Usage: node scripts/jaspic-shiga-diagnostic.mjs
// Only prints transport status, byte counts, decoding/parsing metadata and field names.
// Never print URLs with query values, JSON records, addresses, cookies, or response bodies.
import { lookup } from 'node:dns/promises';

const host = 'map.police.shiga.dsvc.jp';
const root = 'https://' + host;
const paths = [
  ['/data/map/suspicious_person_full.json', 'incidents'],
  ['/data/geo/cities.json', 'cities'],
];
const maxBytes = 12_000_000;

export async function probe(path, label, { request = fetch, now = Date.now } = {}) {
  const result = { label, query: 'none', http: null, contentType: null, bytes: null,
    utf8: null, json: null, count: null, replacementChars: null, keys: null, error: null };
  try {
    const response = await request(root + path, {
      redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'application/json' },
    });
    result.http = response.status;
    result.contentType = response.headers.get('content-type');
    if (!response.ok) return result;
    const reader = response.body?.getReader();
    if (!reader) { result.error = 'missing_body'; return result; }
    const chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { result.error = 'size_limit'; return result; }
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    result.bytes = size;
    const data = new Uint8Array(size); let off = 0;
    for (const chunk of chunks) { data.set(chunk, off); off += chunk.byteLength; }
    let decoded;
    try {
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(data);
      result.utf8 = 'valid';
    } catch {
      result.utf8 = 'invalid';
      result.error = 'invalid_utf8';
      return result;
    }
    result.replacementChars = (decoded.match(/\uFFFD/g) ?? []).length;
    let json;
    try { json = JSON.parse(decoded.replace(/^\uFEFF/, '')); }
    catch { result.json = 'invalid'; result.error = 'invalid_json'; return result; }
    result.json = 'valid';
    const records = Array.isArray(json) ? json : json?.features;
    if (!Array.isArray(records)) { result.error = 'unexpected_shape'; return result; }
    result.count = records.length;
    const sample = records[0];
    result.keys = sample && typeof sample === 'object' && !Array.isArray(sample)
      ? Object.keys(sample).sort() : [];
    return result;
  } catch (error) {
    result.error = error?.name === 'TimeoutError' ? 'timeout' : 'network_error';
    return result;
  }
}

export async function runDiagnostic({ request = fetch, dns = lookup, now = Date.now } = {}) {
  const report = { dns: 'unknown', probes: [] };
  try {
    await dns(host);
    report.dns = 'resolved';
  } catch {
    report.dns = 'failed';
  }
  for (const [path, label] of paths) {
    const first = await probe(path, label, { request, now });
    report.probes.push(first);
    // Legacy C# appends a timestamp as a query parameter.
    const second = await probe(path + '?' + now(), label, { request, now });
    second.query = 'timestamp';
    report.probes.push(second);
  }
  return report;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const report = await runDiagnostic();
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (report.dns !== 'resolved' || report.probes.some(p => p.error || p.http !== 200))
    process.exitCode = 1;
}
