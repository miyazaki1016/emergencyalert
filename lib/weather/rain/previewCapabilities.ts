/** Browser-only capability guard. A successful page render does not imply that
 * watch targets, notification feedback or push subscriptions can be saved.
 * These checks intentionally do NOT perform network writes.
 */
export function getRainPreviewCapabilities(config: {
  supabaseUrl?: string | null;
  supabasePublishableKey?: string | null;
  vapidPublicKey?: string | null;
}) {
  const databaseConfigured = Boolean(
    config.supabaseUrl?.trim() && config.supabasePublishableKey?.trim(),
  );
  return {
    databaseConfigured,
    canAttemptWatchRegistration: databaseConfigured,
    canAttemptFeedbackSave: databaseConfigured,
    canAttemptPushSubscription: databaseConfigured && Boolean(config.vapidPublicKey?.trim()),
  };
}
