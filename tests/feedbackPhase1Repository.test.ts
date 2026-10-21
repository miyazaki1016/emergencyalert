import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPhase1Feedback, savePhase1Feedback } from "../lib/weather/rain/feedbackPhase1Repository";

/** Local, in-memory Supabase-shaped client. No external requests or production writes. */
function fakeClient(ownerId: string | null = "user-A") {
  const records = new Map<number, { owner_id: string; actual_weather: string }>();
  const from = (table: string) => {
    if (table !== "rain_notification_feedback") throw Error("unexpected table");
    return {
      upsert: async (value: {
        notification_id: number;
        owner_id: string;
        actual_weather: string;
      }) => {
        if (value.owner_id !== ownerId) return { error: {message: "RLS refused"} };
        const existing = records.get(value.notification_id);
        if (existing && existing.owner_id !== value.owner_id) return {error:{message:"RLS refused"}};
        records.set(value.notification_id, {
          owner_id: value.owner_id, actual_weather: value.actual_weather,
        });
        return { error: null };
      },
      select: (_columns: string) => ({
        in: async (_column: string, ids: number[]) => ({
          data: [...records.entries()]
            .filter(([id, item]) => ids.includes(id) && item.owner_id === ownerId)
            .map(([id, item]) => ({notification_id:id, actual_weather:item.actual_weather})),
          error: null,
        }),
      }),
    };
  };
  const client = {
    auth: {getSession: async () => ({data:{session:ownerId ? {user:{id:ownerId}} : null},error:null})},
    from,
  } as unknown as Pick<SupabaseClient,"auth"|"from">;
  return { client, records };
}

describe("phase-one save, refresh and answer edits (local fake; NOT Supabase HTTP)", () => {
  it("persists feedback, reads it back after refresh, then changes it", async () => {
    const {client} = fakeClient();
    await savePhase1Feedback(client,101,"RAINED");
    expect(await loadPhase1Feedback(client,[101,102])).toEqual({101:"RAINED"});
    await savePhase1Feedback(client,101,"DID_NOT_RAIN");
    expect(await loadPhase1Feedback(client,[101])).toEqual({101:"DID_NOT_RAIN"});
  });
  it("does not expose unrelated notification IDs in a requested history", async () => {
    const {client} = fakeClient();
    await savePhase1Feedback(client,101,"RAINED");
    await savePhase1Feedback(client,202,"STOPPED");
    expect(await loadPhase1Feedback(client,[101])).toEqual({101:"RAINED"});
  });
  it("does not save if there is no authenticated session", async () => {
    const {client,records} = fakeClient(null);
    await expect(savePhase1Feedback(client,101,"RAINED")).rejects.toThrow("session_required");
    expect(records.size).toBe(0);
  });
  it("does not save unsafe notification identifiers", async () => {
    const {client} = fakeClient();
    await expect(savePhase1Feedback(client,0,"RAINED")).rejects.toThrow("invalid_notification_id");
    await expect(loadPhase1Feedback(client,[-5])).rejects.toThrow("invalid_notification_id");
  });
  it("does not query feedback when there are zero delivered IDs", async () => {
    const client = {from: () => {throw Error("unexpected query")}} as unknown as Pick<SupabaseClient,"from">;
    expect(await loadPhase1Feedback(client,[])).toEqual({});
  });
  it("enforces owning user's session for writes and simulated RLS read isolation", async () => {
    const {client,records} = fakeClient("user-A");
    await savePhase1Feedback(client,101,"RAINED");
    const other = fakeClient("user-B");
    other.records.set(101, records.get(101)!);
    expect(await loadPhase1Feedback(other.client,[101])).toEqual({});
    await expect(savePhase1Feedback(other.client,101,"STOPPED")).rejects.toThrow("RLS refused");
  });
});
