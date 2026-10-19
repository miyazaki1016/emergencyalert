import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistRainNotificationFeedback } from "../lib/weather/rain/persistNotificationFeedback";

function client(userId: string | null, saveError: Error | null = null) {
  const upsert = vi.fn().mockResolvedValue({ error: saveError });
  const from = vi.fn().mockReturnValue({ upsert });
  const getSession = vi.fn().mockResolvedValue({
    data: { session: userId ? { user: { id: userId } } : null },
    error: null,
  });
  return {
    db: { auth: { getSession }, from } as unknown as Pick<SupabaseClient, "auth" | "from">,
    upsert, from,
  };
}

describe("rain notification feedback persistence", () => {
  it("creates then revises the same notification using the logged-in user", async () => {
    const { db, upsert, from } = client("test-user");
    await persistRainNotificationFeedback(db, 42, "DID_NOT_RAIN", () => "2026-10-19T10:00:00Z");
    await persistRainNotificationFeedback(db, 42, "RAINED", () => "2026-10-19T10:05:00Z");
    expect(from).toHaveBeenCalledWith("rain_notification_feedback");
    expect(upsert).toHaveBeenNthCalledWith(1, {
      notification_id: 42, owner_id: "test-user", actual_weather: "DID_NOT_RAIN",
      updated_at: "2026-10-19T10:00:00Z",
    }, { onConflict: "notification_id" });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      notification_id: 42, owner_id: "test-user", actual_weather: "RAINED",
      updated_at: "2026-10-19T10:05:00Z",
    }, { onConflict: "notification_id" });
  });

  it("never writes without an authenticated session", async () => {
    const { db, upsert } = client(null);
    await expect(persistRainNotificationFeedback(db, 42, "RAINED")).rejects.toThrow("not signed in");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not write an invalid notification id", async () => {
    const { db, upsert } = client("test-user");
    await expect(persistRainNotificationFeedback(db, -3, "RAINED")).rejects.toThrow("invalid notification id");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("propagates RLS and other database errors without treating them as saved", async () => {
    const error = new Error("RLS policy rejected");
    const { db } = client("test-user", error);
    await expect(persistRainNotificationFeedback(db, 42, "RAINED")).rejects.toThrow("RLS policy rejected");
  });
});
