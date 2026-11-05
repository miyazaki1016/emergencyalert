// Test-only reconstruction of rendering inputs; never a restoration of the old DB.
import { fields, type RecordData, type Kind } from '../supabase/functions/_shared/jaspic/mail.ts';
import type { Item } from '../supabase/functions/_shared/jaspic/collect.ts';

export function observedFields(text: string) {
  const entries = [...text.matchAll(/^"([a-z_]+)":"(.*)"(.*)\r$/gm)];
  const result = new Map<string, { value: string; annotation: string; marked: boolean }>();
  for (const m of entries) {
    if (result.has(m[1])) throw new Error('Duplicate observed field');
    result.set(m[1], { value: m[2], annotation: m[3].replace(/●更新$/, ''), marked: m[3].endsWith('●更新') });
  }
  if ([...result.values()].filter(f => f.marked).length !== (text.match(/●更新/g) ?? []).length) throw new Error('Unrecognized update marker position');
  return result;
}
export function markedPrevious(text: string, kind: Kind, current: RecordData): RecordData {
  const observed = observedFields(text);
  if (observed.size !== fields[kind].length || fields[kind].some(k => !observed.has(k))) throw new Error('Incomplete observed fields');
  const previous = { ...current };
  for (const key of fields[kind]) {
    if (observed.get(key)!.marked) previous[key] = (current[key] ?? '') + '[SYNTHETIC_PREVIOUS_VALUE]';
  }
  return previous;
}
export function observedItem(text: string): Item {
  const kind: Kind = text.includes('[JASPIC - NES] 滋賀県警アラート') ? 'shiga-person' : text.includes('広島県警が新しい犯罪情報') ? 'hiroshima-crime' : 'hiroshima-person';
  const observed = observedFields(text);
  if (observed.size !== fields[kind].length || fields[kind].some(k => !observed.has(k))) throw new Error('Incomplete observed fields');
  const data: RecordData = Object.fromEntries([...observed].map(([k,v]) => [k,v.value]));
  // Hiroshima renders the code as a label. Empty labels cannot recover the raw
  // code (or null); use a rendering-equivalent value, never call it recovered DB.
  if (kind === 'hiroshima-person') {
    const codes: Record<string,string> = { '': '', '検挙': '1', '指導・警告': '2', 'その他': '9' };
    if (!Object.hasOwn(codes, data.resolution!)) throw new Error('Unknown resolution label');
    data.resolution = codes[data.resolution!];
  }
  const annotation = (key: string) => {
    const value = observed.get(key)!.annotation;
    const start = value.indexOf('→');
    if (start < 0) throw new Error('Missing lookup annotation');
    return value.slice(start + 1);
  };
  return { kind, data, context: { cityName: annotation('city_code'), stationName: kind === 'shiga-person' ? '' : annotation('police_station') } };
}
