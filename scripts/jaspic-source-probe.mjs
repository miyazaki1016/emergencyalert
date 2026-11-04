// Read-only public endpoint diagnostics for JASPIC migration.
// No DB, SMTP, credentials, proxy, browser spoofing, or payload logging.
import { pathToFileURL } from 'node:url';

export const MAX_BYTES = 12_000_000;
export const SOURCES = Object.freeze({
  cities: 'https://map.police.shiga.dsvc.jp/data/geo/cities.json',
  persons: 'https://map.police.shiga.dsvc.jp/data/map/suspicious_person_full.json',
});
const REQUIRED_PERSON_KEYS = ['id', 'city_code', 'address', 'address_code', 'latitude', 'longitude', 'police_station', 'case_type', 'occurrence_dt', 'accident_situation', 'criminal_car', 'criminal_feature', 'resolution'];

export async function probeSource(name, variant, request = fetch) {
  if (!Object.hasOwn(SOURCES, name)) throw new Error('Unknown source');
  if (!['bare-json', 'bare-any', 'cache-bust-json'].includes(variant)) throw new Error('Unknown variant');
  const url = SOURCES[name] + (variant === 'cache-bust-json' ? '?' + Date.now() : '');
  const headers = { Accept: variant === 'bare-any' ? '*/*' : 'application/json' };
  const result = { source: name, variant, outcome: 'failed' };
  try {
    const response = await request(url, { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(20_000) });
    result.status = response.status;
    result.contentType = response.headers.get('content-type')?.slice(0, 120) ?? null;
    result.contentEncoding = response.headers.get('content-encoding')?.slice(0, 50) ?? null;
    result.cacheControl = response.headers.get('cache-control')?.slice(0, 120) ?? null;
    if (!response.ok) { result.outcome = 'http-error'; await response.body?.cancel().catch(() => {}); return result; }
    const reader = response.body?.getReader();
    if (!reader) { result.outcome = 'missing-body'; return result; }
    let size = 0; const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { result.outcome = 'too-large'; result.bytesOverLimit = true; return result; }
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    result.bytes = size;
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let decoded;
    try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''); }
    catch { result.outcome = 'invalid-utf8'; return result; }
    result.replacementChars = (decoded.match(/\uFFFD/g) ?? []).length;
    let json;
    try { json = JSON.parse(decoded); }
    catch { result.outcome = 'invalid-json'; return result; }
    if (name === 'persons') {
      if (!Array.isArray(json)) { result.outcome = 'wrong-schema'; return result; }
      result.records = json.length;
      result.firstRecordMissingKeys = json.length && json[0] && typeof json[0] === 'object'
        ? REQUIRED_PERSON_KEYS.filter(k => !Object.hasOwn(json[0], k))
        : REQUIRED_PERSON_KEYS;
    } else {
      if (!json || !Array.isArray(json.features)) { result.outcome = 'wrong-schema'; return result; }
      result.records = json.features.length;
    }
    result.outcome = 'ok';
    return result;
  } catch (e) {
    // Never expose proxy hostnames, URLs, response bodies, stack traces or credentials.
    result.errorType = e?.name === 'TimeoutError' ? 'timeout' : e?.name === 'AbortError' ? 'aborted' : 'network-error';
    return result;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const name of Object.keys(SOURCES)) {
    for (const variant of ['bare-json', 'bare-any', 'cache-bust-json']) {
      console.log(JSON.stringify(await probeSource(name, variant)));
    }
  }
}
