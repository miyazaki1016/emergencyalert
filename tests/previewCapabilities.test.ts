import { describe, expect, it } from "vitest";
import { getRainPreviewCapabilities } from "../lib/weather/rain/previewCapabilities";

describe("rain preview capability guard", () => {
  it("keeps persistence and push unavailable when preview has no Supabase settings", () => {
    expect(getRainPreviewCapabilities({})).toEqual({
      databaseConfigured: false,
      canAttemptWatchRegistration: false,
      canAttemptFeedbackSave: false,
      canAttemptPushSubscription: false,
    });
  });
  it("does not treat a VAPID key alone as a working push backend", () => {
    expect(getRainPreviewCapabilities({ vapidPublicKey: "vapid" }).canAttemptPushSubscription).toBe(false);
  });
  it("permits DB features but not push when no VAPID public key is provided", () => {
    expect(getRainPreviewCapabilities({
      supabaseUrl: "https://staging.example", supabasePublishableKey: "test",
    })).toMatchObject({
      databaseConfigured: true,
      canAttemptWatchRegistration: true,
      canAttemptFeedbackSave: true,
      canAttemptPushSubscription: false,
    });
  });
  it("requires both database settings and a VAPID key before allowing push attempt", () => {
    expect(getRainPreviewCapabilities({
      supabaseUrl: "https://staging.example", supabasePublishableKey: "test", vapidPublicKey: "vapid",
    }).canAttemptPushSubscription).toBe(true);
    expect(getRainPreviewCapabilities({
      supabaseUrl: " ", supabasePublishableKey: "test", vapidPublicKey: "vapid",
    }).canAttemptPushSubscription).toBe(false);
  });
});
