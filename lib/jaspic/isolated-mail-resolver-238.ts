/** Issue #238: resolve staged source IDs against a freshly collected source snapshot.
 * This module cannot send mail, claim rows, or modify production state.
 * Never accept request-supplied item contents. */
import "server-only";
import { collect, type Item, type Province } from "../../supabase/functions/_shared/jaspic/collect";
import { isolatedMailForNewId } from "./isolated-content-238";
import type { IsolatedClaim } from "./isolated-batch-238";

export async function createIsolatedMailResolver(
  allowedKeys: ReadonlySet<string>,
): Promise<(claim: IsolatedClaim) => Promise<{ subject: string; body: string }>> {
  if (allowedKeys.size !== 34) throw new Error("ISOLATED_ALLOWED_KEYS_INVALID");
  const provinces: Province[] = ["hiroshima", "shiga"];
  const snapshots = await Promise.all(provinces.map(async province => ({
    province, items: await collect(province),
  })));
  const items = new Map<Province, readonly Item[]>(snapshots.map(x => [x.province, x.items]));
  return async claim => {
    const key = claim.claimed_prefecture + "|" + claim.claimed_source_id;
    if (!allowedKeys.has(key) || claim.claimed_recipient !== "kishibojim@gmail.com")
      throw new Error("ISOLATED_SOURCE_NOT_APPROVED");
    const current = items.get(claim.claimed_prefecture);
    if (!current) throw new Error("ISOLATED_PROVINCE_INVALID");
    return isolatedMailForNewId(claim.claimed_source_id, current);
  };
}
