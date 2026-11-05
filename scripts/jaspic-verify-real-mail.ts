// Offline verifier. Inputs remain outside Git; output contains aggregate verdicts only.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { generateMail, type Kind } from '../supabase/functions/_shared/jaspic/mail.ts';
import { markedPrevious, observedItem } from './jaspic-update-observation.ts';
import { generateEml } from '../supabase/functions/_shared/jaspic/mime.ts';
import type { Item } from '../supabase/functions/_shared/jaspic/collect.ts';

export function verifyRealMail(raw: Buffer, items: Item[]) {
  const split = raw.indexOf('\r\n\r\n');
  if (split < 0) throw new Error('Missing MIME separator');
  const headers = raw.subarray(0, split).toString('utf8').split(/\r\n(?![ \t])/);
  const header = (name: string) => {
    const values = headers.filter(h => h.slice(0, h.indexOf(':')).toLowerCase() === name);
    if (values.length !== 1) throw new Error('Missing or duplicate verification header');
    return values[0].slice(values[0].indexOf(':') + 1).replace(/\r\n[ \t]+/g, ' ').trim();
  };
  if (!/^text\/plain;\s*charset="?utf-8"?$/i.test(header('content-type')) || header('content-transfer-encoding').toLowerCase() !== '8bit') {
    throw new Error('Unsupported MIME profile');
  }
  const body = raw.subarray(split + 4);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
  const kind: Kind = text.includes('[JASPIC - NES] 滋賀県警アラート') ? 'shiga-person' : text.includes('広島県警が新しい犯罪情報') ? 'hiroshima-crime' : 'hiroshima-person';
  const ids = [...text.matchAll(/^"id":"([^"\r\n]+)"/gm)];
  if (ids.length !== 1) throw new Error('Missing or ambiguous management ID');
  const matches = items.filter(i => i.kind === kind && i.data.id === ids[0][1]);
  if (matches.length !== 1) throw new Error('Missing or ambiguous source record');
  const item = matches[0];
  const update = text.includes('アラート（更新）●\r\n');
  if (!update && !text.includes('アラート（新規）\r\n')) throw new Error('Unknown notification heading');
  const previous = update ? markedPrevious(text, kind, item.data) : null;
  const generated = generateMail(kind, item.data, previous, item.context);
  // Synthetic previous values reproduce observed marker combinations only.
  // They do not verify real previous values or update detection.
  const projected = text;
  const subject = header('subject').replace(/(\?=)\s+(=\?)/g, '$1$2').replace(/=\?utf-8\?b\?([A-Za-z0-9+/=]+)\?=/gi, (_, b64: string) => new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(b64, 'base64')));
  const generatedHeaders = Buffer.from(generateEml(kind, item.data, previous, item.context, 'eight-bit', { date: 'Wed, 04 Nov 2026 00:00:00 +0000', messageId: 'verification.invalid' })).toString('utf8').split('\r\n\r\n')[0].split(/\r\n(?![ \t])/);
  const subjectHeaderBytesMatch = headers.find(h => /^subject:/i.test(h)) === generatedHeaders.find(h => /^subject:/i.test(h));
  return {
    kind, update, subjectHeaderBytesMatch,
    bodyBytesMatch: body.equals(Buffer.from(generated.body, 'utf8')),
    currentValuesAndStructureMatch: Buffer.from(projected, 'utf8').equals(Buffer.from(generated.body, 'utf8')),
    crlfOnly: !/[\r\n]/.test(text.replaceAll('\r\n', '')),
    subjectLogicalMatch: subject === generated.subject,
    // MimeKit removes the logical leading SP at serialization; report separately.
    subjectSerializedValueMatch: subject === generated.subject.slice(1),
    observedUpdateMarkers: (text.match(/●更新(?=\r\n)/g) ?? []).length,
    previousValuesVerified: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const observedMode = process.argv[4] === '--observed-updates';
    if (process.argv.length !== 4 && !(process.argv.length === 5 && observedMode)) throw new Error('Invalid arguments');
    const mails = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { raw_mime_base64url: string }[];
    const items = JSON.parse(readFileSync(process.argv[3], 'utf8')) as Item[];
    const summary: Record<string, Record<string, number>> = {};
    let failed = false;
    for (const mail of mails) {
      if (!mail.raw_mime_base64url) throw new Error('Missing raw MIME');
      const raw = Buffer.from(mail.raw_mime_base64url, 'base64url');
      const observed = observedMode ? observedItem(raw.subarray(raw.indexOf('\r\n\r\n') + 4).toString('utf8')) : null;
      const source = observed ? items.filter(i => i.kind === observed.kind && i.data.id === observed.data.id) : [];
      if (source.length > 1) throw new Error('Ambiguous source record');
      const r = verifyRealMail(raw, observed ? [observed] : items);
      if (observedMode && !r.update) throw new Error('Expected update notification');
      const group = summary[r.kind] ??= { total: 0, newBodyByteMatches: 0, updates: 0, currentProjectionMatches: 0, crlfMatches: 0, serializedSubjectMatches: 0, logicalSubjectMatches: 0, subjectHeaderByteMatches: 0 };
      group.total++;
      if (observedMode) {
        if (source.length) {
          group.sourceIdMatches = (group.sourceIdMatches ?? 0) + 1;
          if (verifyRealMail(raw, source).bodyBytesMatch) group.sourceBodyMatches = (group.sourceBodyMatches ?? 0) + 1;
        } else group.sourceIdMissing = (group.sourceIdMissing ?? 0) + 1;
      }
      if (r.subjectHeaderBytesMatch) group.subjectHeaderByteMatches++;
      if (r.bodyBytesMatch && !r.update) group.newBodyByteMatches++;
      if (r.bodyBytesMatch && r.update) group.updateBodyByteMatches = (group.updateBodyByteMatches ?? 0) + 1;
      if (r.update) group.updates++;
      if (r.currentValuesAndStructureMatch) group.currentProjectionMatches++;
      if (r.crlfOnly) group.crlfMatches++;
      if (r.subjectSerializedValueMatch) group.serializedSubjectMatches++;
      if (r.subjectLogicalMatch) group.logicalSubjectMatches++;
      failed ||= !r.currentValuesAndStructureMatch || !r.crlfOnly || !r.subjectSerializedValueMatch || !r.subjectHeaderBytesMatch;
    }
    if (!mails.length) throw new Error('Empty verification set');
    console.log(JSON.stringify({ summary, previousValuesVerified: false, sent: 0, persisted: false }));
    process.exitCode = failed ? 1 : 0;
  } catch {
    console.error('VERIFICATION_FAILED (private input details suppressed)');
    process.exitCode = 1;
  }
}
