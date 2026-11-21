# Extended historical context check (2026-11-09)

Read-only Supabase diagnostic-history query for 20 *actually delivered* ACTIONABLE_RAIN_APPROACHING cases, 90 minutes before through 20 minutes after each target_time.

- All 20 cases have diagnostic rows; 438 rows total.
- MATCH baseline 13 cases: 286 rows, 215 NO_RAIN and 71 RAIN.
- MISMATCH baseline 7 cases: 152 rows, 97 NO_RAIN and 55 RAIN.
- A diagnostic NO_RAIN→RAIN status transition exists in 13/13 MATCH cases and 6/7 MISMATCH cases.
- **Important:** counting the *first* transition by checked_at gives for MATCH: 5 >10 min early, 4 within ±10, 4 >10 min late; for MISMATCH: 3 >10 min early, 3 within ±10, 0 late, 1 no transition.

**Critical limitation:** These are periodic diagnostic checks of a point status, not the independently archived OBSERVATION image valid_time series used by radar grading. checked_at is a processing timestamp; source_valid_at may differ. Multiple wet/dry cycles can occur, and the first transition in a 90-minute window may belong to a different rain episode. Thus the 3/7 nominally within ±10 minute MISMATCH cases are NOT evidence the original grade is wrong. Never silently substitute diagnostic status for image observation or claim accuracy improvement.

The expanded history does establish that contextual data exist for all 20 cases, and that naive time-window matching is insufficient. The next safe step is a paired, source_valid_at-aligned episode reconstruction that deduplicates overlapping checks and requires persistence. Then compare with the original radar-grade implementation and manually inspect disagreements. No production modifications, no database writes, no Vercel builds.
