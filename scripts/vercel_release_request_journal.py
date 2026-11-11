"""Offline SQLite journal prototype for cross-process release request deduplication.

Demonstration only. No network, CI authentication, GitHub writes, Vercel
calls, deployment credentials or deployment authority. Local SQLite files
are NOT shared between separate GitHub Actions runners. Real deployment
coordination requires an independently operated, authenticated shared store.
"""
import sqlite3
from datetime import date

from vercel_release_request_policy import ALLOWED_PROJECTS, Decision, evaluate


class OfflineJournal:
    """Use SQLite BEGIN IMMEDIATE to serialize simulated admissions."""

    def __init__(self, db_path):
        self.db_path = str(db_path)
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS requests (
                request_id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
                sha TEXT NOT NULL, day TEXT NOT NULL,
                emergency INTEGER NOT NULL CHECK(emergency IN (0,1))
            )""")

    def _connect(self):
        return sqlite3.connect(self.db_path, timeout=20, isolation_level=None)

    def submit(self, request, github_snapshot, day):
        """Atomic journal admission. GitHub snapshot is UNAUTHENTICATED mock.

        In particular, an earlier snapshot becoming stale after insertion is
        possible; this journal is not a production deployment gate.
        """
        if not isinstance(day, str):
            return Decision("HOLD", "invalid simulation calendar day")
        try:
            if date.fromisoformat(day).isoformat() != day:
                return Decision("HOLD", "invalid simulation calendar day")
        except ValueError:
            return Decision("HOLD", "invalid simulation calendar day")
        if not isinstance(request, dict) or not isinstance(github_snapshot, dict):
            return Decision("HOLD", "missing mock inputs")
        if not isinstance(request.get("project_id"), str) or request["project_id"] not in ALLOWED_PROJECTS:
            return Decision("HOLD", "project not in allowlist")
        if not isinstance(request.get("request_id"), str) or not request["request_id"].strip():
            return Decision("HOLD", "invalid request identity")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                seen = {row[0] for row in db.execute("SELECT request_id FROM requests")}
                counts = db.execute(
                    "SELECT emergency, COUNT(*) FROM requests WHERE day=? GROUP BY emergency",
                    (day,),
                ).fetchall()
                per_kind = dict(counts)
                # Existing caller-supplied data is never a source of authority
                # for journal counts or request identities.
                mock = dict(github_snapshot)
                mock["seen_request_ids"] = seen
                mock["normal_requests_today"] = per_kind.get(0, 0)
                mock["emergency_requests_today"] = per_kind.get(1, 0)
                decision = evaluate(request, mock)
                if decision.status != "REVIEW_READY":
                    db.execute("ROLLBACK")
                    return decision
                db.execute(
                    "INSERT INTO requests (request_id, project_id, sha, day, emergency) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (request["request_id"], request["project_id"], request["sha"],
                     day, int(request["emergency"])),
                )
                db.execute("COMMIT")
                return Decision("RECORDED_FOR_MANUAL_REVIEW",
                                "offline journal only; no deployment authority")
            except BaseException:
                db.execute("ROLLBACK")
                raise

    def counts(self, day):
        with self._connect() as db:
            rows = db.execute(
                "SELECT emergency, COUNT(*) FROM requests WHERE day=? GROUP BY emergency",
                (day,),
            ).fetchall()
        counts = dict(rows)
        return counts.get(0, 0), counts.get(1, 0)
