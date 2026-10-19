/** Only retry legacy notification history writes when the new snapshot column is absent.
 * Never retry arbitrary errors: the push has already been delivered, and duplicate history
 * rows would mislead validation.
 */
export function isMissingDecisionSnapshotColumn(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
} | null | undefined): boolean {
  if (!error || (error.code !== "42703" && error.code !== "PGRST204")) return false;
  return [error.message, error.details].some(value => value?.includes("decision_snapshot")) ?? false;
}
