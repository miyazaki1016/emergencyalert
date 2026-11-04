import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probeSource, SOURCES } from './jaspic-source-probe.mjs';
const respond = (body, status = 200, headers = {}) => async () => new Response(body, { status, headers });
test('HTTP errors do not expose response body', async () => {
  const r = await probeSource('persons', 'bare-json', respond('private incident body', 404));
  assert.equal(r.outcome, 'http-error'); assert.equal(r.status, 404);
  assert.ok(!JSON.stringify(r).includes('private'));
});
test('person metadata omits incident content', async () => {
  const r = await probeSource('persons', 'bare-any', respond(JSON.stringify([{id:'private-id',address:'sensitive address'}])));
  assert.equal(r.outcome, 'ok'); assert.equal(r.records, 1);
  assert.ok(r.firstRecordMissingKeys.includes('city_code'));
  assert.ok(!JSON.stringify(r).includes('private-id'));
  assert.ok(!JSON.stringify(r).includes('sensitive address'));
});
test('cities features count', async () => {
  const r = await probeSource('cities', 'cache-bust-json', respond('{"features":[{},{}]}'));
  assert.equal(r.outcome, 'ok'); assert.equal(r.records, 2);
});
test('invalid JSON and network error are classified', async () => {
  assert.equal((await probeSource('persons','bare-json',respond('<html>oops</html>'))).outcome, 'invalid-json');
  assert.equal((await probeSource('persons','bare-json',async () => {throw new Error('private proxy host');})).errorType, 'network-error');
});
test('Accept and query variants preserve exact source path', async () => {
  const calls=[];
  const fake=async (url, options) => {calls.push({url,accept:options.headers.Accept}); return new Response('[]');};
  await probeSource('persons','bare-json',fake);
  await probeSource('persons','bare-any',fake);
  await probeSource('persons','cache-bust-json',fake);
  assert.equal(calls[0].url,SOURCES.persons);
  assert.equal(calls[1].accept,'*/*');
  assert.ok(calls[2].url.startsWith(SOURCES.persons+'?'));
});

test('invalid UTF-8 and already-corrupted Unicode are distinct, without logging content', async () => {
  const invalid = await probeSource('persons', 'bare-json', respond(new Uint8Array([0xff, 0xfe])));
  assert.equal(invalid.outcome, 'invalid-utf8');
  const preCorrupted = await probeSource('persons', 'bare-json', respond(JSON.stringify([{id:'private-id',address:String.fromCharCode(0xfffd)}])));
  assert.equal(preCorrupted.outcome, 'ok');
  assert.equal(preCorrupted.replacementChars, 1);
  assert.ok(!JSON.stringify(preCorrupted).includes('private-id'));
});
