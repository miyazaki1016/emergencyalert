/** Issue #238 only: resolve an isolated NEW_ID candidate to the original JASPIC
 * mail formatter. Never use the formatter's production to/cc/from fields. */
import { generateMail, type Kind } from "../../supabase/functions/_shared/jaspic/mail";
import type { Item } from "../../supabase/functions/_shared/jaspic/collect";

export function isolatedMailForNewId(sourceId: string, items: readonly Item[]): {subject:string;body:string} {
  if (!/^(hiroshima-person|hiroshima-crime|shiga-person):[A-Za-z0-9_-]{1,80}$/.test(sourceId))
    throw new Error("ISOLATED_SOURCE_ID_INVALID");
  const matches = items.filter(item => item.kind + ":" + item.data.id === sourceId);
  if (matches.length !== 1) throw new Error("ISOLATED_SOURCE_NOT_UNIQUE");
  const item = matches[0];
  const kind = sourceId.split(":")[0] as Kind;
  if (item.kind !== kind) throw new Error("ISOLATED_SOURCE_MISMATCH");
  // These 34 staged records were explicitly classified NEW_ID by read-only preview.
  // A different classification must never be silently rendered as a new record.
  const formatted = generateMail(item.kind, item.data, null, item.context);
  if (!formatted.subject.trim() || !formatted.body.trim()) throw new Error("ISOLATED_MAIL_EMPTY");
  return {subject:formatted.subject,body:formatted.body};
}
