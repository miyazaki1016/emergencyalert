export async function scanForecastRegionWithinBudget<T>(
  cycleSignal: AbortSignal, regionSignal: AbortSignal, scan: () => Promise<T>,
) {
  const expiredByCycle = () => cycleSignal.aborted && regionSignal.reason === cycleSignal.reason;
  try {
    const payload = await scan();
    // The detail scan may return partial progress when its signal is aborted.
    if (expiredByCycle()) return { status: "deferred" } as const;
    return { status: "scanned", payload } as const;
  } catch (error) {
    if (expiredByCycle() && error === cycleSignal.reason) return { status: "deferred" } as const;
    return { status: "failed", error } as const;
  }
}

export function forecastTileCycleFailed({
  failures, writes, hasTargets, hasWork, budgetExpired,
}: {
  failures: number; writes: number; hasTargets: boolean; hasWork: boolean; budgetExpired: boolean;
}) {
  return failures > 0 || (writes === 0 && (!hasTargets || (hasWork && !budgetExpired)));
}
