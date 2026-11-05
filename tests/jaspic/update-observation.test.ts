import { describe, expect, it } from 'vitest';
import fixtures from './fixtures.json';
import { generateMail, type Kind, type RecordData } from '../../supabase/functions/_shared/jaspic/mail';
import { observedItem, markedPrevious, observedFields } from '../../scripts/jaspic-update-observation';

describe('observed update marker reconstruction (A only)', () => {
  for (const [index, f] of fixtures.entries()) {
    it(`preserves fixture ${index} body bytes using synthetic previous values`, () => {
      const kind = f.kind as Kind;
      const current = f.current as unknown as RecordData;
      const previous = f.previous as unknown as RecordData | null;
      const original = generateMail(kind, current, previous, f);
      const rebuilt = generateMail(kind, current, previous === null ? null : markedPrevious(original.body, kind, current), f);
      expect(Buffer.from(rebuilt.body)).toEqual(Buffer.from(original.body));
      if (previous !== null) {
        for (const [key, value] of observedFields(original.body)) {
          expect(rebuilt.body.includes('SYNTHETIC_PREVIOUS_VALUE')).toBe(false);
          expect(markedPrevious(original.body, kind, current)[key] !== current[key]).toBe(value.marked);
        }
      }
    });
  }
  it('reconstructs historical displayed values and lookup annotations without a current source', () => {
    const f = fixtures.find(f => f.kind === 'hiroshima-person' && f.previous)!;
    const original = generateMail('hiroshima-person', f.current as unknown as RecordData, f.previous as unknown as RecordData, f);
    const item = observedItem(original.body);
    const result = generateMail(item.kind, item.data, markedPrevious(original.body, item.kind, item.data), item.context);
    expect(result.body).toBe(original.body);
  });
  it('rejects missing/duplicate fields and unrecognized marker positions', () => {
    const f = fixtures[0];
    const body = generateMail(f.kind as Kind, f.current as unknown as RecordData, null, f).body;
    expect(() => observedItem(body.replace(/^"id":.*\r\n/m, ''))).toThrow();
    expect(() => observedItem(body.replace('{\r\n', '{\r\n"id":"duplicate"\r\n'))).toThrow();
    expect(() => observedItem(body.replace('→管理番号', '●更新→管理番号'))).toThrow();
  });
});
