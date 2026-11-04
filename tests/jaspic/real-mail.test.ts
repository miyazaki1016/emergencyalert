import { describe, expect, it } from 'vitest';
import fixtures from './fixtures.json';
import { generateMail, type Kind, type RecordData } from '../../supabase/functions/_shared/jaspic/mail';
import { generateEml } from '../../supabase/functions/_shared/jaspic/mime';
import { verifyRealMail } from '../../scripts/jaspic-verify-real-mail';

const fixture = fixtures.find(f => f.kind === 'shiga-person' && !f.previous)!;
const item = { kind: fixture.kind as Kind, data: fixture.current as unknown as RecordData, context: fixture };
const mail = generateMail(item.kind, item.data, null, item.context);
const raw = (body = mail.body, subject = mail.subject.slice(1), cte = '8bit') => Buffer.from(
  `Subject: =?utf-8?b?${Buffer.from(subject).toString('base64')}?=\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: ${cte}\r\n\r\n${body}`, 'utf8');

describe('private raw mail verification', () => {
  it('compares raw UTF-8 bytes, preserving the logical/serialized subject distinction', () => {
    expect(verifyRealMail(raw(), [item])).toMatchObject({ bodyBytesMatch: true, crlfOnly: true, subjectLogicalMatch: false, subjectSerializedValueMatch: true });
  });
  it('detects changed values, fullwidth spaces, URLs, and missing final CRLF', () => {
    for (const body of [mail.body.replace('　', ' '), mail.body.replace('google.com', 'example.invalid'), mail.body.slice(0, -2), mail.body.replace('→管理番号', '→番号')]) {
      expect(verifyRealMail(raw(body), [item]).bodyBytesMatch).toBe(false);
    }
  });
  it('does not normalize LF into a false byte match', () => {
    expect(() => verifyRealMail(raw(mail.body.replaceAll('\r\n', '\n')), [item])).toThrow();
  });
  it('rejects unsupported encodings, invalid UTF-8, missing and duplicate source IDs', () => {
    expect(() => verifyRealMail(raw(mail.body, undefined, 'base64'), [item])).toThrow();
    expect(() => verifyRealMail(Buffer.concat([raw(), Buffer.from([255])]), [item])).toThrow();
    expect(() => verifyRealMail(raw(), [])).toThrow();
    expect(() => verifyRealMail(raw(), [item, item])).toThrow();
  });
  it('keeps update projection separate from unavailable previous-value verification', () => {
    const old = { ...item.data, address: '合成更新前' };
    const updated = generateMail(item.kind, item.data, old, item.context);
    expect(verifyRealMail(raw(updated.body), [item])).toMatchObject({ update: true, bodyBytesMatch: null, currentValuesAndStructureMatch: true, observedUpdateMarkers: 1, previousValuesVerified: false });
    expect(verifyRealMail(raw(updated.body.replace('→発生場所●更新', '●更新→発生場所')), [item]).currentValuesAndStructureMatch).toBe(false);
  });
  it('checks encoded Subject bytes separately from decoded text', () => {
    const eml = Buffer.from(generateEml(item.kind, item.data, null, item.context, 'eight-bit', { date: 'Wed, 04 Nov 2026 00:00:00 +0000', messageId: 'synthetic.invalid' }));
    expect(verifyRealMail(eml, [item]).subjectHeaderBytesMatch).toBe(true);
    expect(verifyRealMail(raw(), [item])).toMatchObject({ subjectSerializedValueMatch: true, subjectHeaderBytesMatch: false });
  });
  it('detects a different subject', () => {
    expect(verifyRealMail(raw(mail.body, '別件名'), [item]).subjectSerializedValueMatch).toBe(false);
  });
});
