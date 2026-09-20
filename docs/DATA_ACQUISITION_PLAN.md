# Data acquisition plan

## Decision

For production numeric rain decisions, EmergencyAlert will target the official
JMA high-resolution precipitation nowcast GRIB2 feed distributed through the
Japan Meteorological Business Support Center (JMBSC).

The public JMA PNG path remains a Phase 1 development/display adapter and
fallback diagnostic surface. It is not promoted to the numeric source of truth.

## Confirmed cost model (checked 2026-09)

JMBSC's published online-delivery charges list:

- Initial setup for file-format delivery: JPY 50,000 (one time, before tax)
- Basic charge: JPY 4,200/month
- High-resolution precipitation nowcast: JPY 7,200/month
- Internet communications equipment charge: JPY 1,500/month

That implies a published baseline of JPY 12,900/month before tax for the above
combination, plus the one-time setup charge, receiver/network costs, and any
contract-specific conditions.

JMBSC also describes a regional scheme that can reduce eligible basic and
information charges to 1/6 per region after review. Eligibility depends on the
user's business/use area, not merely requesting a geographically smaller file.

Do not assume EmergencyAlert qualifies for the regional scheme until JMBSC
approves it.

## Development strategy

Phase 1A must not be blocked by a paid production feed.

1. Finish the provider boundary and interpretation engine with deterministic
   fixtures/tests.
2. Keep live public-PNG diagnostics isolated.
3. Build the app UI and Developer View against fixtures/provider interfaces.
4. Before production notification decisions, connect an authorized numeric
   feed and validate real GRIB2 samples end-to-end.
5. Never switch production to guessed RGB classification merely to avoid feed
   cost.

## Deployment shape

A server-side ingestion worker receives each official update once, validates
and decodes it, and stores only the normalized data EmergencyAlert needs.
Browsers must not individually download/parse nationwide GRIB2 files.

Flow:

JMBSC/JMA numeric feed
  -> ingestion worker
  -> GRIB2 decoder + quality checks
  -> normalized official rain frames
  -> place lookup
  -> RainInterpretationEngine
  -> change detector
  -> app / later Push

This keeps source access centralized, auditable and replaceable.
