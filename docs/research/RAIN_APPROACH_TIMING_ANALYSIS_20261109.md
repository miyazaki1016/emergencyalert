# Approaching rain: observation sequence analysis (2026-11-09)

Read-only Supabase evaluation: 20 delivered ACTIONABLE_RAIN_APPROACHING notifications with image frames, 13 within ±10 minutes MATCH and 7 MISMATCH.

## Observed first frame (~15 minutes before target)
| Within ±10m | N | First frame already >=1 mm/h | First frame dry | First frame weak, stays below 1 mm/h |
|---|---:|---:|---:|---:|
| MATCH | 13 | 1 | 11 | 1 |
| MISMATCH | 7 | 4 | 1 | 1 |

Remaining mismatch (1/7) begins weak and crosses >=1 mm/h within the observation window. The seven mismatch cases include six with RAIN at target and one with NO_RAIN at target.

For the six with rain at target:
- Nov 9 04:20 JST: first frame 04:05 weak; >=1 mm/h by 04:10.
- Nov 4 13:50 JST: all six frames remain weak (<1 mm/h).
- Nov 2 13:20 JST: >=1 mm/h from first available 13:05 frame.
- Nov 2 12:55 JST: >=1 mm/h from first 12:40 frame, brief weak interlude.
- Oct 29 14:15 JST: two separate notifications; >=1 mm/h from first 14:00 frame.

**Interpretation:** An already-wet first frame is *left-censored*: actual onset could precede the image window. Do not label as a precise early-onset error or infer an onset timestamp. Weak-only can reflect an intensity-threshold miss, not necessarily no rain. Do not conflate rain coverage percentage, point intensity class, and transition/persistence scoring.

## Next offline comparison
1. Keep existing 20 delivered cases as immutable paired baseline; report uncertainty from small N.
2. Replay a candidate with separate event semantics: DRY→RAIN onset versus RAIN(weak)→RAIN(>=1 mm/h) strengthening.
3. Require adequate preceding observed dry/weak frames to assert an onset/strengthening time; label left-censored cases separately.
4. Compare ±5/±10 minute radar agreement, false positive/negative rates, and suppressed useful alerts against baseline; evaluate ending separately.
5. No production change until replay tests are executed and reviewed. No Vercel deployment or Supabase mutation.
