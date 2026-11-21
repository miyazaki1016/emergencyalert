/** Issue #238 only: private PostgreSQL adapter, never production JASPIC tables.
 * Requires a dedicated restricted login. No credentials in source or logs. */
import "server-only";
import { Client } from "pg";
import type { IsolatedClaim, IsolatedPort } from "./isolated-batch-238";
import type { StagedIsolatedRow } from "./isolated-send-gate-238";

function isolatedConnectionString(): string {
  const raw = process.env.JASPIC_ISOLATED_DATABASE_URL_238;
  if (!raw) throw new Error("ISOLATED_DB_NOT_CONFIGURED");
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      decodeURIComponent(url.username) !== "jaspic_isolated_login_238" ||
      url.hostname !== "db.yqyevipvkdwmhcaxywes.supabase.co" ||
      url.pathname !== "/postgres" || !url.password ||
      url.searchParams.get("sslmode") !== "require")
    throw new Error("ISOLATED_DB_TARGET_INVALID");
  return raw;
}

function isolatedRuntimeOnly(): void {
  if (process.env.VERCEL_ENV !== "production" ||
      process.env.JASPIC_ISOLATED_PRODUCTION_TEST_238 !== "enabled")
    throw new Error("ISOLATED_PRODUCTION_TEST_DISABLED");
}

async function isolatedQuery<T extends Record<string, unknown>>(
  sql: string, values: unknown[] = [],
): Promise<T[]> {
  isolatedRuntimeOnly();
  const client = new Client({
    connectionString: isolatedConnectionString(),
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    statement_timeout: 10000,
    application_name: "jaspic-isolated-238",
  });
  await client.connect();
  try {
    const result = await client.query<T>(sql, values);
    return result.rows;
  } finally {
    await client.end();
  }
}

export async function isolatedStagedRows(): Promise<StagedIsolatedRow[]> {
  const rows = await isolatedQuery<StagedIsolatedRow>(
    "select prefecture,source_id,recipient,state from jaspic_isolated_test.deliveries order by id"
  );
  if (rows.length !== 34) throw new Error("ISOLATED_ROW_COUNT_CHANGED");
  return rows;
}

export function isolatedDbPort(
  mailFor: IsolatedPort["mailFor"],
): IsolatedPort {
  return {
    mailFor,
    claim: async (limit: number): Promise<IsolatedClaim[]> => {
      if (limit !== 1) throw new Error("ISOLATED_CLAIM_LIMIT");
      return isolatedQuery<IsolatedClaim>(
        "select * from jaspic_isolated_test.claim_batch($1::integer)", [limit]
      );
    },
    finish: async (id, outcome, gmailId): Promise<boolean> => {
      const rows = await isolatedQuery<{ finished: boolean }>(
        "select jaspic_isolated_test.finish_claim($1::bigint,$2::text,$3::text) as finished",
        [id, outcome, gmailId]
      );
      return rows.length === 1 && rows[0].finished === true;
    },
  };
}
